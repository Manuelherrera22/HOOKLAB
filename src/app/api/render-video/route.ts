import { NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 300;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN || "",
});

// Top-tier model configurations
const MODELS: Record<string, { id: string; inputFn: (prompt: string, platform: string, imageUrl?: string) => any }> = {
    "kling-v3": {
        id: "kwaivgi/kling-v3-video",
        inputFn: (prompt, platform) => ({
            prompt,
            duration: 5,
            aspect_ratio: platform === "youtube" ? "16:9" : "9:16",
            cfg_scale: 0.5,
        }),
    },
    "wan-2.1": {
        id: "wan-video/wan-2.1-t2v-14b",
        inputFn: (prompt, platform) => ({
            prompt,
            num_frames: 81,
            resolution: platform === "youtube" ? "832x480" : "480x832",
        }),
    },
    "minimax-live": {
        id: "minimax/video-01-live",
        inputFn: (prompt, _platform, imageUrl) => ({
            prompt,
            prompt_optimizer: true,
            ...(imageUrl ? { first_frame_image: imageUrl } : {}),
        }),
    },
    "minimax": {
        id: "minimax/video-01",
        inputFn: (prompt) => ({
            prompt,
            prompt_optimizer: true,
        }),
    },
};

export async function POST(req: Request) {
    const { prompt, platform = "tiktok", mode = "text", imageUrl, model = "kling-v3" } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
        return NextResponse.json({
            error: "REPLICATE_API_TOKEN not configured",
        }, { status: 400 });
    }

    const platformEnhance: Record<string, string> = {
        tiktok: "vertical format 9:16, dynamic fast-paced, vibrant, TikTok aesthetic, cinematic quality",
        reels: "vertical format 9:16, polished, Instagram aesthetic, smooth cinematic transitions",
        shorts: "vertical format 9:16, professional, clean, YouTube Shorts style, high production",
        youtube: "horizontal format 16:9, cinematic widescreen, high production value, professional lighting",
        stories: "vertical format 9:16, authentic style, intimate feel, Instagram Stories",
    };

    const fullPrompt = `${prompt}. ${platformEnhance[platform] || platformEnhance.tiktok}. Ultra high quality, 4K cinematic, professional production, photorealistic.`;

    // Select model
    let selectedModel = model;
    if (mode === "image" && imageUrl) {
        selectedModel = "minimax-live"; // Only minimax-live supports first_frame_image
    }
    const modelConfig = MODELS[selectedModel] || MODELS["kling-v3"];

    try {
        const prediction = await replicate.predictions.create({
            model: modelConfig.id,
            input: modelConfig.inputFn(fullPrompt, platform, imageUrl),
        });

        return NextResponse.json({
            success: true,
            predictionId: prediction.id,
            status: prediction.status,
            prompt: fullPrompt,
            platform,
            mode,
            model: modelConfig.id,
        });
    } catch (error: any) {
        console.error(`Video generation error (${selectedModel}):`, error);

        // Fallback: try next best model
        const fallbackOrder = ["kling-v3", "wan-2.1", "minimax"];
        for (const fallback of fallbackOrder) {
            if (fallback === selectedModel) continue;
            try {
                const fbConfig = MODELS[fallback];
                const prediction = await replicate.predictions.create({
                    model: fbConfig.id,
                    input: fbConfig.inputFn(fullPrompt, platform),
                });
                return NextResponse.json({
                    success: true,
                    predictionId: prediction.id,
                    status: prediction.status,
                    prompt: fullPrompt,
                    platform,
                    mode,
                    model: `${fbConfig.id} (fallback)`,
                });
            } catch { continue; }
        }

        return NextResponse.json({
            error: `Video generation failed: ${error.message}`,
        }, { status: 500 });
    }
}

// GET: Poll prediction status
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get("id");

    if (!predictionId) {
        return NextResponse.json({ error: "prediction id required" }, { status: 400 });
    }

    try {
        const prediction = await replicate.predictions.get(predictionId);

        let videoUrl = null;
        if (prediction.status === "succeeded" && prediction.output) {
            videoUrl = typeof prediction.output === "string"
                ? prediction.output
                : (prediction.output as any)?.url || (prediction.output as any)?.[0] || prediction.output;
        }

        return NextResponse.json({
            status: prediction.status,
            videoUrl,
            error: prediction.error,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
