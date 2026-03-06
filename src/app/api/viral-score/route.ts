import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export const maxDuration = 30;

export async function POST(req: Request) {
    const { username, hookText, caption, format = "video", postTime } = await req.json();
    if (!hookText && !caption) {
        return NextResponse.json({ error: "hookText or caption required" }, { status: 400 });
    }

    const clean = (username || "").replace("@", "").trim();

    // Fetch benchmark data if username provided
    let benchmarkData = "";
    if (clean) {
        const [videosRes, hooksRes] = await Promise.all([
            supabase.from("scraped_videos").select("views, likes, comments, caption")
                .eq("username", clean).order("views", { ascending: false }).limit(10),
            supabase.from("hook_analyses").select("hook_type, hook_text, views, likes")
                .eq("username", clean).order("created_at", { ascending: false }).limit(5),
        ]);
        const videos = videosRes.data || [];
        const hooks = hooksRes.data || [];

        if (videos.length > 0) {
            const avgViews = Math.round(videos.reduce((s, v: any) => s + (v.views || 0), 0) / videos.length);
            const avgLikes = Math.round(videos.reduce((s, v: any) => s + (v.likes || 0), 0) / videos.length);
            benchmarkData += `\nBenchmark for @${clean}: avg ${avgViews} views, ${avgLikes} likes per video.\n`;
            benchmarkData += `Top videos: ${videos.slice(0, 3).map((v: any) => `"${(v.caption || "").slice(0, 60)}..." (${v.views} views)`).join("; ")}\n`;
        }
        if (hooks.length > 0) {
            benchmarkData += `Known winning hooks: ${hooks.map((h: any) => `[${h.hook_type}] "${h.hook_text}"`).join("; ")}\n`;
        }
    }

    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.5,
        maxTokens: 1024,
        prompt: `You are a viral content scoring AI for TikTok/Reels.

Score this content's predicted virality on a scale of 0-100:

HOOK: "${hookText || 'N/A'}"
CAPTION: "${caption || 'N/A'}"
FORMAT: ${format}
POST TIME: ${postTime || 'Not specified'}

${benchmarkData}

Respond in JSON:
{
  "score": number (0-100),
  "grade": "S" | "A" | "B" | "C" | "D" | "F",
  "breakdown": {
    "hookPower": { "score": number, "reason": "string" },
    "emotionalTrigger": { "score": number, "reason": "string" },
    "curiosityGap": { "score": number, "reason": "string" },
    "trendAlignment": { "score": number, "reason": "string" },
    "cta": { "score": number, "reason": "string" }
  },
  "suggestions": ["3 specific improvements to increase the score"],
  "predictedViews": "estimated range like '10K-50K'"
}

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return NextResponse.json(JSON.parse(cleaned));
    } catch {
        return NextResponse.json({ error: "Parse error", raw: text }, { status: 500 });
    }
}
