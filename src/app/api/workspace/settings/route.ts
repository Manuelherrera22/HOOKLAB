import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// PATCH: Update workspace settings
export async function PATCH(req: Request) {
    const { workspaceId, name, niche, slug } = await req.json();
    if (!workspaceId) {
        return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (niche !== undefined) updates.niche = niche;
    if (slug !== undefined) updates.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const { data, error } = await supabase
        .from("workspaces")
        .update(updates)
        .eq("id", workspaceId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ workspace: data });
}
