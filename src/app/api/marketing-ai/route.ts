import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { accountId, campaignType, platform, topic, tone, language } = await req.json();

        const [accountRes, knowledgeRes, refsRes, videosRes, hooksRes] = await Promise.all([
            supabase.from("accounts").select("*").eq("id", accountId).single(),
            supabase.from("knowledge_entries").select("title, content").eq("account_id", accountId),
            supabase.from("market_references").select("ref_name, username, platform, followers, likes, video_count").eq("account_id", accountId),
            supabase.from("scraped_videos").select("caption, views, likes, comments").eq("account_id", accountId).order("views", { ascending: false }).limit(10),
            supabase.from("hook_analyses").select("hook_type, hook_text, why_it_worked, engagement_score").order("engagement_score", { ascending: false }).limit(10),
        ]);

        const account = accountRes.data;
        const knowledge = knowledgeRes.data || [];
        const refs = refsRes.data || [];
        const topVideos = videosRes.data || [];
        const topHooks = hooksRes.data || [];

        const brandContext = `
BRAND DNA:
- Business: ${account?.name || "Unknown"} | Niche: ${account?.niche || "general"}
- TikTok: @${account?.own_tiktok || "N/A"} | Instagram: @${account?.own_instagram || "N/A"}
- Social Stats: ${JSON.stringify(account?.own_social_data || {})}

KNOWLEDGE BASE:
${knowledge.map((k: any) => `- ${k.title}: ${k.content}`).join("\n")}

COMPETITOR REFERENCES:
${refs.map((r: any) => `- ${r.ref_name} (@${r.username}) — ${r.followers} followers, ${r.likes} likes`).join("\n")}

TOP PERFORMING CONTENT:
${topVideos.map((v: any) => `- "${(v.caption || "").slice(0, 100)}" → ${v.views} views, ${v.likes} likes`).join("\n")}

TOP HOOKS THAT WORK:
${topHooks.map((h: any) => `- [${h.hook_type}] "${h.hook_text}" — Score: ${h.engagement_score} — Why: ${h.why_it_worked}`).join("\n")}
        `.trim();

        const campaignPrompts: Record<string, string> = {
            social_post: `Generate 5 social media posts for ${platform || "TikTok/Instagram"}. Each post should include:
- hook (attention-grabbing first line)
- body (2-3 sentences)
- caption (with emojis and hashtags)
- call_to_action
- best_time (suggested posting time)
- content_type (carousel, reel, story, static)`,
            ad_copy: `Generate 3 ad copy variations for paid advertising on ${platform || "Instagram/Facebook"}. Each should include:
- headline (max 40 chars)
- primary_text (compelling ad copy)
- description (short supporting text)
- call_to_action_button (e.g. "Learn More", "Shop Now")
- target_audience (who this ad is for)
- hook_strategy (what psychological trigger it uses)`,
            content_calendar: `Generate a 7-day content calendar for ${platform || "TikTok"}. For each day provide:
- day (1-7)
- content_type (reel, carousel, story, live, static)
- topic
- hook
- caption (with hashtags)
- best_time
- objective (awareness, engagement, conversion)`,
            brand_story: `Generate 3 brand storytelling posts. Each should include:
- narrative_type (origin, transformation, behind_scenes, customer_story)
- hook
- story (3-5 paragraphs, personal and emotional)
- caption (with hashtags)
- visual_suggestion (what image/video would complement)`,
            hooks_pack: `Generate 10 viral hooks optimized for ${platform || "TikTok"}. Each should include:
- hook_text
- hook_type (shock, question, challenge, authority, curiosity, controversy)
- why_it_works
- example_caption
- predicted_engagement (low/medium/high/viral)`,
        };

        const systemPrompt = `You are an elite marketing AI similar to Google Pomelli. You analyze brand DNA and generate on-brand, high-converting marketing content.

RULES:
- Always match the brand's tone and niche
- Use data from top-performing content to inform strategy
- Include proven hook patterns from the hook analysis
- Write in ${language || "Spanish"} unless specified otherwise
- Tone: ${tone || "professional but engaging"}
- Topic focus: ${topic || "whatever fits the brand best"}
- Be specific and actionable — no generic advice
- Return ONLY valid JSON

${brandContext}`;

        const userPrompt = campaignPrompts[campaignType] || campaignPrompts.social_post;

        const { text } = await generateText({
            model: openai("gpt-4o"),
            temperature: 0.8,
            maxTokens: 3000,
            system: systemPrompt,
            prompt: userPrompt,
        });

        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const result = JSON.parse(cleaned);

        return NextResponse.json({ success: true, campaign: result, campaignType });
    } catch (error: any) {
        console.error("Marketing AI error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
