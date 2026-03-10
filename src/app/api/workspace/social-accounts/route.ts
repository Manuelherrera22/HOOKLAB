import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET: List social accounts for a workspace
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    const { data, error } = await supabase
        .from("workspace_social_accounts")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("is_primary", { ascending: false })
        .order("connected_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ accounts: data || [] });
}

// POST: Connect a new social account
export async function POST(req: Request) {
    const { workspaceId, platform, username, displayName } = await req.json();
    if (!workspaceId || !platform || !username) {
        return NextResponse.json({ error: "workspaceId, platform, username required" }, { status: 400 });
    }

    const cleanUsername = username.replace("@", "").trim();

    // Check if already connected
    const { data: existing } = await supabase
        .from("workspace_social_accounts")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("platform", platform)
        .eq("username", cleanUsername)
        .maybeSingle();

    if (existing) {
        return NextResponse.json({ error: "Account already connected", account: existing }, { status: 409 });
    }

    // Check plan limits (free = 2 accounts, pro = 10, agency = unlimited)
    const { count } = await supabase
        .from("workspace_social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);

    // For now allow up to 10 pending plan enforcement
    if ((count || 0) >= 10) {
        return NextResponse.json({ error: "Account limit reached. Upgrade your plan." }, { status: 403 });
    }

    // Check if this is the first account for this platform → make it primary
    const { count: platformCount } = await supabase
        .from("workspace_social_accounts")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("platform", platform);

    const isPrimary = (platformCount || 0) === 0;

    const { data, error } = await supabase
        .from("workspace_social_accounts")
        .insert({
            workspace_id: workspaceId,
            platform,
            username: cleanUsername,
            display_name: displayName || cleanUsername,
            is_primary: isPrimary,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ account: data });
}

// DELETE: Disconnect a social account
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await supabase
        .from("workspace_social_accounts")
        .delete()
        .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
