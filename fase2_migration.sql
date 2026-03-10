-- ╔══════════════════════════════════════════════════════════╗
-- ║   HOOKLAB — Fase 2: Multi-Account + Team Management     ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1. SOCIAL ACCOUNTS TABLE — N accounts per workspace
CREATE TABLE IF NOT EXISTS workspace_social_accounts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'youtube')),
    username text NOT NULL,
    display_name text,
    profile_data jsonb DEFAULT '{}',
    is_primary boolean DEFAULT false,
    connected_at timestamptz DEFAULT now(),
    UNIQUE(workspace_id, platform, username)
);

-- 2. INVITATION COLUMNS on workspace_members
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invite_email text;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invite_status text DEFAULT 'accepted';

-- 3. MIGRATE EXISTING SOCIAL DATA → new table
INSERT INTO workspace_social_accounts (workspace_id, platform, username, is_primary, profile_data)
SELECT
    w.id,
    'tiktok',
    REPLACE(w.own_tiktok, '@', ''),
    true,
    COALESCE(
        jsonb_build_object(
            'followers', COALESCE((w.own_social_data->>'tiktokFollowers')::int, 0),
            'likes', COALESCE((w.own_social_data->>'tiktokLikes')::int, 0),
            'videos', COALESCE((w.own_social_data->>'tiktokVideos')::int, 0)
        ),
        '{}'
    )
FROM workspaces w
WHERE w.own_tiktok IS NOT NULL AND w.own_tiktok != ''
ON CONFLICT (workspace_id, platform, username) DO NOTHING;

INSERT INTO workspace_social_accounts (workspace_id, platform, username, is_primary, profile_data)
SELECT
    w.id,
    'instagram',
    REPLACE(w.own_instagram, '@', ''),
    true,
    COALESCE(
        jsonb_build_object(
            'followers', COALESCE((w.own_social_data->>'instagramFollowers')::int, 0),
            'posts', COALESCE((w.own_social_data->>'instagramPosts')::int, 0)
        ),
        '{}'
    )
FROM workspaces w
WHERE w.own_instagram IS NOT NULL AND w.own_instagram != ''
ON CONFLICT (workspace_id, platform, username) DO NOTHING;

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_social_accounts_ws ON workspace_social_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON workspace_social_accounts(workspace_id, platform);

-- 5. RLS
ALTER TABLE workspace_social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on workspace_social_accounts" ON workspace_social_accounts FOR ALL USING (true) WITH CHECK (true);

-- 6. VERIFY
SELECT 'workspace_social_accounts' AS tbl, count(*) AS rows FROM workspace_social_accounts
UNION ALL
SELECT 'workspace_members (with invite cols)', count(*) FROM workspace_members;
