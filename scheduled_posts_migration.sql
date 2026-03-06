-- ╔══════════════════════════════════════════╗
-- ║   HOOKLAB — Scheduled Posts Table        ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
    caption text NOT NULL,
    platforms text[] DEFAULT ARRAY['instagram'],
    media_urls text[] DEFAULT ARRAY[]::text[],
    hashtags text[] DEFAULT ARRAY[]::text[],
    video_url text,
    concept_title text,
    quality_score integer,
    scheduled_date timestamptz NOT NULL,
    status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')),
    publish_result jsonb,
    ayrshare_post_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account ON scheduled_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date ON scheduled_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled posts"
    ON scheduled_posts FOR ALL
    USING (true)
    WITH CHECK (true);
