const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres.isghobqfsqyrzayvmard:Herrera123Musfelcrow@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
});

async function run() {
    try {
        await client.connect();

        await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT UNIQUE NOT NULL,
        niche TEXT DEFAULT 'Trading',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS market_references (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        platform TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS hooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        match_score INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
        console.log("Tables created successfully");
    } catch (error) {
        console.error("Error creating tables:", error);
    } finally {
        await client.end();
    }
}
run();
