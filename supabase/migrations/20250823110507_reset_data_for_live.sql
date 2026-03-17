-- RESET DATABASE FOR LIVE DEPLOYMENT
-- This migration will clear all existing data and reset to a clean state
-- WARNING: This will delete ALL existing data!

BEGIN;

-- Clear all existing data from all tables
DELETE FROM donations;
DELETE FROM daily_donation_log;
DELETE FROM daily_donation_summary;
DELETE FROM daily_credits;
DELETE FROM sales_periods;
DELETE FROM stores_summary;
DELETE FROM current_sales_data;
DELETE FROM user_favorites;

-- Reset sequences to start from 1
ALTER SEQUENCE donations_id_seq RESTART WITH 1;
ALTER SEQUENCE daily_donation_log_id_seq RESTART WITH 1;
ALTER SEQUENCE daily_donation_summary_id_seq RESTART WITH 1;
ALTER SEQUENCE daily_credits_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_periods_id_seq RESTART WITH 1;
ALTER SEQUENCE stores_summary_id_seq RESTART WITH 1;
ALTER SEQUENCE current_sales_data_id_seq RESTART WITH 1;
ALTER SEQUENCE user_favorites_id_seq RESTART WITH 1;

-- Keep existing stores - don't delete them
-- Only reset the sequence if there are no stores
-- ALTER SEQUENCE stores_id_seq RESTART WITH 1;

-- Keep user profiles but clear any test data (keep admin users)
-- Only delete profiles that might be test data (you can modify this condition)
DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example%';

COMMIT;
