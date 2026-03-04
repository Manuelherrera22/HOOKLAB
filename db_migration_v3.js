const { Client } = require('pg');

async function addSnapshotsTable() {
    const client = new Client({
        connectionString: 'postgresql://postgres.isghobqfsqyrzayvmard:Herrera123Musfelcrow@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
    });

    await client.connect();
    console.log('Connected to Supabase');

    // Create view_snapshots table
    await client.query(`
        CREATE TABLE IF NOT EXISTS view_snapshots (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            reference_id UUID REFERENCES market_references(id) ON DELETE CASCADE,
            views INTEGER DEFAULT 0,
            captured_at TIMESTAMPTZ DEFAULT NOW()
        );
    `);
    console.log('view_snapshots table created');

    // Add thumbnail and author columns to market_references if they don't exist
    await client.query(`
        ALTER TABLE market_references 
        ADD COLUMN IF NOT EXISTS thumbnail TEXT,
        ADD COLUMN IF NOT EXISTS author TEXT;
    `);
    console.log('Added thumbnail and author columns to market_references');

    await client.end();
    console.log('Done!');
}

addSnapshotsTable().catch(console.error);
