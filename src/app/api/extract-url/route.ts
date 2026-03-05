import { NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

interface ExtractedData {
    title: string;
    views: number;
    platform: 'youtube' | 'tiktok' | 'instagram' | 'other';
    thumbnail?: string;
    author?: string;
    followers?: number;
    likes?: number;
    videoCount?: number;
    isProfile?: boolean;
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

// ===== YOUTUBE =====
async function extractYouTube(url: string): Promise<ExtractedData> {
    const videoId = extractYouTubeVideoId(url);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });
    const html = await response.text();

    const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)
        || html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'Unknown Video';

    let views = 0;
    const interactionMatch = html.match(/"interactionCount"\s*:\s*"?(\d+)"?/);
    if (interactionMatch) {
        views = parseInt(interactionMatch[1], 10);
    } else {
        const viewCountMatch = html.match(/"viewCount"\s*:\s*"(\d+)"/);
        if (viewCountMatch) views = parseInt(viewCountMatch[1], 10);
    }

    const authorMatch = html.match(/"ownerChannelName"\s*:\s*"([^"]+)"/)
        || html.match(/<link\s+itemprop="name"\s+content="([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : undefined;

    return {
        title, views, platform: 'youtube',
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined,
        author,
    };
}

// ===== TIKTOK (RapidAPI) =====
function extractTikTokUsername(url: string): string | null {
    const match = url.match(/tiktok\.com\/@([^/?]+)/);
    return match ? match[1] : null;
}

function isTikTokVideoUrl(url: string): boolean {
    return /tiktok\.com\/@[^/]+\/video\/\d+/.test(url) || /vm\.tiktok\.com/.test(url);
}

async function extractTikTokProfile(username: string): Promise<ExtractedData> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`, {
            headers: {
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                'x-rapidapi-key': RAPIDAPI_KEY,
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await res.json();

        if (data.userInfo) {
            const user = data.userInfo.user;
            const stats = data.userInfo.stats;
            return {
                title: user?.nickname || username,
                author: `@${user?.uniqueId || username}`,
                platform: 'tiktok',
                views: stats?.heartCount > 0 ? stats.heartCount : (stats?.heart || 0),
                followers: stats?.followerCount || 0,
                likes: stats?.heart || 0,
                videoCount: stats?.videoCount || 0,
                thumbnail: user?.avatarLarger || user?.avatarMedium,
                isProfile: true,
            };
        }
    } catch (error) {
        clearTimeout(timeout);
        console.error('TikTok profile fetch timed out or failed:', error);
    }

    return { title: username, views: 0, platform: 'tiktok', author: `@${username}` };
}

async function extractTikTokVideo(url: string): Promise<ExtractedData> {
    // Try oEmbed first for video-specific data
    try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
        const oembed = await oembedRes.json();

        // Also try the username for more stats
        const username = extractTikTokUsername(url);
        let profileStats = {};
        if (username) {
            try {
                const profile = await extractTikTokProfile(username);
                profileStats = { followers: profile.followers, likes: profile.likes, videoCount: profile.videoCount };
            } catch { /* ignore */ }
        }

        return {
            title: oembed.title || 'TikTok Video',
            author: oembed.author_name ? `@${oembed.author_name}` : undefined,
            platform: 'tiktok',
            views: 0, // oEmbed doesn't give views for individual videos
            thumbnail: oembed.thumbnail_url,
            ...profileStats,
        };
    } catch {
        return { title: 'TikTok Video', views: 0, platform: 'tiktok' };
    }
}

async function extractTikTok(url: string): Promise<ExtractedData> {
    const username = extractTikTokUsername(url);

    if (username && !isTikTokVideoUrl(url)) {
        // It's a profile URL like tiktok.com/@username
        return extractTikTokProfile(username);
    } else if (isTikTokVideoUrl(url)) {
        return extractTikTokVideo(url);
    } else if (username) {
        return extractTikTokProfile(username);
    }

    return { title: 'TikTok', views: 0, platform: 'tiktok' };
}

// ===== INSTAGRAM (RapidAPI) =====
function extractInstagramUsername(url: string): string | null {
    // Match instagram.com/username or instagram.com/username/
    const match = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?(?:\?|$|\/(?:p|reel|reels)?)/);
    if (match && !['p', 'reel', 'reels', 'stories', 'explore'].includes(match[1])) {
        return match[1];
    }
    // Also try simple profile URL
    const simpleMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/);
    return simpleMatch ? simpleMatch[1] : null;
}

async function extractInstagram(url: string): Promise<ExtractedData> {
    const username = extractInstagramUsername(url);

    if (username) {
        try {
            // Get posts to calculate total engagement
            const res = await fetch('https://instagram120.p.rapidapi.com/api/instagram/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'instagram120.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
                body: JSON.stringify({ username, maxId: '' }),
            });
            const data = await res.json();

            const edges = data?.result?.edges || data?.items || [];
            let totalLikes = 0;
            let totalComments = 0;
            let totalViews = 0;
            let postCount = 0;

            for (const edge of edges) {
                const node = edge?.node || edge;
                totalLikes += node?.like_count || node?.edge_media_preview_like?.count || 0;
                totalComments += node?.comment_count || node?.edge_media_to_comment?.count || 0;
                totalViews += node?.video_view_count || node?.view_count || 0;
                postCount++;
            }

            const firstPost = edges[0]?.node || edges[0];
            const profilePic = firstPost?.owner?.profile_pic_url;

            return {
                title: `@${username}`,
                author: `@${username}`,
                platform: 'instagram',
                views: totalViews > 0 ? totalViews : totalLikes,
                likes: totalLikes,
                videoCount: postCount,
                thumbnail: profilePic,
                isProfile: true,
            };
        } catch (error) {
            console.error('Instagram API error:', error);
        }
    }

    // Fallback: scrape meta tags
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const html = await response.text();
        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        return { title: titleMatch ? titleMatch[1] : `@${username || 'Instagram'}`, views: 0, platform: 'instagram' };
    } catch {
        return { title: `@${username || 'Instagram'}`, views: 0, platform: 'instagram' };
    }
}

// ===== GENERIC =====
async function extractGeneric(url: string): Promise<ExtractedData> {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const html = await response.text();
        const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
            || html.match(/<title>([^<]+)<\/title>/i);
        return { title: titleMatch ? titleMatch[1].trim() : new URL(url).hostname, views: 0, platform: 'other' };
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
