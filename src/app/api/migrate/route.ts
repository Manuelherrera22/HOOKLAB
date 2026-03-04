import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST() {
    const connectionString = 'postgresql://postgres.isghobqfsqyrzayvmard:Herrera123Musfelcrow@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 30000,
        query_timeout: 30000,
    });

    const results: string[] = [];

    try {
        await client.connect();
        results.push('Connected to database');

        // 1. Create knowledge_entries
        await client.query(`
            CREATE TABLE IF NOT EXISTS knowledge_entries (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        results.push('knowledge_entries table created ✓');

        // 2. Add columns to accounts
        await client.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_tiktok TEXT DEFAULT ''`);
        await client.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_instagram TEXT DEFAULT ''`);
        await client.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT`);
        await client.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS own_social_data JSONB DEFAULT '{}'::jsonb`);
        results.push('accounts: own_tiktok, own_instagram, email, own_social_data added ✓');

        // 3. Add columns to market_references
        await client.query(`ALTER TABLE market_references ADD COLUMN IF NOT EXISTS ref_name TEXT DEFAULT ''`);
        await client.query(`ALTER TABLE market_references ADD COLUMN IF NOT EXISTS followers BIGINT DEFAULT 0`);
        await client.query(`ALTER TABLE market_references ADD COLUMN IF NOT EXISTS likes BIGINT DEFAULT 0`);
        await client.query(`ALTER TABLE market_references ADD COLUMN IF NOT EXISTS video_count INT DEFAULT 0`);
        await client.query(`ALTER TABLE market_references ADD COLUMN IF NOT EXISTS is_profile BOOLEAN DEFAULT false`);
        results.push('market_references: ref_name, followers, likes, video_count, is_profile added ✓');

        // 4. Create unique index on email (if not exists)
        await client.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'accounts_email_unique') THEN
                    CREATE UNIQUE INDEX accounts_email_unique ON accounts(email) WHERE email IS NOT NULL AND email != '';
                END IF;
            END $$;
        `);
        results.push('Email unique index created ✓');

        await client.end();
        results.push('ALL MIGRATIONS COMPLETE ✓');

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        results.push(`ERROR: ${error.message}`);
        try { await client.end(); } catch { }
        return NextResponse.json({ success: false, results, error: error.message }, { status: 500 });
    }
}
