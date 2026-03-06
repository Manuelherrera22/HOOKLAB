import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET: List saved scripts
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) {
        return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("saved_scripts")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ scripts: data || [] });
}

// POST: Save a new script
export async function POST(req: Request) {
    const { accountId, title, content, hookType, tags, score } = await req.json();
    if (!accountId || !content) {
        return NextResponse.json({ error: "accountId and content required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("saved_scripts")
        .insert([{
            account_id: accountId,
            title: title || "Untitled Script",
            content,
            hook_type: hookType || null,
            tags: tags || [],
            viral_score: score || null,
            is_favorite: false,
        }])
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ script: data });
}

// PATCH: Toggle favorite / update
export async function PATCH(req: Request) {
    const { id, is_favorite, title, tags } = await req.json();
    if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const updates: any = {};
    if (is_favorite !== undefined) updates.is_favorite = is_favorite;
    if (title !== undefined) updates.title = title;
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabase
        .from("saved_scripts")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ script: data });
}

// DELETE: Remove a script
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { error } = await supabase
        .from("saved_scripts")
        .delete()
        .eq("id", id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}
