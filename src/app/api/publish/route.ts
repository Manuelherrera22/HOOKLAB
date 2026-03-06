import { NextResponse } from "next/server";

export const maxDuration = 60;

// Ayrshare API — simplest REST API for social publishing
const AYRSHARE_API = "https://api.ayrshare.com/api";

async function ayrsharePost(apiKey: string, body: any) {
    const res = await fetch(`${AYRSHARE_API}/post`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function ayrshareGetProfiles(apiKey: string) {
    const res = await fetch(`${AYRSHARE_API}/profiles`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
    });
    return res.json();
}

async function ayrshareDeletePost(apiKey: string, postId: string) {
    const res = await fetch(`${AYRSHARE_API}/post`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: postId }),
    });
    return res.json();
}

// POST: Publish or schedule a post
export async function POST(req: Request) {
    const {
        caption,
        platforms = ["instagram"],
        mediaUrls = [],
        scheduledDate,
        apiKey,
    } = await req.json();

    const key = apiKey || process.env.AYRSHARE_API_KEY;
    if (!key) {
        return NextResponse.json({
            error: "No publishing API key configured",
            setup: "Get your free API key at https://app.ayrshare.com — Sign up, connect your social accounts, and copy your API key.",
        }, { status: 400 });
    }

    if (!caption) {
        return NextResponse.json({ error: "caption required" }, { status: 400 });
    }

    try {
        const body: any = {
            post: caption,
            platforms,
        };

        if (mediaUrls.length > 0) {
            body.mediaUrls = mediaUrls;
        }

        // Schedule for later
        if (scheduledDate) {
            body.scheduleDate = scheduledDate; // ISO 8601 format
        }

        const result = await ayrsharePost(key, body);

        if (result.status === "error") {
            return NextResponse.json({ error: result.message || "Publishing failed", details: result }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            id: result.id,
            postIds: result.postIds,
            status: scheduledDate ? "scheduled" : "published",
            platforms,
            scheduledDate: scheduledDate || null,
        });
    } catch (error: any) {
        console.error("Publishing error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET: Get connected profiles
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey") || process.env.AYRSHARE_API_KEY;

    if (!apiKey) {
        return NextResponse.json({
            error: "No API key",
            setup: "Get your free API key at https://app.ayrshare.com",
        }, { status: 400 });
    }

    try {
        const profiles = await ayrshareGetProfiles(apiKey);
        return NextResponse.json({ success: true, profiles });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a published post
export async function DELETE(req: Request) {
    const { postId, apiKey } = await req.json();
    const key = apiKey || process.env.AYRSHARE_API_KEY;

    if (!key || !postId) {
        return NextResponse.json({ error: "apiKey and postId required" }, { status: 400 });
    }

    try {
        const result = await ayrshareDeletePost(key, postId);
        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
