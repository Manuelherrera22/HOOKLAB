import { NextResponse } from 'next/server';

interface ExtractedData {
    title: string;
    views: number;
    platform: 'youtube' | 'tiktok' | 'instagram' | 'other';
    thumbnail?: string;
    author?: string;
}

function detectPlatform(url: string): 'youtube' | 'tiktok' | 'instagram' | 'other' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    return 'other';
}

function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
        /(?:youtu\.be\/)([^?\s]+)/,
        /(?:youtube\.com\/shorts\/)([^?\s]+)/,
        /(?:youtube\.com\/embed\/)([^?\s]+)/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

async function extractYouTube(url: string): Promise<ExtractedData> {
    const videoId = extractYouTubeVideoId(url);

    // Fetch the page HTML to extract meta tags
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });
    const html = await response.text();

    // Extract title from <meta property="og:title">
    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)
        || html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown Video';

    // Extract view count from the page
    let views = 0;
    // Try interactionCount meta tag first
    const interactionMatch = html.match(/"interactionCount"\s*:\s*"?(\d+)"?/);
    if (interactionMatch) {
        views = parseInt(interactionMatch[1], 10);
    } else {
        // Try viewCount from ytInitialPlayerResponse
        const viewCountMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/);
        if (viewCountMatch) {
            views = parseInt(viewCountMatch[1], 10);
        }
    }

    // Extract author
    const authorMatch = html.match(/"ownerChannelName"\s*:\s*"([^"]+)"/)
        || html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : undefined;

    return {
        title,
        views,
        platform: 'youtube',
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
        author,
    };
}

async function extractTikTok(url: string): Promise<ExtractedData> {
    try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        const data = await response.json();

        // TikTok oEmbed gives title and author but not view count
        // Try to fetch the page for view count
        let views = 0;
        try {
            const pageRes = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });
            const html = await pageRes.text();
            const viewMatch = html.match(/"playCount"\s*:\s*(\d+)/)
                || html.match(/"statsV2"\s*:\s*\{[^}]*"playCount"\s*:\s*"?(\d+)"?/);
            if (viewMatch) {
                views = parseInt(viewMatch[1] || viewMatch[2], 10);
            }
        } catch {
            // Fallback: no view count available
        }

        return {
            title: data.title || 'TikTok Video',
            views,
            platform: 'tiktok',
            thumbnail: data.thumbnail_url,
            author: data.author_name,
        };
    } catch {
        return { title: 'TikTok Video', views: 0, platform: 'tiktok' };
    }
}

async function extractInstagram(url: string): Promise<ExtractedData> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        const html = await response.text();

        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        const title = titleMatch ? titleMatch[1] : 'Instagram Post';

        let views = 0;
        const viewMatch = html.match(/"video_view_count"\s*:\s*(\d+)/);
        if (viewMatch) {
            views = parseInt(viewMatch[1], 10);
        }

        return { title, views, platform: 'instagram' };
    } catch {
        return { title: 'Instagram Post', views: 0, platform: 'instagram' };
    }
}

async function extractGeneric(url: string): Promise<ExtractedData> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        const html = await response.text();

        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
            || html.match(/<title>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

        return { title, views: 0, platform: 'other' };
    } catch {
        return { title: new URL(url).hostname, views: 0, platform: 'other' };
    }
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const platform = detectPlatform(url);
        let data: ExtractedData;

        switch (platform) {
            case 'youtube':
                data = await extractYouTube(url);
                break;
            case 'tiktok':
                data = await extractTikTok(url);
                break;
            case 'instagram':
                data = await extractInstagram(url);
                break;
            default:
                data = await extractGeneric(url);
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('URL extraction error:', error);
        return NextResponse.json({ error: 'Failed to extract URL data' }, { status: 500 });
    }
}
