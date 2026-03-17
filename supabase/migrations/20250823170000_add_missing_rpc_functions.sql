-- Add missing RPC functions for admin portal

-- Function to get current credit balance
CREATE OR REPLACE FUNCTION get_current_credit_balance()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    balance DECIMAL(10,2) := 0;
BEGIN
    -- Calculate current credit balance from daily_credits table
    SELECT COALESCE(SUM(credit_amount), 0) INTO balance
    FROM daily_credits 
    WHERE date <= CURRENT_DATE;
    
    RETURN balance;
END;
$$;

-- Function to get next day credit projection details
CREATE OR REPLACE FUNCTION get_next_day_credit_projection_details()
RETURNS TABLE(
    projected_date DATE,
    projected_credit DECIMAL(10,2),
    base_calculation TEXT,
    factors TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    tomorrow_date DATE := CURRENT_DATE + INTERVAL '1 day';
    avg_daily_credit DECIMAL(10,2) := 0;
    recent_trend DECIMAL(10,2) := 0;
BEGIN
    -- Calculate average daily credit from last 7 days
    SELECT COALESCE(AVG(credit_amount), 0) INTO avg_daily_credit
    FROM daily_credits 
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    AND date <= CURRENT_DATE;
    
    -- Calculate recent trend (last 3 days vs previous 4 days)
    WITH recent_avg AS (
        SELECT COALESCE(AVG(credit_amount), 0) as recent
        FROM daily_credits 
        WHERE date >= CURRENT_DATE - INTERVAL '3 days'
        AND date <= CURRENT_DATE
    ),
    previous_avg AS (
        SELECT COALESCE(AVG(credit_amount), 0) as previous
        FROM daily_credits 
        WHERE date >= CURRENT_DATE - INTERVAL '7 days'
        AND date < CURRENT_DATE - INTERVAL '3 days'
    )
    SELECT (recent.recent - previous.previous) INTO recent_trend
    FROM recent_avg recent, previous_avg previous;
    
    -- Return projection details
    RETURN QUERY
    SELECT 
        tomorrow_date as projected_date,
        (avg_daily_credit + (recent_trend * 0.3))::DECIMAL(10,2) as projected_credit,
        ('Based on 7-day average: ' || avg_daily_credit::TEXT) as base_calculation,
        ('Recent trend adjustment: ' || recent_trend::TEXT) as factors;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_day_credit_projection_details() TO authenticated;

-- Test the functions
SELECT 'RPC Functions Created' as status;
SELECT get_current_credit_balance() as current_balance;
SELECT * FROM get_next_day_credit_projection_details();
