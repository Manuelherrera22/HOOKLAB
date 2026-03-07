import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { driveUrl, platform, tone, language } = await req.json();

        if (!driveUrl) {
            return NextResponse.json({ error: "driveUrl is required" }, { status: 400 });
        }

        // Try to extract file info from Google Drive URL
        let fileInfo = "";
        let fileType = "unknown";

        // Detect file type from URL
        const url = driveUrl.toLowerCase();
        if (url.includes("drive.google.com")) {
            // Extract file ID from various Drive URL formats
            const patterns = [
                /\/d\/([a-zA-Z0-9_-]+)/,
                /id=([a-zA-Z0-9_-]+)/,
                /\/file\/d\/([a-zA-Z0-9_-]+)/,
            ];
            let fileId = "";
            for (const pattern of patterns) {
                const match = driveUrl.match(pattern);
                if (match) { fileId = match[1]; break; }
            }

            if (fileId) {
                // Try to fetch file metadata via public API
                try {
                    const metaRes = await fetch(
                        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,description&key=${process.env.GOOGLE_API_KEY || ""}`,
                        { next: { revalidate: 0 } }
                    );
                    if (metaRes.ok) {
                        const meta = await metaRes.json();
                        fileInfo = `File: ${meta.name || "unknown"}\nType: ${meta.mimeType || "unknown"}`;
                        if (meta.mimeType?.startsWith("video/")) fileType = "video";
                        else if (meta.mimeType?.startsWith("image/")) fileType = "image";
                        else if (meta.mimeType?.startsWith("audio/")) fileType = "audio";
                    }
                } catch {
                    // If API fails, try to infer from URL
                }
            }

            // Infer type from filename in URL
            if (fileType === "unknown") {
                if (url.match(/\.(mp4|mov|avi|webm|mkv)/)) fileType = "video";
                else if (url.match(/\.(jpg|jpeg|png|gif|webp)/)) fileType = "image";
                else if (url.match(/\.(mp3|wav|ogg|m4a|webm)/)) fileType = "audio";
                else fileType = "video"; // Default assumption for Drive content
            }
        } else {
            // Non-Drive URLs - infer from extension
            if (url.match(/\.(mp4|mov|avi|webm|mkv)/)) fileType = "video";
            else if (url.match(/\.(jpg|jpeg|png|gif|webp)/)) fileType = "image";
            else fileType = "content";
        }

        const platformGuides: Record<string, string> = {
            instagram: `Instagram Reels/Posts:
- Captions: max 2,200 chars, but first 125 chars are key (before "more")
- Use 5-15 relevant hashtags at the end
- Include a CTA (call to action)
- Use emojis to break text
- Add line breaks for readability
- Include @mentions if relevant`,
            tiktok: `TikTok:
- Captions: max 4,000 chars (keep under 300 for best engagement)
- 3-5 hashtags, mix trending + niche
- Hook in the first line
- Use trending sounds references
- Keep it casual and direct
- End with a question or CTA`,
            youtube: `YouTube Shorts/Videos:
- Title: under 70 chars, keyword-rich
- Description: first 2 lines visible, include keywords
- 3-5 hashtags (first 3 show above title)
- Include timestamps if longer content
- End with subscribe CTA`,
            facebook: `Facebook:
- Shorter posts perform better (40-80 chars ideal)
- Ask questions to drive comments
- Use 1-3 hashtags max
- Tag relevant pages
- Include clear CTA`,
            twitter: `Twitter/X:
- Max 280 chars
- 1-2 hashtags
- Direct and punchy
- Thread format for longer content
- Include a hook in first tweet`,
            linkedin: `LinkedIn:
- Professional tone
- First 3 lines visible before "see more"
- Use line breaks and bullets
- 3-5 industry hashtags
- Share insights and takeaways`,
        };

        const platformContext = platform
            ? platformGuides[platform] || platformGuides["instagram"]
            : Object.values(platformGuides).join("\n\n");

        const { text } = await generateText({
            model: openai("gpt-4o"),
            temperature: 0.8,
            maxTokens: 1500,
            system: `You are an elite social media copywriter. You generate scroll-stopping, engagement-optimized captions for social media content.

RULES:
- Write in ${language || "Spanish"} unless specified otherwise
- Tone: ${tone || "professional but engaging, with personality"}
- Always include relevant emojis
- Always include hashtags optimized for the platform
- Make the first line an attention-grabbing hook
- Include a clear CTA at the end
- Format for maximum readability (line breaks, bullets when needed)

${platformContext}`,
            prompt: `Generate an optimized social media caption for this content:

CONTENT TYPE: ${fileType}
CONTENT URL: ${driveUrl}
${fileInfo ? `FILE INFO: ${fileInfo}` : ""}
TARGET PLATFORM: ${platform || "all platforms"}

Generate the caption ready to copy-paste. Include appropriate hashtags and emojis.
If the content is a video, assume it's engaging visual content and write a caption that creates curiosity to watch it.
If the content is an image, write a caption that complements the visual.

Return ONLY the caption text, ready to use. No explanations or metadata.`,
        });

        return NextResponse.json({
            success: true,
            caption: text.trim(),
            fileType,
            platform: platform || "multi",
        });
    } catch (error: any) {
        console.error("Generate copy error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
