import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export const maxDuration = 30;

export async function POST(req: Request) {
    const { username, topic, niche = "trading/finanzas" } = await req.json();
    if (!topic) {
        return NextResponse.json({ error: "topic required" }, { status: 400 });
    }

    const clean = (username || "").replace("@", "").trim();

    // Fetch known hook patterns
    let hookContext = "";
    if (clean) {
        const { data: hooks } = await supabase
            .from("hook_analyses").select("hook_type, hook_text, adaptable_template, views, likes")
            .eq("username", clean).order("created_at", { ascending: false }).limit(8);

        if (hooks?.length) {
            hookContext = `\nProven hooks in this niche:\n${hooks.map((h: any) =>
                `[${h.hook_type}] "${h.hook_text}" (${h.views || 0} views) → template: ${h.adaptable_template}`
            ).join("\n")}`;
        }
    }

    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.9,
        maxTokens: 2048,
        prompt: `You are an elite TikTok hook engineer for the ${niche} niche.

Topic: "${topic}"
${hookContext}

Generate exactly 5 different hook variations for this topic. Each should use a DIFFERENT strategy.
Rank them from highest to lowest predicted engagement.

Return JSON:
{
  "hooks": [
    {
      "rank": 1,
      "hookType": "shock|question|challenge|controversy|authority|curiosity",
      "text": "the hook text (first 3 seconds script)",
      "caption": "full caption with emojis (max 200 chars)",
      "predictedScore": number (60-98),
      "whyItWorks": "1 sentence explanation",
      "template": "reusable template version"
    }
  ]
}

Rules:
- Rank 1 = highest predicted engagement
- Use different hook types for each variation
- Make each hook feel completely different in tone and approach
- All in Spanish

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return NextResponse.json(JSON.parse(cleaned));
    } catch {
        return NextResponse.json({ error: "Parse error", raw: text }, { status: 500 });
    }
}
