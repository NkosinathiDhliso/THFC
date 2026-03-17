-- Create donations_with_calculations view
-- Created: 2025-01-09
-- Purpose: Provide enhanced donation data with all calculations and related information

-- Create view that combines donations with calculated fields and related data
CREATE OR REPLACE VIEW donations_with_calculations AS
SELECT 
    d.id,
    d.store_id,
    d.store_name_manual,
    s.name as store_name,
    s.address as store_address,
    d.white_bread_qty,
    d.brown_bread_qty,
    d.white_bread_monetary_value,
    d.calculated_brown_bread_qty,
    d.deficit_percentage_applied,
    d.calculation_notes,
    d.photo_url,
    d.collected_at,
    d.collector_id,
    d.created_at,
    
    -- Profile information
    p.full_name as collector_name,
    p.employee_id as collector_employee_id,
    p.email as collector_email,
    
    -- Current bread prices
    wp.price_per_loaf as current_white_price,
    bp.price_per_loaf as current_brown_price,
    
    -- Calculated fields
    CASE 
        WHEN d.white_bread_monetary_value IS NOT NULL THEN d.white_bread_monetary_value
        ELSE d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)
    END as calculated_white_value,
    
    CASE 
        WHEN d.calculated_brown_bread_qty IS NOT NULL THEN d.calculated_brown_bread_qty
        ELSE (d.white_bread_qty * COALESCE(wp.price_per_loaf, 0) * COALESCE(d.deficit_percentage_applied, 5.6) / 100) / COALESCE(bp.price_per_loaf, 1)
    END as calculated_brown_equivalent,
    
    -- Brown bread value
    d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0) as brown_bread_value,
    
    -- Total donation value
    COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) + 
    (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0)) as total_donation_value,
    
    -- Required brown bread value (deficit calculation)
    (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
     COALESCE(d.deficit_percentage_applied, 5.6) / 100) as required_brown_value,
    
    -- Deficit or surplus
    CASE 
        WHEN (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0)) < 
             (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
              COALESCE(d.deficit_percentage_applied, 5.6) / 100)
        THEN (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
              COALESCE(d.deficit_percentage_applied, 5.6) / 100) - 
             (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0))
        ELSE 0
    END as deficit_amount,
    
    CASE 
        WHEN (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0)) > 
             (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
              COALESCE(d.deficit_percentage_applied, 5.6) / 100)
        THEN (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0)) - 
             (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
              COALESCE(d.deficit_percentage_applied, 5.6) / 100)
        ELSE 0
    END as surplus_amount,
    
    -- Date fields for grouping
    DATE(d.collected_at) as collection_date,
    EXTRACT(YEAR FROM d.collected_at) as collection_year,
    EXTRACT(MONTH FROM d.collected_at) as collection_month,
    EXTRACT(WEEK FROM d.collected_at) as collection_week,
    
    -- Status indicators
    CASE 
        WHEN d.white_bread_qty = 0 AND d.brown_bread_qty = 0 THEN 'empty'
        WHEN d.white_bread_qty > 0 AND d.brown_bread_qty = 0 THEN 'white_only'
        WHEN d.white_bread_qty = 0 AND d.brown_bread_qty > 0 THEN 'brown_only'
        ELSE 'mixed'
    END as donation_type,
    
    CASE 
        WHEN (d.brown_bread_qty * COALESCE(bp.price_per_loaf, 0)) >= 
             (COALESCE(d.white_bread_monetary_value, d.white_bread_qty * COALESCE(wp.price_per_loaf, 0)) * 
              COALESCE(d.deficit_percentage_applied, 5.6) / 100)
        THEN 'sufficient'
        ELSE 'deficit'
    END as brown_bread_status
    
FROM donations d
LEFT JOIN stores s ON d.store_id = s.id
LEFT JOIN profiles p ON d.collector_id = p.id
LEFT JOIN (
    SELECT price_per_loaf 
    FROM bread_prices 
    WHERE bread_type = 'white' AND is_active = true 
    ORDER BY effective_from DESC 
    LIMIT 1
) wp ON true
LEFT JOIN (
    SELECT price_per_loaf 
    FROM bread_prices 
    WHERE bread_type = 'brown' AND is_active = true 
    ORDER BY effective_from DESC 
    LIMIT 1
) bp ON true;

-- Grant permissions on the view
GRANT SELECT ON donations_with_calculations TO anon;
GRANT SELECT ON donations_with_calculations TO authenticated;

-- Create function to refresh materialized view if needed in future
CREATE OR REPLACE FUNCTION refresh_donations_calculations()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function can be used to refresh calculations if we convert to materialized view
    -- Currently just a placeholder since we're using a regular view
    RAISE NOTICE 'Donations calculations view refreshed';
END;
$$;

-- Add comments
COMMENT ON VIEW donations_with_calculations IS 'Enhanced view of donations with all calculated fields, store info, collector info, and business logic calculations';
COMMENT ON FUNCTION refresh_donations_calculations() IS 'Placeholder function for refreshing donation calculations (currently using regular view)';