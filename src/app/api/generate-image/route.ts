import { NextResponse } from "next/server";
import Replicate from "replicate";

export const maxDuration = 120;

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function POST(req: Request) {
    const { prompt, aspectRatio = "9:16" } = await req.json();

    if (!prompt) {
        return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
        return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 400 });
    }

    try {
        // Try FLUX Schnell first (fast, cheap) then fall back to SDXL
        let imageUrl = "";

        try {
            const output = await replicate.run(
                "black-forest-labs/flux-schnell",
                {
                    input: {
                        prompt: prompt,
                        aspect_ratio: aspectRatio,
                        output_format: "jpg",
                        output_quality: 90,
                        num_outputs: 1,
                        go_fast: true,
                    },
                }
            );

            console.log("FLUX output:", typeof output, JSON.stringify(output).slice(0, 300));

            if (Array.isArray(output) && output.length > 0) {
                imageUrl = String(output[0]);
            } else if (typeof output === "string") {
                imageUrl = output;
            } else {
                imageUrl = String(output);
            }
        } catch (fluxError: any) {
            console.error("FLUX failed, trying SDXL:", fluxError.message);
            // Fallback to SDXL
            const output = await replicate.run(
                "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
                {
                    input: {
                        prompt: prompt,
                        width: aspectRatio === "16:9" ? 1344 : 768,
                        height: aspectRatio === "16:9" ? 768 : 1344,
                        num_outputs: 1,
                    },
                }
            );

            if (Array.isArray(output) && output.length > 0) {
                imageUrl = String(output[0]);
            } else if (typeof output === "string") {
                imageUrl = output;
            } else {
                imageUrl = String(output);
            }
        }

        if (!imageUrl || (!imageUrl.startsWith("http") && !imageUrl.startsWith("data:"))) {
            return NextResponse.json({ error: "Invalid image URL", debug: imageUrl.slice(0, 100) }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            imageUrl,
            prompt,
        });
    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json({
            error: `Image generation failed: ${error.message}`,
        }, { status: 500 });
    }
}
