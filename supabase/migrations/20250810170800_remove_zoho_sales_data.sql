-- Remove Zoho Sales Data Table
-- Created: 2025-01-09
-- Purpose: Remove unused zoho_sales_data table and related policies

-- Drop policies first
DROP POLICY IF EXISTS "Anyone can read sales data" ON zoho_sales_data;
DROP POLICY IF EXISTS "Authenticated users can insert sales data" ON zoho_sales_data;
DROP POLICY IF EXISTS "Authenticated users can update sales data" ON zoho_sales_data;

-- Drop the table
DROP TABLE IF EXISTS zoho_sales_data CASCADE;

-- Add comment
COMMENT ON SCHEMA public IS 'Removed zoho_sales_data table as it is no longer needed';