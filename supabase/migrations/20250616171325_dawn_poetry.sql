/*
  # Add foreign key relationship between donations and profiles

  1. Changes
    - Add foreign key constraint linking donations.collector_id to profiles.id
    - This enables the Supabase query to join donations with profiles using collector:profiles(*)

  2. Security
    - No changes to existing RLS policies
    - Maintains existing data integrity
*/

-- Add foreign key constraint between donations.collector_id and profiles.id
-- This allows Supabase to recognize the relationship for joins
ALTER TABLE donations 
ADD CONSTRAINT donations_collector_profile_fkey 
FOREIGN KEY (collector_id) REFERENCES profiles(id);