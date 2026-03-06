import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export const maxDuration = 60;

export async function POST(req: Request) {
    const { username, niche = "trading/finanzas" } = await req.json();
    if (!username) {
        return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    const clean = username.replace("@", "").trim();

    // Fetch existing intelligence
    const [hookRes, trendRes, audienceRes] = await Promise.all([
        supabase.from("hook_analyses").select("hook_type, hook_text, adaptable_template")
            .eq("username", clean).order("created_at", { ascending: false }).limit(10),
        supabase.from("trend_snapshots").select("rising_topics, dying_topics, trending_hashtags, prediction")
            .eq("niche", clean).order("created_at", { ascending: false }).limit(1),
        supabase.from("audience_insights").select("top_questions, objections, product_requests")
            .eq("username", clean).order("created_at", { ascending: false }).limit(1),
    ]);

    const hooks = hookRes.data || [];
    const trends = trendRes.data?.[0];
    const audience = audienceRes.data?.[0];

    let context = `Niche: ${niche}\n`;
    if (hooks.length) {
        context += `\nProven hooks:\n${hooks.map((h: any, i: number) => `${i + 1}. [${h.hook_type}] "${h.hook_text}"`).join("\n")}`;
    }
    if (trends) {
        if (trends.rising_topics?.length) context += `\nRising topics: ${trends.rising_topics.join(", ")}`;
        if (trends.dying_topics?.length) context += `\nDying topics (AVOID): ${trends.dying_topics.join(", ")}`;
        if (trends.trending_hashtags?.length) context += `\nTrending hashtags: ${trends.trending_hashtags.map((h: any) => h.tag || h).join(", ")}`;
    }
    if (audience) {
        if (audience.top_questions?.length) context += `\nAudience questions: ${audience.top_questions.join("; ")}`;
        if (audience.product_requests?.length) context += `\nProducts they want: ${audience.product_requests.join("; ")}`;
    }

    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.85,
        maxTokens: 4096,
        prompt: `You are a TikTok/Reels content strategist for the ${niche} niche.

Based on this intelligence:
${context}

Generate a 30-day content calendar in JSON format. Each day should have:
- day: number (1-30)
- weekday: string (Lun/Mar/Mie/Jue/Vie/Sab/Dom, rotating)
- topic: string (specific topic for the video, max 60 chars)
- hookType: string (shock/question/challenge/controversy/authority/curiosity)
- caption: string (ready-to-post caption with emojis, max 200 chars)
- hashtags: string[] (3-5 relevant hashtags)  
- bestTime: string (optimal posting time like "7:00 PM")
- format: string (tutorial/storytime/duet/greenscreen/trending)

Rules:
- Use RISING topics frequently, NEVER use dying topics
- Address audience questions and objections in topics
- Mix hook types evenly across the month
- Include 2-3 "series" (parts 1, 2, 3) for engagement
- Weekend content should be lighter/more entertaining
- Best times should vary between 7AM, 12PM, 5PM, 7PM, 9PM

Return ONLY valid JSON: { "days": [...] }`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const calendar = JSON.parse(cleaned);
        return NextResponse.json(calendar);
    } catch {
        return NextResponse.json({ error: "Failed to parse calendar", raw: text }, { status: 500 });
    }
}
