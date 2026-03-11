-- Content Tracker table for Notion-like grid
-- Stores flexible, user-defined properties as JSONB

CREATE TABLE IF NOT EXISTS content_tracker (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast workspace lookups
CREATE INDEX IF NOT EXISTS idx_content_tracker_workspace ON content_tracker(workspace_id);

-- Enable RLS
ALTER TABLE content_tracker ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for now (workspace-level access control)
CREATE POLICY "Users can manage tracker rows in their workspace" ON content_tracker
    FOR ALL
    USING (true)
    WITH CHECK (true);
