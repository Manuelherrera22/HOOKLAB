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
        username,
        topic,
        platform = "tiktok",
        style = "educativo",
        duration = "30-60s",
        hook,
    } = await req.json();

    if (!topic) {
        return NextResponse.json({ error: "topic required" }, { status: 400 });
    }

    const clean = (username || "").replace("@", "").trim();

    // Fetch intelligence context
    let intelContext = "";
    if (clean) {
        const [profileRes, hooksRes, audienceRes, trendRes] = await Promise.all([
            supabase.from("profile_analyses").select("profile_summary, buyer_persona").eq("username", clean).eq("analysis_type", "lead_profile").order("created_at", { ascending: false }).limit(1),
            supabase.from("hook_analyses").select("hook_type, hook_text, why_it_worked").eq("username", clean).order("created_at", { ascending: false }).limit(5),
            supabase.from("audience_insights").select("sentiment, top_questions, objections, audience_segments").eq("username", clean).order("created_at", { ascending: false }).limit(1),
            supabase.from("trend_snapshots").select("rising_topics, trending_hashtags, prediction").eq("niche", clean).order("created_at", { ascending: false }).limit(1),
        ]);

        const profile = profileRes.data?.[0];
        const hooks = hooksRes.data || [];
        const audience = audienceRes.data?.[0];
        const trends = trendRes.data?.[0];

        if (profile) intelContext += `\nPERFIL: ${JSON.stringify(profile.profile_summary || {})}\nBUYER PERSONA: ${JSON.stringify(profile.buyer_persona || {})}`;
        if (hooks.length) intelContext += `\nHOOKS QUE FUNCIONAN: ${hooks.map(h => `[${h.hook_type}] "${h.hook_text}"`).join("; ")}`;
        if (audience) intelContext += `\nAUDIENCIA: Sentimiento=${audience.sentiment}, Preguntas frecuentes=${JSON.stringify(audience.top_questions)}, Objeciones=${JSON.stringify(audience.objections)}`;
        if (trends) intelContext += `\nTENDENCIAS: Rising=${JSON.stringify(trends.rising_topics)}, Hashtags=${JSON.stringify(trends.trending_hashtags)}`;
    }

    const platformSpecs: Record<string, string> = {
        tiktok: "TikTok vertical video (9:16). Fast-paced, text overlays, trending sounds. Hook in first 1.5s. Max 60s. Pattern interrupts every 3-5s.",
        reels: "Instagram Reels vertical (9:16). Visually polished, aesthetic. Caption-heavy. 15-30s ideal. Use story arcs.",
        shorts: "YouTube Shorts vertical (9:16). Value-dense, educational feel. Strong hook. 30-60s. End with 'subscribe' CTA.",
        youtube: "YouTube horizontal (16:9). Long-form 3-10 min. Cold open hook, intro, 3-5 sections, CTA. Higher production value.",
        stories: "Instagram Stories (9:16). Casual, behind-the-scenes feel. Multiple 15s segments. Interactive elements (polls, questions).",
    };

    const styleDescriptions: Record<string, string> = {
        educativo: "Educational: teach something valuable, use data/facts, position as expert",
        storytelling: "Storytelling: personal narrative, emotional arc, relatable situation",
        controversial: "Controversial: hot take, challenge conventional wisdom, create debate",
        tutorial: "Tutorial: step-by-step walkthrough, show process, actionable advice",
        lifestyle: "Lifestyle: day-in-life, aesthetic shots, aspirational content",
        humor: "Humor: meme-style, relatable jokes, exaggeration for effect",
        testimonial: "Testimonial: social proof, before/after, result showcase",
    };

    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.8,
        maxTokens: 3000,
        prompt: `You are an elite content producer for social media. Create a COMPLETE video production script.

PLATFORM: ${platform} — ${platformSpecs[platform] || platformSpecs.tiktok}
STYLE: ${style} — ${styleDescriptions[style] || styleDescriptions.educativo}
TOPIC: "${topic}"
DURATION: ${duration}
${hook ? `PREFERRED HOOK: "${hook}"` : ""}
${intelContext ? `\n--- INTELLIGENCE DATA ---${intelContext}` : ""}

Generate a complete video script in JSON format:
{
  "title": "Video title for internal reference",
  "platform": "${platform}",
  "estimatedDuration": "30s",
  "hook": {
    "text": "Exact words to say in first 3 seconds",
    "visual": "What appears on screen",
    "audio": "Sound/music cue",
    "textOverlay": "Text shown on screen"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "duration": "5s",
      "script": "Exact words to say",
      "visual": "Camera angle, what's shown, transitions",
      "textOverlay": "Text on screen if any",
      "audio": "Music/sound effects",
      "direction": "Performance notes (energy, tone, pace)"
    }
  ],
  "cta": {
    "text": "Call to action words",
    "visual": "Visual CTA element",
    "type": "follow|comment|share|link|subscribe"
  },
  "caption": "Full post caption with emojis (max 300 chars)",
  "hashtags": ["8-12 relevant hashtags"],
  "bestPostTime": "Optimal posting time",
  "thumbnailIdea": "Thumbnail description for the video",
  "musicSuggestion": "Trending or fitting sound/song",
  "equipmentNeeded": ["camera/phone", "ring light", "tripod", etc.],
  "editingNotes": "Post-production notes (transitions, effects, color grading)"
}

Rules:
- EVERYTHING in Spanish (except technical terms)
- Script must feel natural, not robotic
- Include pattern interrupts for retention
- Match the platform's native style exactly
- Use proven hooks from intelligence data if available
- Address audience pain points and objections from intel

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const result = JSON.parse(cleaned);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json({ error: "Parse error", raw: text }, { status: 500 });
    }
}
