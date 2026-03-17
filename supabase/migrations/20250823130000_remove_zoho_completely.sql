-- Remove all Zoho-related components completely
-- Created: 2025-08-23
-- Purpose: Clean up unused Zoho CRM integration

BEGIN;

-- Drop views that depend on zoho tables
DROP VIEW IF EXISTS public.zoho_sales_data_compat CASCADE;

-- Drop policies on zoho tables
DROP POLICY IF EXISTS "Anyone can read sales data" ON public.zoho_sales_data;
DROP POLICY IF EXISTS "Authenticated users can insert sales data" ON public.zoho_sales_data;
DROP POLICY IF EXISTS "Authenticated users can update sales data" ON public.zoho_sales_data;
DROP POLICY IF EXISTS "Admins can manage sales data" ON public.zoho_sales_data;

-- Drop the main zoho table
DROP TABLE IF EXISTS public.zoho_sales_data CASCADE;

-- Drop any zoho-related functions
DROP FUNCTION IF EXISTS public.get_zoho_sales_data() CASCADE;
DROP FUNCTION IF EXISTS public.sync_zoho_data() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_zoho_deficit() CASCADE;

-- Drop any zoho-related types
DROP TYPE IF EXISTS zoho_status CASCADE;

COMMIT;
