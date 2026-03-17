-- Create daily_donation_log table
-- Created: 2025-01-09
-- Purpose: Track daily donation activities and aggregated data

CREATE TABLE IF NOT EXISTS daily_donation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    log_date DATE NOT NULL,
    total_white_bread INTEGER DEFAULT 0,
    total_brown_bread INTEGER DEFAULT 0,
    total_donations_count INTEGER DEFAULT 0,
    total_monetary_value DECIMAL(10,2) DEFAULT 0.00,
    unique_stores_count INTEGER DEFAULT 0,
    unique_collectors_count INTEGER DEFAULT 0,
    average_donation_value DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per date
    UNIQUE(log_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_donation_log_date ON daily_donation_log(log_date);
CREATE INDEX IF NOT EXISTS idx_daily_donation_log_created_at ON daily_donation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_donation_log_monetary_value ON daily_donation_log(total_monetary_value);

-- Enable Row Level Security
ALTER TABLE daily_donation_log ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON daily_donation_log TO anon;
GRANT ALL PRIVILEGES ON daily_donation_log TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to daily_donation_log" ON daily_donation_log
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage daily_donation_log" ON daily_donation_log
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_donation_log_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_daily_donation_log_updated_at_trigger
    BEFORE UPDATE ON daily_donation_log
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_donation_log_updated_at();

-- Create function to aggregate daily donation data
CREATE OR REPLACE FUNCTION aggregate_daily_donations(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    daily_stats RECORD;
BEGIN
    -- Calculate daily statistics
    SELECT 
        COALESCE(SUM(white_bread_qty), 0) as total_white,
        COALESCE(SUM(brown_bread_qty), 0) as total_brown,
        COUNT(*) as total_count,
        COALESCE(SUM(white_bread_monetary_value), 0.00) as total_value,
        COUNT(DISTINCT store_id) as unique_stores,
        COUNT(DISTINCT collector_id) as unique_collectors,
        CASE 
            WHEN COUNT(*) > 0 THEN COALESCE(SUM(white_bread_monetary_value), 0.00) / COUNT(*)
            ELSE 0.00
        END as avg_value
    INTO daily_stats
    FROM donations
    WHERE DATE(collected_at) = target_date;
    
    -- Insert or update daily log
    INSERT INTO daily_donation_log (
        log_date,
        total_white_bread,
        total_brown_bread,
        total_donations_count,
        total_monetary_value,
        unique_stores_count,
        unique_collectors_count,
        average_donation_value
    ) VALUES (
        target_date,
        daily_stats.total_white,
        daily_stats.total_brown,
        daily_stats.total_count,
        daily_stats.total_value,
        daily_stats.unique_stores,
        daily_stats.unique_collectors,
        daily_stats.avg_value
    )
    ON CONFLICT (log_date) DO UPDATE SET
        total_white_bread = EXCLUDED.total_white_bread,
        total_brown_bread = EXCLUDED.total_brown_bread,
        total_donations_count = EXCLUDED.total_donations_count,
        total_monetary_value = EXCLUDED.total_monetary_value,
        unique_stores_count = EXCLUDED.unique_stores_count,
        unique_collectors_count = EXCLUDED.unique_collectors_count,
        average_donation_value = EXCLUDED.average_donation_value,
        updated_at = NOW();
END;
$$;

-- Add comments
COMMENT ON TABLE daily_donation_log IS 'Daily aggregated donation statistics and logs';
COMMENT ON FUNCTION aggregate_daily_donations(DATE) IS 'Aggregates donation data for a specific date into daily_donation_log';