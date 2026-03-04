import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role key for DDL operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
    const results: string[] = [];
    const errors: string[] = [];

    try {
        // 1. Check if knowledge_entries exists by trying to query it
        const { error: keCheck } = await supabaseAdmin
            .from('knowledge_entries')
            .select('id')
            .limit(1);

        if (keCheck && keCheck.code === '42P01') {
            // Table doesn't exist — we need to create it via raw SQL
            // Since we can't run DDL via Supabase client, we'll create it via RPC or pg
            results.push('knowledge_entries table does NOT exist — needs SQL Editor creation');
        } else if (keCheck) {
            results.push(`knowledge_entries check: ${keCheck.message}`);
        } else {
            results.push('knowledge_entries table EXISTS ✓');
        }

        // 2. Check accounts columns
        const { data: accountData, error: accErr } = await supabaseAdmin
            .from('accounts')
            .select('own_tiktok, own_instagram')
            .limit(1);

        if (accErr && accErr.message.includes('own_tiktok')) {
            results.push('accounts: own_tiktok column MISSING');
        } else {
            results.push('accounts columns OK ✓');
        }

        // 3. Check market_references columns
        const { data: refData, error: refErr } = await supabaseAdmin
            .from('market_references')
            .select('ref_name, followers, likes, video_count, is_profile')
            .limit(1);

        if (refErr) {
            results.push(`market_references: ${refErr.message}`);
        } else {
            results.push('market_references columns OK ✓');
        }

        return NextResponse.json({
            status: 'checked',
            results,
            errors,
            message: 'If any tables/columns are missing, run the SQL in supabase_migration.sql via the Supabase SQL Editor'
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
