-- Create current_sales_data table
-- Created: 2025-01-09
-- Purpose: Track current sales data and real-time sales information

CREATE TABLE IF NOT EXISTS current_sales_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL CHECK (data_type IN ('daily', 'weekly', 'monthly', 'period', 'real_time')),
    reference_date DATE NOT NULL,
    
    -- Sales metrics
    total_sales_quantity INTEGER DEFAULT 0,
    target_sales_quantity INTEGER DEFAULT 0,
    sales_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Donation metrics
    total_donations_count INTEGER DEFAULT 0,
    total_white_bread_qty INTEGER DEFAULT 0,
    total_brown_bread_qty INTEGER DEFAULT 0,
    total_donation_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Performance indicators
    donation_to_sales_ratio DECIMAL(8,4) DEFAULT 0.0000,
    deficit_amount DECIMAL(10,2) DEFAULT 0.00,
    surplus_amount DECIMAL(10,2) DEFAULT 0.00,
    credit_balance DECIMAL(10,2) DEFAULT 0.00,
    
    -- Operational metrics
    active_stores_count INTEGER DEFAULT 0,
    active_collectors_count INTEGER DEFAULT 0,
    average_donation_per_store DECIMAL(8,2) DEFAULT 0.00,
    
    -- Time-based data
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status and metadata
    is_current BOOLEAN DEFAULT true,
    data_source VARCHAR(50) DEFAULT 'system',
    calculation_method VARCHAR(50) DEFAULT 'standard',
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination for current data
    UNIQUE(data_type, reference_date, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_current_sales_data_type ON current_sales_data(data_type);
CREATE INDEX IF NOT EXISTS idx_current_sales_data_date ON current_sales_data(reference_date);
CREATE INDEX IF NOT EXISTS idx_current_sales_data_current ON current_sales_data(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_current_sales_data_updated ON current_sales_data(last_updated_at);
CREATE INDEX IF NOT EXISTS idx_current_sales_data_period ON current_sales_data(period_start, period_end);

-- Enable Row Level Security
ALTER TABLE current_sales_data ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON current_sales_data TO anon;
GRANT ALL PRIVILEGES ON current_sales_data TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to current_sales_data" ON current_sales_data
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage current_sales_data" ON current_sales_data
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_current_sales_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_current_sales_data_updated_at_trigger
    BEFORE UPDATE ON current_sales_data
    FOR EACH ROW
    EXECUTE FUNCTION update_current_sales_data_updated_at();

-- Create function to update current sales data
CREATE OR REPLACE FUNCTION update_current_sales_data(
    data_type_param VARCHAR(50) DEFAULT 'daily',
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    sales_data RECORD;
    donation_data RECORD;
    period_start_calc TIMESTAMP WITH TIME ZONE;
    period_end_calc TIMESTAMP WITH TIME ZONE;
    current_credits DECIMAL(10,2) := 0.00;
BEGIN
    -- Calculate period boundaries
    IF data_type_param = 'daily' THEN
        period_start_calc := target_date::TIMESTAMP WITH TIME ZONE;
        period_end_calc := (target_date + INTERVAL '1 day - 1 second')::TIMESTAMP WITH TIME ZONE;
    ELSIF data_type_param = 'weekly' THEN
        period_start_calc := DATE_TRUNC('week', target_date::TIMESTAMP WITH TIME ZONE);
        period_end_calc := period_start_calc + INTERVAL '1 week - 1 second';
    ELSIF data_type_param = 'monthly' THEN
        period_start_calc := DATE_TRUNC('month', target_date::TIMESTAMP WITH TIME ZONE);
        period_end_calc := period_start_calc + INTERVAL '1 month - 1 second';
    ELSE -- real_time or period
        period_start_calc := target_date::TIMESTAMP WITH TIME ZONE;
        period_end_calc := NOW();
    END IF;
    
    -- Get current credit balance
    SELECT COALESCE(get_current_credit_balance(), 0.00) INTO current_credits;
    
    -- Get sales data from sales_periods table
    SELECT 
        COALESCE(total_sales_quantity, 0) as total_sales,
        COALESCE(target_quantity, 0) as target_sales,
        CASE 
            WHEN target_quantity > 0 THEN (total_sales_quantity::DECIMAL / target_quantity * 100)
            ELSE 0.00
        END as sales_pct
    INTO sales_data
    FROM sales_periods
    WHERE is_active = true
      AND start_date <= target_date
      AND end_date >= target_date
    LIMIT 1;
    
    -- If no sales data found, use defaults
    IF sales_data IS NULL THEN
        sales_data.total_sales := 0;
        sales_data.target_sales := 0;
        sales_data.sales_pct := 0.00;
    END IF;
    
    -- Get donation data for the period
    SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(white_bread_qty), 0) as total_white,
        COALESCE(SUM(brown_bread_qty), 0) as total_brown,
        COALESCE(SUM(total_donation_value), 0.00) as total_value,
        COALESCE(SUM(deficit_amount), 0.00) as total_deficit,
        COALESCE(SUM(surplus_amount), 0.00) as total_surplus,
        COUNT(DISTINCT store_id) as active_stores,
        COUNT(DISTINCT collector_id) as active_collectors
    INTO donation_data
    FROM donations_with_calculations
    WHERE collected_at >= period_start_calc
      AND collected_at <= period_end_calc;
    
    -- Calculate donation to sales ratio
    DECLARE
        donation_sales_ratio DECIMAL(8,4) := 0.0000;
        avg_donation_per_store DECIMAL(8,2) := 0.00;
    BEGIN
        IF sales_data.total_sales > 0 THEN
            donation_sales_ratio := donation_data.total_donations::DECIMAL / sales_data.total_sales;
        END IF;
        
        IF donation_data.active_stores > 0 THEN
            avg_donation_per_store := donation_data.total_value / donation_data.active_stores;
        END IF;
    END;
    
    -- Mark previous current records as not current
    UPDATE current_sales_data 
    SET is_current = false 
    WHERE data_type = data_type_param 
      AND reference_date = target_date 
      AND is_current = true;
    
    -- Insert new current data
    INSERT INTO current_sales_data (
        data_type,
        reference_date,
        total_sales_quantity,
        target_sales_quantity,
        sales_percentage,
        total_donations_count,
        total_white_bread_qty,
        total_brown_bread_qty,
        total_donation_value,
        donation_to_sales_ratio,
        deficit_amount,
        surplus_amount,
        credit_balance,
        active_stores_count,
        active_collectors_count,
        average_donation_per_store,
        period_start,
        period_end,
        is_current,
        data_source,
        calculation_method
    ) VALUES (
        data_type_param,
        target_date,
        sales_data.total_sales,
        sales_data.target_sales,
        sales_data.sales_pct,
        donation_data.total_donations,
        donation_data.total_white,
        donation_data.total_brown,
        donation_data.total_value,
        donation_sales_ratio,
        donation_data.total_deficit,
        donation_data.total_surplus,
        current_credits,
        donation_data.active_stores,
        donation_data.active_collectors,
        avg_donation_per_store,
        period_start_calc,
        period_end_calc,
        true,
        'system',
        'standard'
    );
END;
$$;

-- Create function to get current sales summary
CREATE OR REPLACE FUNCTION get_current_sales_summary(data_type_param VARCHAR(50) DEFAULT 'daily')
RETURNS TABLE (
    total_sales INTEGER,
    target_sales INTEGER,
    sales_percentage DECIMAL(5,2),
    total_donations INTEGER,
    total_donation_value DECIMAL(10,2),
    donation_ratio DECIMAL(8,4),
    deficit_amount DECIMAL(10,2),
    surplus_amount DECIMAL(10,2),
    credit_balance DECIMAL(10,2),
    active_stores INTEGER,
    active_collectors INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        csd.total_sales_quantity,
        csd.target_sales_quantity,
        csd.sales_percentage,
        csd.total_donations_count,
        csd.total_donation_value,
        csd.donation_to_sales_ratio,
        csd.deficit_amount,
        csd.surplus_amount,
        csd.credit_balance,
        csd.active_stores_count,
        csd.active_collectors_count,
        csd.last_updated_at
    FROM current_sales_data csd
    WHERE csd.data_type = data_type_param
      AND csd.is_current = true
      AND csd.reference_date = CURRENT_DATE
    ORDER BY csd.last_updated_at DESC
    LIMIT 1;
END;
$$;

-- Add comments
COMMENT ON TABLE current_sales_data IS 'Current sales data and real-time sales information with donation metrics';
COMMENT ON FUNCTION update_current_sales_data(VARCHAR, DATE) IS 'Updates current sales data for a specific type and date';
COMMENT ON FUNCTION get_current_sales_summary(VARCHAR) IS 'Returns current sales summary for dashboard display';