-- Quick fix: Add the missing spar-east-london store
-- Run this in Supabase SQL Editor to fix the immediate foreign key error

INSERT INTO stores (id, name, address) VALUES 
('spar-east-london', 'Spar East London', 'East London Central, East London, Eastern Cape')
ON CONFLICT (id) DO NOTHING;

-- Verify the store was added
SELECT id, name, address FROM stores WHERE id = 'spar-east-london';
