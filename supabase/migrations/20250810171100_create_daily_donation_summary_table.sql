-- Create daily_donation_summary table
-- Created: 2025-01-09
-- Purpose: Store daily donation summaries with business logic calculations

CREATE TABLE IF NOT EXISTS daily_donation_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    summary_date DATE NOT NULL,
    total_white_bread_qty INTEGER DEFAULT 0,
    total_brown_bread_qty INTEGER DEFAULT 0,
    total_white_bread_value DECIMAL(10,2) DEFAULT 0.00,
    calculated_brown_bread_equivalent DECIMAL(10,2) DEFAULT 0.00,
    deficit_amount DECIMAL(10,2) DEFAULT 0.00,
    surplus_amount DECIMAL(10,2) DEFAULT 0.00,
    credit_applied DECIMAL(10,2) DEFAULT 0.00,
    credit_generated DECIMAL(10,2) DEFAULT 0.00,
    net_donation_value DECIMAL(10,2) DEFAULT 0.00,
    stores_visited INTEGER DEFAULT 0,
    collectors_active INTEGER DEFAULT 0,
    donations_count INTEGER DEFAULT 0,
    business_notes TEXT,
    calculation_method VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one summary per date
    UNIQUE(summary_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_donation_summary_date ON daily_donation_summary(summary_date);
CREATE INDEX IF NOT EXISTS idx_daily_donation_summary_value ON daily_donation_summary(net_donation_value);
CREATE INDEX IF NOT EXISTS idx_daily_donation_summary_created_at ON daily_donation_summary(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_donation_summary_deficit ON daily_donation_summary(deficit_amount) WHERE deficit_amount > 0;

-- Enable Row Level Security
ALTER TABLE daily_donation_summary ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON daily_donation_summary TO anon;
GRANT ALL PRIVILEGES ON daily_donation_summary TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to daily_donation_summary" ON daily_donation_summary
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage daily_donation_summary" ON daily_donation_summary
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_donation_summary_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_donation_summary_updated_at_trigger
    BEFORE UPDATE ON daily_donation_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_donation_summary_updated_at();

-- Create function to generate daily summary with business logic
CREATE OR REPLACE FUNCTION generate_daily_donation_summary(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    summary_data RECORD;
    white_price DECIMAL(10,2);
    brown_price DECIMAL(10,2);
    deficit_percentage DECIMAL(5,2) := 5.6;
    current_credits DECIMAL(10,2) := 0.00;
BEGIN
    -- Get current bread prices
    SELECT price_per_loaf INTO white_price FROM bread_prices WHERE bread_type = 'white' AND is_active = true LIMIT 1;
    SELECT price_per_loaf INTO brown_price FROM bread_prices WHERE bread_type = 'brown' AND is_active = true LIMIT 1;
    
    -- Get current available credits
    SELECT COALESCE(get_current_credit_balance(), 0.00) INTO current_credits;
    
    -- Calculate daily summary data
    SELECT 
        COALESCE(SUM(white_bread_qty), 0) as total_white,
        COALESCE(SUM(brown_bread_qty), 0) as total_brown,
        COALESCE(SUM(white_bread_monetary_value), 0.00) as total_white_value,
        COALESCE(SUM(calculated_brown_bread_qty), 0.00) as calc_brown_equiv,
        COUNT(DISTINCT store_id) as stores_count,
        COUNT(DISTINCT collector_id) as collectors_count,
        COUNT(*) as donations_total
    INTO summary_data
    FROM donations
    WHERE DATE(collected_at) = target_date;
    
    -- Calculate deficit/surplus
    DECLARE
        required_brown_value DECIMAL(10,2);
        actual_brown_value DECIMAL(10,2);
        deficit DECIMAL(10,2) := 0.00;
        surplus DECIMAL(10,2) := 0.00;
        credits_to_apply DECIMAL(10,2) := 0.00;
        credits_generated DECIMAL(10,2) := 0.00;
        net_value DECIMAL(10,2);
    BEGIN
        -- Calculate required brown bread value (5.6% of white bread value)
        required_brown_value := summary_data.total_white_value * (deficit_percentage / 100);
        
        -- Calculate actual brown bread value
        actual_brown_value := summary_data.total_brown * brown_price;
        
        -- Determine deficit or surplus
        IF actual_brown_value < required_brown_value THEN
            deficit := required_brown_value - actual_brown_value;
            -- Apply credits if available
            credits_to_apply := LEAST(deficit, current_credits);
            deficit := deficit - credits_to_apply;
        ELSE
            surplus := actual_brown_value - required_brown_value;
            credits_generated := surplus;
        END IF;
        
        -- Calculate net donation value
        net_value := summary_data.total_white_value + actual_brown_value - credits_to_apply;
        
        -- Insert or update summary
        INSERT INTO daily_donation_summary (
            summary_date,
            total_white_bread_qty,
            total_brown_bread_qty,
            total_white_bread_value,
            calculated_brown_bread_equivalent,
            deficit_amount,
            surplus_amount,
            credit_applied,
            credit_generated,
            net_donation_value,
            stores_visited,
            collectors_active,
            donations_count,
            calculation_method
        ) VALUES (
            target_date,
            summary_data.total_white,
            summary_data.total_brown,
            summary_data.total_white_value,
            summary_data.calc_brown_equiv,
            deficit,
            surplus,
            credits_to_apply,
            credits_generated,
            net_value,
            summary_data.stores_count,
            summary_data.collectors_count,
            summary_data.donations_total,
            'standard'
        )
        ON CONFLICT (summary_date) DO UPDATE SET
            total_white_bread_qty = EXCLUDED.total_white_bread_qty,
            total_brown_bread_qty = EXCLUDED.total_brown_bread_qty,
            total_white_bread_value = EXCLUDED.total_white_bread_value,
            calculated_brown_bread_equivalent = EXCLUDED.calculated_brown_bread_equivalent,
            deficit_amount = EXCLUDED.deficit_amount,
            surplus_amount = EXCLUDED.surplus_amount,
            credit_applied = EXCLUDED.credit_applied,
            credit_generated = EXCLUDED.credit_generated,
            net_donation_value = EXCLUDED.net_donation_value,
            stores_visited = EXCLUDED.stores_visited,
            collectors_active = EXCLUDED.collectors_active,
            donations_count = EXCLUDED.donations_count,
            updated_at = NOW();
    END;
END;
$$;

-- Add comments
COMMENT ON TABLE daily_donation_summary IS 'Daily donation summaries with business logic calculations including deficit/surplus and credit management';
COMMENT ON FUNCTION generate_daily_donation_summary(DATE) IS 'Generates comprehensive daily donation summary with business logic calculations';