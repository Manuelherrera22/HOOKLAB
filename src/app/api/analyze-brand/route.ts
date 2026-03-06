import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
    const { url } = await req.json();
    if (!url) {
        return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    // Fetch and extract page content
    let pageContent = "";
    let pageTitle = "";
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; HookLabBot/1.0)" },
            signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        pageTitle = titleMatch ? titleMatch[1].trim() : "";

        // Extract meta description
        const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
        const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i);
        const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i);

        // Extract visible text (strip HTML, limit to first 3000 chars)
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 3000);

        pageContent = [
            `TITLE: ${pageTitle}`,
            metaDesc ? `META DESC: ${metaDesc[1]}` : "",
            ogDesc ? `OG DESC: ${ogDesc[1]}` : "",
            ogImage ? `OG IMAGE: ${ogImage[1]}` : "",
            `CONTENT: ${textContent}`,
        ].filter(Boolean).join("\n");
    } catch (e: any) {
        return NextResponse.json({ error: `Failed to fetch URL: ${e.message}` }, { status: 400 });
    }

    // Analyze with GPT
    const { text } = await generateText({
        model: openai("gpt-4o"),
        temperature: 0.5,
        maxTokens: 1500,
        prompt: `You are a brand strategist. Analyze this website/social profile and build a comprehensive brand profile.

URL: ${url}
PAGE CONTENT:
${pageContent}

Return a JSON object with:
{
  "brandName": "Name of the brand/company/person",
  "industry": "Industry or niche",
  "tagline": "Their tagline or main value proposition",
  "tone": "Brand voice: professional, casual, luxurious, edgy, friendly, etc.",
  "audience": "Target audience description",
  "keyMessages": ["Top 3-5 key messages or themes"],
  "visualStyle": "Describe their visual aesthetic: colors, mood, photography style",
  "colors": {
    "primary": "#hexcode",
    "secondary": "#hexcode",
    "accent": "#hexcode"
  },
  "contentThemes": ["Types of content they create or should create"],
  "competitiveEdge": "What makes them unique",
  "suggestedVideoTopics": ["5 video topic ideas tailored to this brand"],
  "suggestedVideoStyle": "Best video style for this brand (educational, testimonial, lifestyle, etc.)"
}

Return ONLY valid JSON.`,
    });

    try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const result = JSON.parse(cleaned);
        return NextResponse.json({ success: true, brand: result, url, pageTitle });
    } catch {
        return NextResponse.json({ error: "Parse error", raw: text }, { status: 500 });
    }
}
