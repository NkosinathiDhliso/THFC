# Donation Value Calculation Feature

## Overview

This feature enhances the THFCScan application to accurately track the monetary value of white bread donations and calculate the equivalent brown bread quantity that covers the specified deficit (5.6% of white bread value).

## Key Features

### 1. **Flexible Input Methods**
- **Quantity Mode**: Users can input the number of white bread loaves (traditional method)
- **Value Mode**: Users can directly input the monetary value of the white bread donation
- Real-time conversion between quantity and value using current bread prices

### 2. **Automatic Calculations**
- **Monetary Value**: If quantity is entered, automatically calculates value (qty × R8.80)
- **Brown Bread Equivalent**: Calculates 5.6% of white bread value ÷ R7.75 per brown bread loaf
- **Live Preview**: Shows calculations in real-time as users type

### 3. **Database Schema Enhancements**
- **New Tables**: `bread_prices` for flexible price management
- **New Columns**: Added to `donations` table:
  - `white_bread_monetary_value`: Monetary value in ZAR
  - `calculated_brown_bread_qty`: Brown bread equivalent quantity
  - `deficit_percentage_applied`: Percentage used (default 5.6%)
  - `calculation_notes`: Automatic documentation of calculation method

### 4. **Automatic Database Triggers**
- Triggers automatically calculate values when donations are inserted/updated
- Supports both manual monetary input and quantity-based calculations
- Flexible pricing system allows easy updates without code changes

## Technical Implementation

### Database Schema

```sql
-- New table for flexible pricing
CREATE TABLE bread_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type VARCHAR(20) NOT NULL CHECK (bread_type IN ('white', 'brown')),
  price_per_loaf DECIMAL(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- New columns in donations table
ALTER TABLE donations 
ADD COLUMN white_bread_monetary_value DECIMAL(10,2),
ADD COLUMN calculated_brown_bread_qty DECIMAL(10,2),
ADD COLUMN deficit_percentage_applied DECIMAL(5,2) DEFAULT 5.6,
ADD COLUMN calculation_notes TEXT;
```

### Functions and Triggers

- `get_current_bread_price(bread_type)`: Returns current price for bread type
- `calculate_brown_bread_equivalent(value, percentage)`: Calculates brown bread equivalent
- `auto_calculate_donation_values()`: Trigger function for automatic calculations

### Frontend Components

1. **DonationForm.tsx**: Enhanced with dual input modes (quantity/value)
2. **ConfirmationModal.tsx**: Shows both quantity and monetary information
3. **AdminPortal.tsx**: Displays calculated values and brown bread equivalent

### Backend Processing

1. **process-donation Azure Function**: Enhanced to handle and display calculation data
2. **Email Templates**: Updated to show monetary value and brown bread equivalent
3. **Reporting**: All reports now include the accurate value calculations

## Usage Instructions

### For Users

1. **Select Input Mode**:
   - Click "Quantity (loaves)" to enter number of loaves
   - Click "Value (R)" to enter monetary amount directly

2. **Quantity Mode**:
   - Enter number of white bread loaves
   - System shows estimated value (loaves × R8.80)
   - Brown bread equivalent calculated automatically

3. **Value Mode**:
   - Enter monetary value in Rand
   - System shows approximate loaf equivalent
   - Brown bread equivalent displayed in real-time

4. **Review Calculations**:
   - Confirmation screen shows all values
   - Email notifications include calculation details
   - Admin portal displays comprehensive data

### For Administrators

1. **View Enhanced Data**:
   - Admin portal shows monetary values and brown bread equivalents
   - Statistics include accurate deficit calculations
   - Export functions include new calculated fields

2. **Price Management**:
   - Update bread prices in `bread_prices` table
   - Changes apply to future donations automatically
   - Historical data preserves original calculation context

## Calculation Formula

```
White Bread Monetary Value = Quantity × R8.80 (or manual input)
Deficit Amount = White Bread Value × 5.6%
Brown Bread Equivalent = Deficit Amount ÷ R7.75
```

### Example Calculation

- **White Bread**: 10 loaves × R8.80 = R88.00
- **Deficit Amount**: R88.00 × 5.6% = R4.93
- **Brown Bread Equivalent**: R4.93 ÷ R7.75 = 0.64 loaves

## Migration Instructions

### 1. Run Database Migration

```bash
# Apply the new schema
psql -d your_database -f supabase/migrations/20250619_add_donation_value_calculations.sql
```

### 2. Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'donations' 
AND column_name IN ('white_bread_monetary_value', 'calculated_brown_bread_qty');

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('get_current_bread_price', 'calculate_brown_bread_equivalent');
```

### 3. Test Calculations

```sql
-- Test the calculation function
SELECT calculate_brown_bread_equivalent(88.00, 5.6);
-- Should return approximately 0.64

-- Test price function
SELECT get_current_bread_price('white');
-- Should return 8.80
```

## Testing Scenarios

### 1. **Quantity Input Testing**
- Enter various quantities and verify value calculations
- Check brown bread equivalent appears correctly
- Confirm email notifications show all values

### 2. **Value Input Testing**
- Enter different monetary amounts
- Verify loaf equivalent calculations
- Test brown bread equivalent accuracy

### 3. **Admin Portal Testing**
- Verify new columns appear in donations table
- Check export functionality includes new fields
- Confirm statistics reflect accurate calculations

### 4. **Email Testing**
- Submit donations and verify email content
- Check that monetary values and equivalents appear
- Confirm calculation explanations are clear

## Troubleshooting

### Common Issues

1. **Missing Columns**: Run migration again if columns don't appear
2. **Calculation Errors**: Check that trigger functions are installed
3. **Display Issues**: Clear browser cache and refresh application
4. **Email Problems**: Verify Azure Function has updated interface

### Verification Commands

```sql
-- Check if triggers are active
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'donations';

-- Test calculation on existing data
UPDATE donations 
SET white_bread_qty = white_bread_qty 
WHERE id = 'some-donation-id';
-- Should automatically populate calculated fields
```

## Future Enhancements

1. **Dynamic Pricing**: Admin interface for updating bread prices
2. **Historical Analysis**: Reports showing value trends over time
3. **Deficit Tracking**: Enhanced analytics on deficit coverage
4. **Multi-Currency**: Support for different currencies if needed

## Support

For technical issues or questions about this feature:
1. Check database migration status
2. Verify all functions and triggers are installed
3. Test with small donation entries first
4. Review browser console for frontend errors

---

*This feature significantly enhances the accuracy of donation tracking by providing precise monetary valuations and deficit calculations, enabling better decision-making and reporting for the THF Food Forward partnership.*