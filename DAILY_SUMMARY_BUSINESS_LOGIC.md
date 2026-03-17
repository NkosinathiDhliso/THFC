# THFCScan Daily Summary Business Logic

## Overview
The THFCScan daily summary calculates whether The Health Food Company (THF) has met its donation obligation based on Spar Purchase Orders (POs). This document explains the correct business logic and calculation methodology.

## Business Model
THF has an agreement with Spar where THF must donate **5.6% of the value of Purchase Orders** received from Spar. Both Spar and THF can contribute to meeting this obligation.

## Calculation Flow

### Step 1: Purchase Order (PO) Amount
- **Source**: Admin portal (`sales_periods` table)
- **Input**: Monthly PO amount from Spar
- **Example**: R10,000

### Step 2: Required Donation Calculation
```
Required Donation = PO Amount × 5.6%
Example: R10,000 × 5.6% = R560
```

### Step 3: Total Donations Collected
All donations are tracked through the donation form, including:
- **Spar's own donations** (bread they donate directly)
- **THF collections** (bread THF collects from stores)

**Value Calculation:**
```
White Bread Value = Quantity × R8.80 per loaf
Brown Bread Value = Quantity × R7.75 per loaf
Total Collected Value = White Bread Value + Brown Bread Value
```

### Step 4: Deficit/Surplus Calculation
```
Deficit Amount = MAX(0, Required Donation - Total Collected Value)
Surplus Amount = MAX(0, Total Collected Value - Required Donation)

Coverage Percentage = (Total Collected Value ÷ Required Donation) × 100%
```

### Step 5: Brown Bread Equivalent (for deficits only)
```
Brown Bread Loaves Needed = CEIL(Deficit Amount ÷ R7.75)
(Rounded up to whole loaves)
```

## Complete Example

### Scenario:
- **Purchase Order**: R10,000
- **Spar donates**: 20 white bread loaves = R176.00
- **THF collects**: 546 white bread loaves = R4,804.80
- **THF collects**: 0 brown bread loaves = R0.00

### Calculations:
1. **Required Donation**: R10,000 × 5.6% = **R560.00**
2. **Total Collected**: R176.00 + R4,804.80 + R0.00 = **R4,980.80**
3. **Result**: SURPLUS of R4,420.80 (890% coverage!)

### Alternative Deficit Scenario:
- **Purchase Order**: R10,000
- **Required**: R560.00
- **Spar donates**: R165.50
- **THF collects**: R259.00
- **Total Collected**: R424.50
- **Deficit**: R560.00 - R424.50 = **R135.50**
- **Brown Bread Needed**: CEIL(R135.50 ÷ R7.75) = **18 loaves**

## Database Tables Involved

### `sales_periods`
- Stores monthly Purchase Order amounts
- Set via Admin Portal
- Fields: `total_sales_amount`, `period_name`, `start_date`, `end_date`

### `donations`
- All donation records (Spar + THF)
- Fields: `white_bread_qty`, `brown_bread_qty`, `white_bread_monetary_value`
- Values calculated automatically or manually entered

## Daily Summary Email Structure

### Financial Impact Section:
```
Purchase Order:      R10,000.00
Required Donation:   R560.00 (5.6%)
Total Collected:     R4,980.80
Status:              SURPLUS R4,420.80
Coverage:            890.0%
Brown Bread Needed:  0 loaves
```

### Calculation Formula Display:
```
PO: R10,000.00 × 5.6% = R560.00 required | 
Collected: R4,980.80 | 
Surplus: R4,420.80
```

## Key Differences from Previous Logic


### ✅ New (Correct) Logic:
```
Required = PO Amount × 5.6%
Deficit = Required - Total Collected
(This calculates whether donations meet the PO requirement)
```

## System Integration Points

### Admin Portal
- Enter monthly PO amounts
- View current deficit/surplus status
- Manage sales periods

### Donation Form
- All donations (Spar + THF) use same form
- Automatic value calculation
- Both white and brown bread tracked

### Daily Summary Function
- Pulls current month's PO from `sales_periods`
- Sums all daily donations
- Calculates deficit against requirement
- Sends detailed email at 6:00 PM SAST

## Business Rules

1. **5.6% Obligation**: Fixed percentage of PO value
2. **Combined Contributions**: Spar and THF donations count toward obligation
3. **Daily Tracking**: Daily summaries show progress toward monthly target
4. **Deficit Prioritization**: Brown bread used for deficit calculations (cheaper option)
5. **Coverage Display**: Shows percentage of obligation met

## Example Monthly Cycle

```
Month: January 2025
PO Amount: R50,000 (entered via Admin Portal)
Required Donation: R50,000 × 5.6% = R2,800

Daily Progress:
Day 1: Collected R150 (5.4% of target)
Day 2: Collected R200 (Total: R350, 12.5% of target)
...
Day 15: Collected R1,800 (Total: R2,800, 100% TARGET MET!)
Day 16+: All additional collections = SURPLUS
```

This ensures THF always knows their exact obligation status and can plan collections accordingly.