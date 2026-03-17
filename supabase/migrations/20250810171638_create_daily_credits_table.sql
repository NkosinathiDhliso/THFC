-- Create daily_credits table to track surplus credits from donation calculations
-- This table stores credits generated when rounding up brown bread equivalent calculations
-- Credits are tracked on a daily basis and can be applied to reduce future donation requirements
-- All monetary values are stored in South African Rands (ZAR)

CREATE TABLE IF NOT EXISTS daily_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    credit_date DATE NOT NULL,
    credit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    applied_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remaining_balance DECIMAL(10,2) GENERATED ALWAYS AS (credit_amount - applied_amount) STORED,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by date
CREATE INDEX IF NOT EXISTS idx_daily_credits_date ON daily_credits(credit_date);

-- Create index for querying active credits (remaining balance > 0)
CREATE INDEX IF NOT EXISTS idx_daily_credits_remaining_balance ON daily_credits(remaining_balance) WHERE remaining_balance > 0;

-- Enable Row Level Security
ALTER TABLE daily_credits ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles
GRANT SELECT ON daily_credits TO anon;
GRANT ALL PRIVILEGES ON daily_credits TO authenticated;

-- Create RLS policies
CREATE POLICY "Allow read access to daily_credits" ON daily_credits
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage daily_credits" ON daily_credits
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to get current total credit balance
CREATE OR REPLACE FUNCTION get_current_credit_balance()
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    total_balance DECIMAL(10,2) := 0.00;
BEGIN
    SELECT COALESCE(SUM(remaining_balance), 0.00)
    INTO total_balance
    FROM daily_credits
    WHERE remaining_balance > 0;
    
    RETURN total_balance;
END;
$$;

-- Create function to apply credits (oldest first)
CREATE OR REPLACE FUNCTION apply_daily_credits(amount_to_apply DECIMAL(10,2))
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
    credit_record RECORD;
    remaining_to_apply DECIMAL(10,2) := amount_to_apply;
    applied_this_round DECIMAL(10,2);
BEGIN
    -- Apply credits from oldest to newest
    FOR credit_record IN 
        SELECT id, remaining_balance, applied_amount
        FROM daily_credits 
        WHERE remaining_balance > 0 
        ORDER BY credit_date ASC
    LOOP
        IF remaining_to_apply <= 0 THEN
            EXIT;
        END IF;
        
        -- Calculate how much to apply from this credit
        applied_this_round := LEAST(credit_record.remaining_balance, remaining_to_apply);
        
        -- Update the credit record
        UPDATE daily_credits 
        SET applied_amount = applied_amount + applied_this_round,
            updated_at = NOW()
        WHERE id = credit_record.id;
        
        -- Reduce remaining amount to apply
        remaining_to_apply := remaining_to_apply - applied_this_round;
    END LOOP;
    
    -- Return the amount that was actually applied
    RETURN amount_to_apply - remaining_to_apply;
END;
$$;

-- Create function to add new daily credit
CREATE OR REPLACE FUNCTION add_daily_credit(
    credit_date DATE,
    credit_amount DECIMAL(10,2),
    credit_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    new_credit_id UUID;
BEGIN
    INSERT INTO daily_credits (credit_date, credit_amount, notes)
    VALUES (credit_date, credit_amount, credit_notes)
    RETURNING id INTO new_credit_id;
    
    RETURN new_credit_id;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_credits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_daily_credits_updated_at
    BEFORE UPDATE ON daily_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_credits_updated_at();

-- Insert initial comment for documentation
COMMENT ON TABLE daily_credits IS 'Tracks surplus credits from donation calculations when rounding up brown bread equivalents on a daily basis. All amounts in South African Rands (ZAR)';
COMMENT ON COLUMN daily_credits.credit_date IS 'Date when the credit was generated';
COMMENT ON COLUMN daily_credits.credit_amount IS 'Total credit amount generated for this date in ZAR';
COMMENT ON COLUMN daily_credits.applied_amount IS 'Amount of credit in ZAR that has been applied to reduce future donations';
COMMENT ON COLUMN daily_credits.remaining_balance IS 'Calculated field: credit_amount - applied_amount (in ZAR)';
COMMENT ON COLUMN daily_credits.notes IS 'Optional notes about the credit generation or application';