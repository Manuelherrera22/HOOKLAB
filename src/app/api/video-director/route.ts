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
    const {
        topic,
        platform = "tiktok",
        style = "educativo",
        duration = "30-60s",
        username,
        brandContext,
    } = await req.json();

    if (!topic) {
        return NextResponse.json({ error: "topic required" }, { status: 400 });
    }

    const clean = (username || "").replace("@", "").trim();

    // ═══ GATHER INTELLIGENCE ═══
    let intelContext = "";
    let viralPatterns = "";
    if (clean) {
        const [profileRes, hooksRes, audienceRes, trendRes, contentRes] = await Promise.all([
            supabase.from("profile_analyses").select("profile_summary, buyer_persona").eq("username", clean).eq("analysis_type", "lead_profile").order("created_at", { ascending: false }).limit(1),
            supabase.from("hook_analyses").select("hook_type, hook_text, why_it_worked, engagement_score").eq("username", clean).order("engagement_score", { ascending: false }).limit(10),
            supabase.from("audience_insights").select("sentiment, top_questions, objections, audience_segments").eq("username", clean).order("created_at", { ascending: false }).limit(1),
            supabase.from("trend_snapshots").select("rising_topics, trending_hashtags, prediction").eq("niche", clean).order("created_at", { ascending: false }).limit(1),
            supabase.from("content_analyses").select("content_type, engagement_rate, visual_analysis, audio_analysis, caption_analysis").eq("username", clean).order("engagement_rate", { ascending: false }).limit(5),
        ]);

        const profile = profileRes.data?.[0];
        const hooks = hooksRes.data || [];
        const audience = audienceRes.data?.[0];
        const trends = trendRes.data?.[0];
        const topContent = contentRes.data || [];

        if (profile) intelContext += `\nPERFIL: ${JSON.stringify(profile.profile_summary || {})}`;
        if (hooks.length) {
            viralPatterns = hooks.map(h => `[${h.hook_type}] "${h.hook_text}" (engagement: ${h.engagement_score || 'high'}) — ${h.why_it_worked || ''}`).join("\n");
            intelContext += `\nPATRONES VIRALES:\n${viralPatterns}`;
        }
        if (audience) intelContext += `\nAUDIENCIA: Sentimiento=${audience.sentiment}, Preguntas=${JSON.stringify(audience.top_questions)}, Objeciones=${JSON.stringify(audience.objections)}, Segmentos=${JSON.stringify(audience.audience_segments)}`;
        if (trends) intelContext += `\nTENDENCIAS: Rising=${JSON.stringify(trends.rising_topics)}, Hashtags=${JSON.stringify(trends.trending_hashtags)}`;
        if (topContent.length) intelContext += `\nCONTENIDO MÁS VIRAL: ${topContent.map(c => `[${c.content_type}] engagement:${c.engagement_rate}% visual:${c.visual_analysis?.slice(0, 100) || 'N/A'}`).join("; ")}`;
    }

    // ═══ AI DIRECTOR: Generate 3 optimized options ═══
    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.9,
        maxTokens: 4000,
        prompt: `You are an elite AI Video Director for social media. Based on intelligence data and viral patterns, generate 3 video concepts ranked by predicted impact.

TOPIC: "${topic}"
PLATFORM: ${platform}
STYLE: ${style}
DURATION: ${duration}
${brandContext ? `BRAND CONTEXT: ${JSON.stringify(brandContext)}` : ""}
${intelContext ? `\n═══ INTELLIGENCE DATA ═══${intelContext}` : ""}

For each concept, generate:
1. An optimized video prompt (for AI video generation - describe VISUALS only, like a cinematographer)
2. A first-frame image prompt (for AI image generation - describe ONE still frame that would be the perfect opening shot)
3. A quality/impact score prediction (1-100) based on how well it matches viral patterns
4. Why this concept will work (based on data)

Return JSON:
{
  "concepts": [
    {
      "id": 1,
      "title": "Concept name",
      "videoPrompt": "Cinematic description of the video: what happens visually, camera movements, lighting, colors, transitions. Be specific and visual. No dialogue.",
      "imagePrompt": "Detailed description of the opening still frame: composition, subject, lighting, colors, mood. Photorealistic style.",
      "thumbnailPrompt": "Thumbnail/cover image description for social media",
      "qualityScore": 85,
      "impactReason": "Why this will perform well based on the data",
      "mood": "dramatic|energetic|calm|inspirational|edgy|luxurious",
      "cameraStyle": "close-up|wide|tracking|aerial|POV|split-screen",
      "lightingStyle": "dramatic|natural|neon|golden-hour|studio|moody-blue",
      "suggestedMode": "text-to-video|image-to-video",
      "hashtags": ["5 optimized hashtags"],
      "bestPostingTime": "Optimal time to post"
    }
  ],
  "directorNotes": "Overall strategy recommendation",
  "dataInsightsUsed": ["List of intel points that informed these concepts"]
}

Rules:
- Rank concepts by predicted quality/impact score
- Video prompts must be CINEMATIC and VISUAL (no dialogue, just visuals)
- Image prompts must be photorealistic and detailed
- Quality score should reflect real viral potential based on patterns
- If no intelligence data, base scores on general platform best practices
- All text in Spanish except technical terms
- Be bold and creative — the goal is videos that IMPACT

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const result = JSON.parse(cleaned);
        return NextResponse.json({ success: true, ...result });
    } catch {
        return NextResponse.json({ error: "Parse error", raw: text }, { status: 500 });
    }
}
