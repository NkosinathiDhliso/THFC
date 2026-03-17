-- Migration: Add editing capability to donations table
-- Created: 2025-06-19
-- Purpose: Allow administrators to edit donation records with audit trail

-- Add audit columns to donations table
ALTER TABLE donations 
ADD COLUMN edited_at TIMESTAMPTZ,
ADD COLUMN edited_by UUID REFERENCES auth.users(id);

-- Add comment to document the new columns
COMMENT ON COLUMN donations.edited_at IS 'Timestamp when the donation was last edited by an admin';
COMMENT ON COLUMN donations.edited_by IS 'UUID of the admin user who last edited this donation';

-- Create index for edited_by to improve query performance
CREATE INDEX idx_donations_edited_by ON donations(edited_by);

-- Create index for edited_at to improve query performance  
CREATE INDEX idx_donations_edited_at ON donations(edited_at);

-- Grant necessary permissions for admin users to edit donations
-- Note: This assumes admin users have the 'admin' role in their user_profiles
