-- Create stores_summary table
-- Created: 2025-01-09
-- Purpose: Store aggregated statistics and summary data for each store

CREATE TABLE IF NOT EXISTS stores_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id TEXT REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
    summary_period VARCHAR(20) NOT NULL CHECK (summary_period IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
    period_start DATE,
    period_end DATE,
    
    -- Donation statistics
    total_donations INTEGER DEFAULT 0,
    total_white_bread INTEGER DEFAULT 0,
    total_brown_bread INTEGER DEFAULT 0,
    total_white_bread_value DECIMAL(10,2) DEFAULT 0.00,
    total_brown_bread_value DECIMAL(10,2) DEFAULT 0.00,
    total_donation_value DECIMAL(10,2) DEFAULT 0.00,
    
    -- Calculated statistics
    average_donation_value DECIMAL(10,2) DEFAULT 0.00,
    average_white_bread_per_donation DECIMAL(8,2) DEFAULT 0.00,
    average_brown_bread_per_donation DECIMAL(8,2) DEFAULT 0.00,
    
    -- Performance metrics
    deficit_occurrences INTEGER DEFAULT 0,
    surplus_occurrences INTEGER DEFAULT 0,
    total_deficit_amount DECIMAL(10,2) DEFAULT 0.00,
    total_surplus_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Activity metrics
    unique_collectors INTEGER DEFAULT 0,
    first_donation_date DATE,
    last_donation_date DATE,
    most_active_collector_id UUID REFERENCES auth.users(id),
    
    -- Rankings and comparisons
    rank_by_total_value INTEGER,
    rank_by_donation_count INTEGER,
    rank_by_consistency INTEGER,
    
    -- Metadata
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of store and period
    UNIQUE(store_id, summary_period, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stores_summary_store_id ON stores_summary(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_summary_period ON stores_summary(summary_period);
CREATE INDEX IF NOT EXISTS idx_stores_summary_dates ON stores_summary(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_stores_summary_total_value ON stores_summary(total_donation_value);
CREATE INDEX IF NOT EXISTS idx_stores_summary_rank_value ON stores_summary(rank_by_total_value);
CREATE INDEX IF NOT EXISTS idx_stores_summary_rank_count ON stores_summary(rank_by_donation_count);
CREATE INDEX IF NOT EXISTS idx_stores_summary_last_calculated ON stores_summary(last_calculated_at);

-- Enable Row Level Security
ALTER TABLE stores_summary ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON stores_summary TO anon;
GRANT ALL PRIVILEGES ON stores_summary TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to stores_summary" ON stores_summary
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage stores_summary" ON stores_summary
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stores_summary_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_stores_summary_updated_at_trigger
    BEFORE UPDATE ON stores_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_stores_summary_updated_at();

-- Create function to calculate store summary for a specific period
CREATE OR REPLACE FUNCTION calculate_store_summary(
    target_store_id TEXT,
    period_type VARCHAR(20) DEFAULT 'all_time',
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    summary_data RECORD;
    white_price DECIMAL(10,2);
    brown_price DECIMAL(10,2);
    calculated_start_date DATE;
    calculated_end_date DATE;
BEGIN
    -- Get current bread prices
    SELECT price_per_loaf INTO white_price FROM bread_prices WHERE bread_type = 'white' AND is_active = true LIMIT 1;
    SELECT price_per_loaf INTO brown_price FROM bread_prices WHERE bread_type = 'brown' AND is_active = true LIMIT 1;
    
    -- Calculate date range based on period type
    IF period_type = 'daily' THEN
        calculated_start_date := COALESCE(start_date, CURRENT_DATE);
        calculated_end_date := calculated_start_date;
    ELSIF period_type = 'weekly' THEN
        calculated_start_date := COALESCE(start_date, DATE_TRUNC('week', CURRENT_DATE)::DATE);
        calculated_end_date := COALESCE(end_date, calculated_start_date + INTERVAL '6 days');
    ELSIF period_type = 'monthly' THEN
        calculated_start_date := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
        calculated_end_date := COALESCE(end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);
    ELSIF period_type = 'yearly' THEN
        calculated_start_date := COALESCE(start_date, DATE_TRUNC('year', CURRENT_DATE)::DATE);
        calculated_end_date := COALESCE(end_date, (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE);
    ELSE -- all_time
        calculated_start_date := NULL;
        calculated_end_date := NULL;
    END IF;
    
    -- Calculate summary statistics
    SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(white_bread_qty), 0) as total_white,
        COALESCE(SUM(brown_bread_qty), 0) as total_brown,
        COALESCE(SUM(white_bread_monetary_value), SUM(white_bread_qty) * white_price) as total_white_value,
        COALESCE(SUM(brown_bread_qty) * brown_price, 0) as total_brown_value,
        COALESCE(AVG(white_bread_monetary_value), AVG(white_bread_qty) * white_price) as avg_donation_value,
        COALESCE(AVG(white_bread_qty), 0) as avg_white_per_donation,
        COALESCE(AVG(brown_bread_qty), 0) as avg_brown_per_donation,
        COUNT(DISTINCT collector_id) as unique_collectors,
        MIN(DATE(collected_at)) as first_donation,
        MAX(DATE(collected_at)) as last_donation,
        MODE() WITHIN GROUP (ORDER BY collector_id) as most_active_collector
    INTO summary_data
    FROM donations
    WHERE (target_store_id IS NULL OR store_id = target_store_id)
      AND (calculated_start_date IS NULL OR DATE(collected_at) >= calculated_start_date)
      AND (calculated_end_date IS NULL OR DATE(collected_at) <= calculated_end_date);
    
    -- Calculate deficit and surplus occurrences
    DECLARE
        deficit_count INTEGER := 0;
        surplus_count INTEGER := 0;
        total_deficit DECIMAL(10,2) := 0.00;
        total_surplus DECIMAL(10,2) := 0.00;
    BEGIN
        SELECT 
            COUNT(CASE WHEN deficit_amount > 0 THEN 1 END),
            COUNT(CASE WHEN surplus_amount > 0 THEN 1 END),
            COALESCE(SUM(deficit_amount), 0.00),
            COALESCE(SUM(surplus_amount), 0.00)
        INTO deficit_count, surplus_count, total_deficit, total_surplus
        FROM donations_with_calculations
        WHERE (target_store_id IS NULL OR store_id = target_store_id)
          AND (calculated_start_date IS NULL OR collection_date >= calculated_start_date)
          AND (calculated_end_date IS NULL OR collection_date <= calculated_end_date);
    END;
    
    -- Insert or update summary
    INSERT INTO stores_summary (
        store_id,
        summary_period,
        period_start,
        period_end,
        total_donations,
        total_white_bread,
        total_brown_bread,
        total_white_bread_value,
        total_brown_bread_value,
        total_donation_value,
        average_donation_value,
        average_white_bread_per_donation,
        average_brown_bread_per_donation,
        deficit_occurrences,
        surplus_occurrences,
        total_deficit_amount,
        total_surplus_amount,
        unique_collectors,
        first_donation_date,
        last_donation_date,
        most_active_collector_id,
        last_calculated_at
    ) VALUES (
        target_store_id,
        period_type,
        calculated_start_date,
        calculated_end_date,
        summary_data.total_donations,
        summary_data.total_white,
        summary_data.total_brown,
        summary_data.total_white_value,
        summary_data.total_brown_value,
        summary_data.total_white_value + summary_data.total_brown_value,
        summary_data.avg_donation_value,
        summary_data.avg_white_per_donation,
        summary_data.avg_brown_per_donation,
        deficit_count,
        surplus_count,
        total_deficit,
        total_surplus,
        summary_data.unique_collectors,
        summary_data.first_donation,
        summary_data.last_donation,
        summary_data.most_active_collector,
        NOW()
    )
    ON CONFLICT (store_id, summary_period, period_start, period_end) DO UPDATE SET
        total_donations = EXCLUDED.total_donations,
        total_white_bread = EXCLUDED.total_white_bread,
        total_brown_bread = EXCLUDED.total_brown_bread,
        total_white_bread_value = EXCLUDED.total_white_bread_value,
        total_brown_bread_value = EXCLUDED.total_brown_bread_value,
        total_donation_value = EXCLUDED.total_donation_value,
        average_donation_value = EXCLUDED.average_donation_value,
        average_white_bread_per_donation = EXCLUDED.average_white_bread_per_donation,
        average_brown_bread_per_donation = EXCLUDED.average_brown_bread_per_donation,
        deficit_occurrences = EXCLUDED.deficit_occurrences,
        surplus_occurrences = EXCLUDED.surplus_occurrences,
        total_deficit_amount = EXCLUDED.total_deficit_amount,
        total_surplus_amount = EXCLUDED.total_surplus_amount,
        unique_collectors = EXCLUDED.unique_collectors,
        first_donation_date = EXCLUDED.first_donation_date,
        last_donation_date = EXCLUDED.last_donation_date,
        most_active_collector_id = EXCLUDED.most_active_collector_id,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = NOW();
END;
$$;

-- Create function to update store rankings
CREATE OR REPLACE FUNCTION update_store_rankings(period_type VARCHAR(20) DEFAULT 'all_time')
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update rankings by total value
    WITH ranked_stores AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY total_donation_value DESC) as value_rank
        FROM stores_summary
        WHERE summary_period = period_type
    )
    UPDATE stores_summary 
    SET rank_by_total_value = ranked_stores.value_rank
    FROM ranked_stores
    WHERE stores_summary.id = ranked_stores.id;
    
    -- Update rankings by donation count
    WITH ranked_stores AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY total_donations DESC) as count_rank
        FROM stores_summary
        WHERE summary_period = period_type
    )
    UPDATE stores_summary 
    SET rank_by_donation_count = ranked_stores.count_rank
    FROM ranked_stores
    WHERE stores_summary.id = ranked_stores.id;
    
    -- Update consistency ranking (based on regular donations)
    WITH ranked_stores AS (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN last_donation_date IS NOT NULL AND first_donation_date IS NOT NULL 
                         THEN total_donations::FLOAT / GREATEST(1, last_donation_date - first_donation_date + 1)
                         ELSE 0 
                    END DESC
            ) as consistency_rank
        FROM stores_summary
        WHERE summary_period = period_type
    )
    UPDATE stores_summary 
    SET rank_by_consistency = ranked_stores.consistency_rank
    FROM ranked_stores
    WHERE stores_summary.id = ranked_stores.id;
END;
$$;

-- Add comments
COMMENT ON TABLE stores_summary IS 'Aggregated statistics and summary data for each store across different time periods';
COMMENT ON FUNCTION calculate_store_summary(TEXT, VARCHAR, DATE, DATE) IS 'Calculates and updates summary statistics for a specific store and time period';
COMMENT ON FUNCTION update_store_rankings(VARCHAR) IS 'Updates store rankings based on various performance metrics';