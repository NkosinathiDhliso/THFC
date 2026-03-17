-- Create sales_periods table
-- Created: 2025-01-09
-- Purpose: Track sales periods and related data for admin dashboard

CREATE TABLE IF NOT EXISTS sales_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_sales_quantity INTEGER DEFAULT 0,
    target_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no overlapping active periods
    CONSTRAINT check_date_order CHECK (end_date >= start_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_periods_dates ON sales_periods(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sales_periods_active ON sales_periods(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sales_periods_created_at ON sales_periods(created_at);

-- Enable Row Level Security
ALTER TABLE sales_periods ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON sales_periods TO anon;
GRANT ALL PRIVILEGES ON sales_periods TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to sales_periods" ON sales_periods
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage sales_periods" ON sales_periods
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sales_periods_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_sales_periods_updated_at_trigger
    BEFORE UPDATE ON sales_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_periods_updated_at();

-- Add comments
COMMENT ON TABLE sales_periods IS 'Tracks sales periods and targets for admin dashboard';
COMMENT ON COLUMN sales_periods.period_name IS 'Human-readable name for the sales period';
COMMENT ON COLUMN sales_periods.total_sales_quantity IS 'Total sales quantity achieved in this period';
COMMENT ON COLUMN sales_periods.target_quantity IS 'Target sales quantity for this period';
COMMENT ON COLUMN sales_periods.is_active IS 'Whether this is the currently active sales period';