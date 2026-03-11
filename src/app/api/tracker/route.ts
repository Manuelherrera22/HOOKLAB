import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// GET - List all tracker rows for a workspace
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('content_tracker')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rows: data || [] });
}

// POST - Create a new tracker row
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { workspaceId, properties } = body;

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('content_tracker')
        .insert([{
            workspace_id: workspaceId,
            properties: properties || {
                title: '',
                status: 'Idea',
                platform: '',
                date: new Date().toISOString().split('T')[0],
                url: '',
                views: 0,
                likes: 0,
                comments: 0,
                notes: '',
            },
        }])
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row: data });
}

// PATCH - Update a tracker row's properties
export async function PATCH(req: NextRequest) {
    const body = await req.json();
    const { id, properties } = body;

    if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('content_tracker')
        .update({ properties, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row: data });
}

// DELETE - Delete a tracker row
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const { error } = await supabase
        .from('content_tracker')
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
