import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export const maxDuration = 60;

async function fetchAccountStats(username: string) {
    const clean = username.replace("@", "").trim();

    const [profileRes, hooksRes, videosRes] = await Promise.all([
        supabase.from("profile_analyses").select("profile_summary, content_patterns")
            .eq("username", clean).eq("analysis_type", "lead_profile").order("created_at", { ascending: false }).limit(1),
        supabase.from("hook_analyses").select("hook_type, hook_text, views, likes")
            .eq("username", clean).order("created_at", { ascending: false }).limit(5),
        supabase.from("scraped_videos").select("views, likes, comments")
            .eq("username", clean).order("views", { ascending: false }).limit(20),
    ]);

    const profile = profileRes.data?.[0];
    const hooks = hooksRes.data || [];
    const videos = videosRes.data || [];

    const totalViews = videos.reduce((s: number, v: any) => s + (v.views || 0), 0);
    const totalLikes = videos.reduce((s: number, v: any) => s + (v.likes || 0), 0);
    const totalComments = videos.reduce((s: number, v: any) => s + (v.comments || 0), 0);
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;

    return {
        username: clean,
        videoCount: videos.length,
        totalViews,
        totalLikes,
        totalComments,
        avgViews,
        engagementRate: totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : "0",
        niche: profile?.profile_summary?.niche || "Unknown",
        hookTypes: hooks.map((h: any) => h.hook_type),
        topHook: hooks[0]?.hook_text || null,
    };
}

export async function POST(req: Request) {
    const { usernames } = await req.json();
    if (!usernames || !Array.isArray(usernames) || usernames.length < 2) {
        return NextResponse.json({ error: "At least 2 usernames required" }, { status: 400 });
    }

    const limited = usernames.slice(0, 4);
    const accounts = await Promise.all(limited.map(fetchAccountStats));

    // GPT comparison
    const statsStr = accounts.map(a =>
        `@${a.username}: ${a.videoCount} videos, ${a.totalViews} views, ${a.totalLikes} likes, engagement ${a.engagementRate}%, avg ${a.avgViews} views/video, niche: ${a.niche}, top hook: "${a.topHook}"`
    ).join("\n");

    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.7,
        maxTokens: 2048,
        prompt: `You are a competitive analyst for TikTok content creators.

Compare these accounts:
${statsStr}

Provide your analysis in JSON:
{
  "winner": "username with best overall performance",
  "insights": [
    { "category": "Views", "leader": "username", "analysis": "why they lead" },
    { "category": "Engagement", "leader": "username", "analysis": "why" },
    { "category": "Hook Strategy", "leader": "username", "analysis": "based on hooks" },
    { "category": "Content Gaps", "leader": "username", "analysis": "who covers topics others miss" }
  ],
  "opportunities": ["3 specific things the weakest account can do to catch up"],
  "recommendation": "1-paragraph strategic recommendation for the first account"
}

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const analysis = JSON.parse(cleaned);
        return NextResponse.json({ accounts, analysis });
    } catch {
        return NextResponse.json({ accounts, analysis: null, raw: text });
    }
}
