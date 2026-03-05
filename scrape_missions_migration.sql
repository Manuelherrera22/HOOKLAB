-- ======================================
-- HOOKLAB Scraping Missions Migration
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/isghobqfsqyrzayvmard/sql/new
-- ======================================

-- 1. Add own_social_data JSONB column to accounts (if missing)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_social_data JSONB DEFAULT '{}';

-- 2. Scraping mission queue
CREATE TABLE IF NOT EXISTS scrape_missions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    platform TEXT DEFAULT 'tiktok' CHECK (platform IN ('tiktok', 'instagram')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    error TEXT,
    video_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 3. Scraped video results
CREATE TABLE IF NOT EXISTS scraped_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mission_id UUID REFERENCES scrape_missions(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    caption TEXT DEFAULT '',
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    views BIGINT DEFAULT 0,
    url TEXT DEFAULT '',
    timestamp TIMESTAMPTZ,
    thumbnail TEXT DEFAULT '',
    platform TEXT DEFAULT 'tiktok',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_missions_status ON scrape_missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_account ON scrape_missions(account_id);
CREATE INDEX IF NOT EXISTS idx_videos_mission ON scraped_videos(mission_id);
CREATE INDEX IF NOT EXISTS idx_videos_account ON scraped_videos(account_id);

-- 5. RLS Policies (permissive for anon key — same pattern as existing tables)
ALTER TABLE scrape_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on scrape_missions" ON scrape_missions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all on scraped_videos" ON scraped_videos
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Verify
SELECT 'scrape_missions' AS table_name, count(*) AS rows FROM scrape_missions
UNION ALL
SELECT 'scraped_videos', count(*) FROM scraped_videos;
