import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");
    const accountId = searchParams.get("account_id");

    if (!username && !accountId) {
        return NextResponse.json({ error: "username or account_id required" }, { status: 400 });
    }

    const filter = username ? { column: "username", value: username } : { column: "account_id", value: accountId! };

    // Fetch all modules in parallel
    const [leadProfile, hooks, contentSpy, audienceMirror, trendRadar, mediakit] = await Promise.all([
        // 1. Lead Profile
        supabase
            .from("profile_analyses")
            .select("*")
            .eq(filter.column, filter.value)
            .eq("analysis_type", "lead_profile")
            .order("created_at", { ascending: false })
            .limit(1),

        // 2. Hook Decoder
        supabase
            .from("hook_analyses")
            .select("*")
            .eq(filter.column, filter.value)
            .order("created_at", { ascending: false })
            .limit(10),

        // 3. Content Spy
        supabase
            .from("profile_analyses")
            .select("*")
            .eq(filter.column, filter.value)
            .eq("analysis_type", "content_spy")
            .order("created_at", { ascending: false })
            .limit(1),

        // 4. Audience Mirror
        supabase
            .from("audience_insights")
            .select("*")
            .eq(filter.column, filter.value)
            .order("created_at", { ascending: false })
            .limit(1),

        // 5. Trend Radar (uses 'niche' column)
        username
            ? supabase
                .from("trend_snapshots")
                .select("*")
                .eq("niche", username)
                .order("created_at", { ascending: false })
                .limit(1)
            : supabase
                .from("trend_snapshots")
                .select("*")
                .eq("account_id", accountId!)
                .order("created_at", { ascending: false })
                .limit(1),

        // 6. Mediakit
        supabase
            .from("profile_analyses")
            .select("*")
            .eq(filter.column, filter.value)
            .eq("analysis_type", "mediakit")
            .order("created_at", { ascending: false })
            .limit(1),
    ]);

    return NextResponse.json({
        leadProfile: leadProfile.data?.[0] || null,
        hooks: hooks.data || [],
        contentSpy: contentSpy.data?.[0] || null,
        audienceMirror: audienceMirror.data?.[0] || null,
        trendRadar: trendRadar.data?.[0] || null,
        mediakit: mediakit.data?.[0] || null,
    });
}
