-- Add function to calculate projected credit balance for next day
-- This function estimates tomorrow's credit balance based on current balance,
-- expected credit generation patterns, and potential credit applications

CREATE OR REPLACE FUNCTION get_next_day_projected_credit_balance()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    current_balance DECIMAL(10,2) := 0.00;
    avg_daily_credit_generation DECIMAL(10,2) := 0.00;
    avg_daily_credit_application DECIMAL(10,2) := 0.00;
    projected_balance DECIMAL(10,2) := 0.00;
    days_to_analyze INTEGER := 30; -- Analyze last 30 days for patterns
BEGIN
    -- Get current credit balance
    SELECT COALESCE(get_current_credit_balance(), 0.00) INTO current_balance;
    
    -- Calculate average daily credit generation over the last 30 days
    SELECT COALESCE(AVG(credit_amount), 0.00)
    INTO avg_daily_credit_generation
    FROM daily_credits
    WHERE credit_date >= CURRENT_DATE - INTERVAL '30 days'
    AND credit_amount > 0;
    
    -- Calculate average daily credit application over the last 30 days
    -- This looks at the difference between credit_amount and remaining_balance
    -- for credits that have been partially or fully applied
    SELECT COALESCE(AVG(applied_amount), 0.00)
    INTO avg_daily_credit_application
    FROM daily_credits
    WHERE credit_date >= CURRENT_DATE - INTERVAL '30 days'
    AND applied_amount > 0;
    
    -- Calculate projected balance for next day
    -- Formula: Current Balance + Expected Generation - Expected Application
    projected_balance := current_balance + avg_daily_credit_generation - avg_daily_credit_application;
    
    -- Ensure projected balance is not negative
    projected_balance := GREATEST(projected_balance, 0.00);
    
    RETURN projected_balance;
END;
$$;

-- Create function to get detailed next day credit projection with breakdown
CREATE OR REPLACE FUNCTION get_next_day_credit_projection_details()
RETURNS TABLE (
    current_balance DECIMAL(10,2),
    avg_daily_generation DECIMAL(10,2),
    avg_daily_application DECIMAL(10,2),
    projected_balance DECIMAL(10,2),
    projection_confidence TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    _current_balance DECIMAL(10,2) := 0.00;
    _avg_daily_generation DECIMAL(10,2) := 0.00;
    _avg_daily_application DECIMAL(10,2) := 0.00;
    _projected_balance DECIMAL(10,2) := 0.00;
    _confidence TEXT := 'Low';
    days_with_data INTEGER := 0;
BEGIN
    -- Get current credit balance
    SELECT COALESCE(get_current_credit_balance(), 0.00) INTO _current_balance;
    
    -- Calculate average daily credit generation and count days with data
    SELECT 
        COALESCE(AVG(credit_amount), 0.00),
        COUNT(*)
    INTO _avg_daily_generation, days_with_data
    FROM daily_credits
    WHERE credit_date >= CURRENT_DATE - INTERVAL '30 days'
    AND credit_amount > 0;
    
    -- Calculate average daily credit application
    SELECT COALESCE(AVG(applied_amount), 0.00)
    INTO _avg_daily_application
    FROM daily_credits
    WHERE credit_date >= CURRENT_DATE - INTERVAL '30 days'
    AND applied_amount > 0;
    
    -- Calculate projected balance
    _projected_balance := _current_balance + _avg_daily_generation - _avg_daily_application;
    _projected_balance := GREATEST(_projected_balance, 0.00);
    
    -- Determine confidence level based on available data
    IF days_with_data >= 20 THEN
        _confidence := 'High';
    ELSIF days_with_data >= 10 THEN
        _confidence := 'Medium';
    ELSE
        _confidence := 'Low';
    END IF;
    
    -- Return the results
    RETURN QUERY SELECT 
        _current_balance,
        _avg_daily_generation,
        _avg_daily_application,
        _projected_balance,
        _confidence;
END;
$$;

-- Grant permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_next_day_projected_credit_balance() TO anon;
GRANT EXECUTE ON FUNCTION get_next_day_projected_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_day_credit_projection_details() TO anon;
GRANT EXECUTE ON FUNCTION get_next_day_credit_projection_details() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_next_day_projected_credit_balance() IS 'Calculates projected credit balance for the next day based on historical patterns of credit generation and application over the last 30 days';
COMMENT ON FUNCTION get_next_day_credit_projection_details() IS 'Returns detailed breakdown of next day credit projection including current balance, averages, and confidence level';