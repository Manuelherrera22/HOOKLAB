-- ╔══════════════════════════════════════════════════════════╗
-- ║   HOOKLAB — Multi-Tenant Workspace Migration            ║
-- ║   Run in Supabase SQL Editor                            ║
-- ╚══════════════════════════════════════════════════════════╝

-- ============================================================
-- 1. CREATE NEW TABLES
-- ============================================================

-- Workspaces: the data container (replaces account as data owner)
CREATE TABLE IF NOT EXISTS workspaces (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE,
    logo_url text,
    owner_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    own_tiktok text DEFAULT '',
    own_instagram text DEFAULT '',
    own_social_data jsonb DEFAULT '{}',
    niche text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Workspace members: who belongs where and with what role
CREATE TABLE IF NOT EXISTS workspace_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role text DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    invited_by uuid REFERENCES accounts(id),
    joined_at timestamptz DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- ============================================================
-- 2. ADD workspace_id TO ALL EXISTING DATA TABLES
-- ============================================================

-- Core data tables
ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE market_references ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE scrape_missions ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE scraped_videos ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE scheduled_posts ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

-- Intelligence tables (may not exist yet — use IF NOT EXISTS on column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hook_analyses') THEN
        ALTER TABLE hook_analyses ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audience_insights') THEN
        ALTER TABLE audience_insights ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_snapshots') THEN
        ALTER TABLE trend_snapshots ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_analyses') THEN
        ALTER TABLE profile_analyses ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 3. MIGRATE EXISTING DATA
--    Each existing account → 1 workspace (same UUID for easy mapping)
-- ============================================================

-- Create a workspace for each existing account
INSERT INTO workspaces (id, name, slug, owner_id, own_tiktok, own_instagram, own_social_data, niche)
SELECT
    a.id,                                           -- same UUID
    a.name,
    LOWER(REGEXP_REPLACE(a.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || LEFT(a.id::text, 8),
    a.id,                                           -- owner is the account itself
    COALESCE(a.own_tiktok, ''),
    COALESCE(a.own_instagram, ''),
    COALESCE(a.own_social_data, '{}'),
    COALESCE(a.niche, '')
FROM accounts a
WHERE NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.id)
ON CONFLICT (id) DO NOTHING;

-- Add account as owner member of their workspace
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, id, 'owner' FROM accounts
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Backfill workspace_id on existing rows (workspace_id = account_id since same UUID)
UPDATE knowledge_entries SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL;
UPDATE market_references SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL;
UPDATE scrape_missions SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL;
UPDATE scraped_videos SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL;
UPDATE scheduled_posts SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL;

-- Intelligence tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hook_analyses') THEN
        EXECUTE 'UPDATE hook_analyses SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audience_insights') THEN
        EXECUTE 'UPDATE audience_insights SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_snapshots') THEN
        EXECUTE 'UPDATE trend_snapshots SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_analyses') THEN
        EXECUTE 'UPDATE profile_analyses SET workspace_id = account_id WHERE workspace_id IS NULL AND account_id IS NOT NULL';
    END IF;
END $$;

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_members_workspace ON workspace_members(workspace_id);

-- workspace_id indexes on data tables
CREATE INDEX IF NOT EXISTS idx_knowledge_ws ON knowledge_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_references_ws ON market_references(workspace_id);
CREATE INDEX IF NOT EXISTS idx_missions_ws ON scrape_missions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_videos_ws ON scraped_videos(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_ws ON scheduled_posts(workspace_id);

-- ============================================================
-- 5. RLS (permissive — same pattern as existing tables)
-- ============================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on workspaces" ON workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on workspace_members" ON workspace_members FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. VERIFY
-- ============================================================

SELECT '✅ workspaces' AS status, count(*) AS rows FROM workspaces
UNION ALL
SELECT '✅ workspace_members', count(*) FROM workspace_members
UNION ALL
SELECT '✅ knowledge_entries (with ws_id)', count(*) FROM knowledge_entries WHERE workspace_id IS NOT NULL
UNION ALL
SELECT '✅ market_references (with ws_id)', count(*) FROM market_references WHERE workspace_id IS NOT NULL
UNION ALL
SELECT '✅ scrape_missions (with ws_id)', count(*) FROM scrape_missions WHERE workspace_id IS NOT NULL;
