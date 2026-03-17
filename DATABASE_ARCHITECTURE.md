# THFCScan Database Architecture

## 🗄️ **Database Schema Overview**

THFCScan uses a **PostgreSQL database** via Supabase with **Row Level Security (RLS)** enabled. This document explains the cleaned-up, properly connected database structure.

---

## 📊 **Core Tables & Relationships**

### **1. `profiles` (User Management)**
**Purpose:** Stores user information and authentication data
```sql
profiles (
  id UUID PRIMARY KEY → auth.users(id),
  full_name TEXT,
  employee_id TEXT,
  email TEXT,
  role VARCHAR(50) → 'user' | 'admin' | 'volunteer',
  short_code VARCHAR(6) UNIQUE,
  short_code_created_at TIMESTAMPTZ,
  short_code_last_used TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```
**Relationships:**
- ✅ **Connected to:** `donations.collector_id` → `profiles.id`
- ✅ **Connected to:** Supabase Auth via `auth.users(id)`

---

### **2. `stores` (Store Locations)**
**Purpose:** Manages Spar store locations for donations
```sql
stores (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ
)
```
**Relationships:**
- ✅ **Connected to:** `donations.store_id` → `stores.id`

---

### **3. `donations` (Core Data)**
**Purpose:** Records bread donation transactions
```sql
donations (
  id UUID PRIMARY KEY,
  store_id UUID → stores(id),
  store_name_manual TEXT,
  white_bread_qty INTEGER DEFAULT 0,
  brown_bread_qty INTEGER DEFAULT 0,
  white_bread_monetary_value DECIMAL(10,2),
  calculated_brown_bread_qty DECIMAL(10,2),
  deficit_percentage_applied DECIMAL(5,2) DEFAULT 5.6,
  calculation_notes TEXT,
  photo_url TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ,
  collector_id UUID → profiles(id),
  
  -- NEW: Price tracking relationships
  white_bread_price_id UUID → bread_prices(id),
  brown_bread_price_id UUID → bread_prices(id)
)
```
**Relationships:**
- ✅ **Connected to:** `stores` via `store_id`
- ✅ **Connected to:** `profiles` via `collector_id`
- ✅ **Connected to:** `bread_prices` via `white_bread_price_id` & `brown_bread_price_id`

---

### **4. `bread_prices` (Pricing Management)**
**Purpose:** Manages historical and current bread pricing
```sql
bread_prices (
  id UUID PRIMARY KEY,
  bread_type VARCHAR(20) → 'white' | 'brown',
  price_per_loaf DECIMAL(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)
```
**Relationships:**
- ✅ **Connected to:** `donations` via foreign key references
- ✅ **Used by:** Database functions for price calculations

---

### **5. `zoho_sales_data` (Business Intelligence)**
**Purpose:** Stores Zoho CRM sales data for 5.6% deficit calculations
```sql
zoho_sales_data (
  id UUID PRIMARY KEY,
  total_sales_order_quantity INTEGER NOT NULL,
  last_updated_at TIMESTAMPTZ NOT NULL
)
```
**Usage:**
- ✅ **Used by:** AdminPortal for deficit calculations
- ✅ **Connected to:** Business logic (5.6% of sales = required donations)

---

## 🔍 **Database Views (Optimized Queries)**

### **1. `current_bread_prices`**
Shows active bread prices for application use:
```sql
SELECT bread_type, price_per_loaf, effective_from, effective_until
FROM bread_prices 
WHERE is_active = true AND effective_from <= NOW() 
  AND (effective_until IS NULL OR effective_until > NOW())
```

### **2. `donations_with_details`**
Comprehensive donation data with all relationships:
```sql
SELECT 
  d.*,
  s.name as store_name, s.address as store_address,
  p.full_name as collector_name, p.email as collector_email,
  wp.price_per_loaf as white_bread_price_used,
  bp.price_per_loaf as brown_bread_price_used,
  -- Calculated totals
  COALESCE(d.white_bread_monetary_value, d.white_bread_qty * get_current_bread_price('white')) as total_white_bread_value
FROM donations d
LEFT JOIN stores s ON d.store_id = s.id
LEFT JOIN profiles p ON d.collector_id = p.id
LEFT JOIN bread_prices wp ON d.white_bread_price_id = wp.id
LEFT JOIN bread_prices bp ON d.brown_bread_price_id = bp.id
```

### **3. `stores_summary`**
Store performance statistics:
```sql
SELECT 
  s.id, s.name, s.address,
  COUNT(d.id) as total_donations,
  SUM(d.white_bread_qty) as total_white_bread,
  SUM(d.brown_bread_qty) as total_brown_bread,
  SUM(calculated_total_value) as total_value,
  MAX(d.collected_at) as last_donation_date
FROM stores s
LEFT JOIN donations d ON s.id = d.store_id
GROUP BY s.id, s.name, s.address
```

---

## 🔧 **Database Functions**

### **1. `get_current_bread_price(bread_type)`**
```sql
Returns current active price for 'white' or 'brown' bread
Fallback: white=R8.80, brown=R7.75
```

### **2. `calculate_brown_bread_equivalent(value, percentage)`**
```sql
Calculates brown bread equivalent based on 5.6% deficit calculation
Returns: (white_bread_value * percentage / 100) / brown_bread_price
```

### **3. `generate_short_code()`**
```sql
Generates unique 6-character alphanumeric codes for user authentication
Used by profiles table for quick login
```

---

## 🚫 **Removed/Cleaned Up**

### **❌ `user_profiles` (REMOVED)**
**Reason:** Duplicate functionality with `profiles` table
**Solution:** Consolidated into enhanced `profiles` table

### **❌ Orphaned Functions**
- Old `generate_short_code()` for user_profiles
- Old `refresh_user_short_code()` for user_profiles
**Solution:** Recreated for `profiles` table

---

## 🔐 **Security & Permissions**

### **Row Level Security (RLS)**
- ✅ **All tables** have RLS enabled
- ✅ **Users** can only access their own data
- ✅ **Admins** have broader access for management

### **Policies Applied:**
- `donations`: Users see all, can only edit their own
- `profiles`: Users see their own, admins see all
- `stores`: Read-only for all authenticated users
- `bread_prices`: Read-only for all, admins can manage

---

## 📈 **Performance Optimizations**

### **Indexes Created:**
```sql
-- Profile lookups
idx_profiles_short_code ON profiles(short_code)
idx_profiles_role ON profiles(role)
idx_profiles_email ON profiles(email)

-- Donation queries
idx_donations_white_bread_price ON donations(white_bread_price_id)
idx_donations_brown_bread_price ON donations(brown_bread_price_id)
idx_donations_monetary_value ON donations(white_bread_monetary_value)

-- Bread price lookups
idx_bread_prices_active ON bread_prices(bread_type, is_active)
```

---

## 🔄 **Migration Strategy**

### **Applied Migration:** `20250620_database_cleanup_and_relationships.sql`

**What it does:**
1. ✅ Removes unused `user_profiles` table
2. ✅ Enhances `profiles` with short_code functionality
3. ✅ Creates proper foreign key relationships
4. ✅ Adds optimized database views
5. ✅ Creates performance indexes
6. ✅ Maintains all existing data

**Production Safety:**
- Uses `IF EXISTS` and `IF NOT EXISTS` for safety
- Preserves all existing data
- Adds columns with defaults
- Backwards compatible

---

## 🎯 **Application Usage**

### **Frontend Queries:**
```typescript
// Use the optimized views
const donations = await supabase
  .from('donations_with_details')
  .select('*')

const storeSummary = await supabase
  .from('stores_summary')
  .select('*')

const currentPrices = await supabase
  .from('current_bread_prices')
  .select('*')
```

### **Relationship Queries:**
```typescript
// Get donation with all related data
const donation = await supabase
  .from('donations')
  .select(`
    *,
    store:stores(*),
    collector:profiles(*),
    white_bread_price:bread_prices!white_bread_price_id(*),
    brown_bread_price:bread_prices!brown_bread_price_id(*)
  `)
```

This architecture now provides **proper relationships**, **performance optimization**, and **eliminates unused tables** while maintaining full backwards compatibility!