import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// POST: Create scheduled post
export async function POST(req: Request) {
    const {
        accountId,
        workspaceId,
        caption,
        platforms,
        mediaUrls,
        scheduledDate,
        hashtags,
        videoUrl,
        conceptTitle,
        qualityScore,
    } = await req.json();

    if (!accountId || !caption || !scheduledDate) {
        return NextResponse.json({ error: "accountId, caption, scheduledDate required" }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from("scheduled_posts")
            .insert({
                account_id: accountId,
                workspace_id: workspaceId || accountId,
                caption,
                platforms: platforms || ["instagram"],
                media_urls: mediaUrls || [],
                scheduled_date: scheduledDate,
                hashtags: hashtags || [],
                video_url: videoUrl || null,
                concept_title: conceptTitle || null,
                quality_score: qualityScore || null,
                status: "scheduled",
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, post: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET: List scheduled posts
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const status = searchParams.get("status") || "scheduled";

    if (!accountId) {
        return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    try {
        let query = supabase
            .from("scheduled_posts")
            .select("*")
            .eq("account_id", accountId)
            .order("scheduled_date", { ascending: true });

        if (status !== "all") {
            query = query.eq("status", status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, posts: data || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Cancel scheduled post
export async function DELETE(req: Request) {
    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ error: "post id required" }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from("scheduled_posts")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
