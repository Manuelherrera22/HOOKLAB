-- ======================================
-- HOOKLAB Database Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/isghobqfsqyrzayvmard/sql/new
-- ======================================

-- 1. Create knowledge_entries table
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add own social columns to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_tiktok TEXT DEFAULT '';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_instagram TEXT DEFAULT '';

-- 3. Add new columns to market_references
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS ref_name TEXT DEFAULT '';
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS followers BIGINT DEFAULT 0;
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0;
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS video_count INT DEFAULT 0;
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS is_profile BOOLEAN DEFAULT false;

-- 4. Verify everything exists
SELECT 'accounts' as table_name, column_name 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND column_name IN ('own_tiktok', 'own_instagram')
UNION ALL
SELECT 'market_references', column_name 
FROM information_schema.columns 
WHERE table_name = 'market_references' AND column_name IN ('ref_name', 'followers', 'likes', 'video_count', 'is_profile')
UNION ALL
SELECT 'knowledge_entries', column_name 
FROM information_schema.columns 
WHERE table_name = 'knowledge_entries'
ORDER BY table_name, column_name;
