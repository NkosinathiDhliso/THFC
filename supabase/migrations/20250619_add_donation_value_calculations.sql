-- Migration: Add donation value calculations and brown bread equivalent
-- Created: 2025-06-19
-- Purpose: Track monetary value of white bread donations and calculate brown bread equivalent

-- Create bread_prices table for flexible pricing management
CREATE TABLE IF NOT EXISTS bread_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type VARCHAR(20) NOT NULL CHECK (bread_type IN ('white', 'brown')),
  price_per_loaf DECIMAL(10,2) NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bread_type, effective_from)
);

-- Insert current bread prices
INSERT INTO bread_prices (bread_type, price_per_loaf, effective_from, is_active) VALUES
  ('white', 8.80, now(), true),
  ('brown', 7.75, now(), true)
ON CONFLICT (bread_type, effective_from) DO NOTHING;

-- Add new columns to donations table
ALTER TABLE donations 
ADD COLUMN white_bread_monetary_value DECIMAL(10,2),
ADD COLUMN calculated_brown_bread_qty DECIMAL(10,2),
ADD COLUMN deficit_percentage_applied DECIMAL(5,2) DEFAULT 5.6,
ADD COLUMN calculation_notes TEXT;

-- Add indexes for better query performance
CREATE INDEX idx_donations_monetary_value ON donations(white_bread_monetary_value);
CREATE INDEX idx_donations_calculated_brown_bread ON donations(calculated_brown_bread_qty);
CREATE INDEX idx_bread_prices_active ON bread_prices(bread_type, is_active) WHERE is_active = true;

-- Add comments to document the new columns
COMMENT ON COLUMN donations.white_bread_monetary_value IS 'Monetary value of white bread donation in ZAR';
COMMENT ON COLUMN donations.calculated_brown_bread_qty IS 'Calculated brown bread equivalent based on 5.6% of white bread value';
COMMENT ON COLUMN donations.deficit_percentage_applied IS 'Percentage used for deficit calculation (default 5.6%)';
COMMENT ON COLUMN donations.calculation_notes IS 'Notes about the calculation method used';

-- Create function to get current bread price
CREATE OR REPLACE FUNCTION get_current_bread_price(bread_type_param VARCHAR(20))
RETURNS DECIMAL(10,2) AS $$
DECLARE
  current_price DECIMAL(10,2);
BEGIN
  SELECT price_per_loaf INTO current_price
  FROM bread_prices 
  WHERE bread_type = bread_type_param 
    AND is_active = true 
    AND effective_from <= now() 
    AND (effective_until IS NULL OR effective_until > now())
  ORDER BY effective_from DESC 
  LIMIT 1;
  
  RETURN COALESCE(current_price, 
    CASE 
      WHEN bread_type_param = 'white' THEN 8.80
      WHEN bread_type_param = 'brown' THEN 7.75
      ELSE 0.00
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate brown bread equivalent
CREATE OR REPLACE FUNCTION calculate_brown_bread_equivalent(
  white_bread_value DECIMAL(10,2),
  deficit_percentage DECIMAL(5,2) DEFAULT 5.6
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  brown_bread_price DECIMAL(10,2);
  deficit_amount DECIMAL(10,2);
  brown_bread_qty DECIMAL(10,2);
BEGIN
  -- Get current brown bread price
  brown_bread_price := get_current_bread_price('brown');
  
  -- Calculate 5.6% (or specified percentage) of white bread value
  deficit_amount := (white_bread_value * deficit_percentage / 100);
  
  -- Convert to brown bread quantity
  brown_bread_qty := CASE 
    WHEN brown_bread_price > 0 THEN deficit_amount / brown_bread_price
    ELSE 0
  END;
  
  -- Round to 2 decimal places
  RETURN ROUND(brown_bread_qty, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to automatically calculate values on insert/update
CREATE OR REPLACE FUNCTION auto_calculate_donation_values()
RETURNS TRIGGER AS $$
DECLARE
  white_price DECIMAL(10,2);
  calculated_value DECIMAL(10,2);
BEGIN
  -- Only calculate if white_bread_qty is provided and monetary value is not manually set
  IF NEW.white_bread_qty > 0 AND NEW.white_bread_monetary_value IS NULL THEN
    -- Get current white bread price
    white_price := get_current_bread_price('white');
    
    -- Calculate monetary value
    calculated_value := NEW.white_bread_qty * white_price;
    NEW.white_bread_monetary_value := calculated_value;
    
    -- Calculate brown bread equivalent
    NEW.calculated_brown_bread_qty := calculate_brown_bread_equivalent(
      calculated_value, 
      COALESCE(NEW.deficit_percentage_applied, 5.6)
    );
    
    -- Add calculation notes
    NEW.calculation_notes := FORMAT(
      'Auto-calculated: %s loaves × R%s = R%s; Brown bread equivalent: %s loaves (%.1s%% of R%s ÷ R%s)',
      NEW.white_bread_qty,
      white_price,
      calculated_value,
      NEW.calculated_brown_bread_qty,
      COALESCE(NEW.deficit_percentage_applied, 5.6),
      calculated_value,
      get_current_bread_price('brown')
    );
    
  ELSIF NEW.white_bread_monetary_value IS NOT NULL AND NEW.white_bread_monetary_value > 0 THEN
    -- Calculate brown bread equivalent from provided monetary value
    NEW.calculated_brown_bread_qty := calculate_brown_bread_equivalent(
      NEW.white_bread_monetary_value, 
      COALESCE(NEW.deficit_percentage_applied, 5.6)
    );
    
    -- Add calculation notes
    NEW.calculation_notes := FORMAT(
      'Manual value: R%s; Brown bread equivalent: %s loaves (%.1s%% of R%s ÷ R%s)',
      NEW.white_bread_monetary_value,
      NEW.calculated_brown_bread_qty,
      COALESCE(NEW.deficit_percentage_applied, 5.6),
      NEW.white_bread_monetary_value,
      get_current_bread_price('brown')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic calculations
CREATE TRIGGER donations_auto_calculate_values
  BEFORE INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_donation_values();

-- Enable RLS for bread_prices table
ALTER TABLE bread_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for bread_prices table
CREATE POLICY "Anyone can read bread prices"
  ON bread_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage bread prices"
  ON bread_prices
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_current_bread_price(VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_brown_bread_equivalent(DECIMAL, DECIMAL) TO anon, authenticated;

COMMENT ON TABLE bread_prices IS 'Stores current and historical bread prices for calculation purposes';
COMMENT ON FUNCTION get_current_bread_price(VARCHAR) IS 'Returns the current active price for a given bread type';
COMMENT ON FUNCTION calculate_brown_bread_equivalent(DECIMAL, DECIMAL) IS 'Calculates brown bread equivalent based on monetary value and deficit percentage';