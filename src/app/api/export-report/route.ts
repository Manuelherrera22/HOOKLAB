import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export const maxDuration = 30;

export async function POST(req: Request) {
    const { username } = await req.json();
    if (!username) {
        return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const clean = username.replace("@", "").trim();

    // Fetch all intel data
    const [profileRes, hooksRes, spyRes, audienceRes, trendRes, mediakitRes, videosRes] = await Promise.all([
        supabase.from("profile_analyses").select("*").eq("username", clean).eq("analysis_type", "lead_profile").order("created_at", { ascending: false }).limit(1),
        supabase.from("hook_analyses").select("*").eq("username", clean).order("created_at", { ascending: false }).limit(10),
        supabase.from("profile_analyses").select("*").eq("username", clean).eq("analysis_type", "content_spy").order("created_at", { ascending: false }).limit(1),
        supabase.from("audience_insights").select("*").eq("username", clean).order("created_at", { ascending: false }).limit(1),
        supabase.from("trend_snapshots").select("*").eq("niche", clean).order("created_at", { ascending: false }).limit(1),
        supabase.from("profile_analyses").select("*").eq("username", clean).eq("analysis_type", "mediakit").order("created_at", { ascending: false }).limit(1),
        supabase.from("scraped_videos").select("views, likes, comments, caption").eq("username", clean).order("views", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data?.[0];
    const hooks = hooksRes.data || [];
    const spy = spyRes.data?.[0];
    const audience = audienceRes.data?.[0];
    const trends = trendRes.data?.[0];
    const mediakit = mediakitRes.data?.[0];
    const videos = videosRes.data || [];

    // Build report sections
    const sections: any[] = [];
    const now = new Date().toLocaleDateString("es-LA", { year: "numeric", month: "long", day: "numeric" });

    sections.push({
        title: "HOOKLAB Intelligence Report",
        subtitle: `@${clean} — Generated ${now}`,
        type: "header",
    });

    // Profile Summary
    if (profile?.profile_summary) {
        sections.push({
            title: "Lead Profile",
            type: "profile",
            data: profile.profile_summary,
            buyerPersona: profile.buyer_persona,
            salesApproach: profile.sales_approach,
        });
    }

    // Stats
    if (videos.length > 0) {
        const totalViews = videos.reduce((s: number, v: any) => s + (v.views || 0), 0);
        const totalLikes = videos.reduce((s: number, v: any) => s + (v.likes || 0), 0);
        sections.push({
            title: "Performance Stats",
            type: "stats",
            data: {
                videos: videos.length,
                totalViews,
                totalLikes,
                avgViews: Math.round(totalViews / videos.length),
                engagementRate: totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) + "%" : "0%",
            },
        });
    }

    // Hooks
    if (hooks.length > 0) {
        sections.push({
            title: "Hook Analysis",
            type: "hooks",
            data: hooks.map((h: any) => ({
                type: h.hook_type,
                text: h.hook_text,
                whyItWorks: h.why_it_worked,
                template: h.adaptable_template,
            })),
        });
    }

    // Audience
    if (audience) {
        sections.push({
            title: "Audience Mirror",
            type: "audience",
            data: {
                sentiment: audience.sentiment,
                topQuestions: audience.top_questions,
                objections: audience.objections,
                productRequests: audience.product_requests,
                segments: audience.audience_segments,
            },
        });
    }

    // Trends
    if (trends) {
        sections.push({
            title: "Trend Radar",
            type: "trends",
            data: {
                rising: trends.rising_topics,
                dying: trends.dying_topics,
                hashtags: trends.trending_hashtags,
                prediction: trends.prediction,
            },
        });
    }

    return NextResponse.json({
        username: clean,
        generatedAt: now,
        sections,
        sectionCount: sections.length,
    });
}
