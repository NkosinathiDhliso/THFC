-- Fix FORMAT function issues in donation calculations
-- Created: 2025-06-19
-- Purpose: Fix PostgreSQL format specifier errors in trigger function

-- Replace the trigger function with corrected FORMAT usage
CREATE OR REPLACE FUNCTION auto_calculate_donation_values()
RETURNS TRIGGER AS $$
DECLARE
  white_price DECIMAL(10,2);
  calculated_value DECIMAL(10,2);
  brown_price DECIMAL(10,2);
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
      COALESCE(NEW.deficit_percentage_applied, 5.9)
    );
    
    -- Get brown bread price for notes
    brown_price := get_current_bread_price('brown');
    
    -- Add calculation notes with corrected concatenation
    NEW.calculation_notes := 
      'Auto-calculated: ' || NEW.white_bread_qty || ' loaves × R' || white_price || 
      ' = R' || calculated_value || '; Brown bread equivalent: ' || 
      NEW.calculated_brown_bread_qty || ' loaves (' || 
      COALESCE(NEW.deficit_percentage_applied, 5.9) || '% of R' || 
      calculated_value || ' ÷ R' || brown_price || ')';
    
  ELSIF NEW.white_bread_monetary_value IS NOT NULL AND NEW.white_bread_monetary_value > 0 THEN
    -- Calculate brown bread equivalent from provided monetary value
    NEW.calculated_brown_bread_qty := calculate_brown_bread_equivalent(
      NEW.white_bread_monetary_value, 
      COALESCE(NEW.deficit_percentage_applied, 5.9)
    );
    
    -- Get brown bread price for notes
    brown_price := get_current_bread_price('brown');
    
    -- Add calculation notes with corrected concatenation
    NEW.calculation_notes := 
      'Manual value: R' || NEW.white_bread_monetary_value || 
      '; Brown bread equivalent: ' || NEW.calculated_brown_bread_qty || 
      ' loaves (' || COALESCE(NEW.deficit_percentage_applied, 5.9) || 
      '% of R' || NEW.white_bread_monetary_value || ' ÷ R' || brown_price || ')';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 