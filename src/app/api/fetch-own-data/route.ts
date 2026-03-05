import { NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

export interface PostData {
    id: string;
    caption: string;
    likes: number;
    comments: number;
    views: number;
    url: string;
    thumbnail?: string;
    platform: 'tiktok' | 'instagram';
    timestamp?: string;
    isVideo?: boolean;
}

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// ===== TIKTOK: Fetch user videos =====
async function fetchTikTokVideos(username: string): Promise<PostData[]> {
    console.log(`[TikTok] Fetching videos for: ${username}`);

    // Try RapidAPI with timeout - this sometimes works, sometimes times out  
    try {
        // Step 1: Get secUid
        const infoRes = await fetchWithTimeout(
            `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            6000
        );
        const infoData = await infoRes.json();
        const secUid = infoData?.userInfo?.user?.secUid;

        if (!secUid) {
            console.log('[TikTok] No secUid found');
            return [];
        }

        // Step 2: Get posts
        const postsRes = await fetchWithTimeout(
            `https://tiktok-api23.p.rapidapi.com/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=30&cursor=0`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            6000
        );
        const postsData = await postsRes.json();
        const items = postsData?.itemList || postsData?.items || [];

        if (items.length > 0) {
            console.log(`[TikTok] Got ${items.length} videos`);
            return items.map((item: any) => ({
                id: item.id || String(Math.random()),
                caption: (item.desc || item.title || '').substring(0, 300),
                likes: item.stats?.diggCount || item.diggCount || 0,
                comments: item.stats?.commentCount || item.commentCount || 0,
                views: item.stats?.playCount || item.playCount || 0,
                url: `https://www.tiktok.com/@${username}/video/${item.id}`,
                thumbnail: item.video?.cover || item.video?.dynamicCover || '',
                platform: 'tiktok' as const,
                timestamp: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
                isVideo: true,
            })).sort((a: PostData, b: PostData) => b.views - a.views);
        }
        console.log('[TikTok] API returned 0 posts');
    } catch (error: any) {
        console.log(`[TikTok] API failed: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
    }

    return [];
}

// ===== INSTAGRAM: Fetch user posts =====
async function fetchInstagramPosts(username: string): Promise<PostData[]> {
    try {
        const res = await fetchWithTimeout(
            'https://instagram120.p.rapidapi.com/api/instagram/posts',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-rapidapi-host': 'instagram120.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
                body: JSON.stringify({ username, maxId: '' }),
            },
            15000
        );
        const data = await res.json();

        const edges = data?.result?.edges || data?.items || [];
        return edges.map((edge: any) => {
            const node = edge?.node || edge;
            const isVideo = node?.__typename === 'GraphVideo' || node?.is_video || node?.media_type === 2;
            const caption = node?.edge_media_to_caption?.edges?.[0]?.node?.text
                || node?.caption?.text
                || node?.title
                || '';
            const likes = node?.edge_media_preview_like?.count || node?.like_count || 0;
            const comments = node?.edge_media_to_comment?.count || node?.comment_count || 0;
            const views = node?.video_view_count || node?.view_count || 0;
            const shortcode = node?.shortcode || node?.code || '';

            return {
                id: node?.id || shortcode || String(Math.random()),
                caption: caption.substring(0, 300),
                likes,
                comments,
                views: isVideo ? (views > 0 ? views : likes) : likes,
                url: shortcode ? `https://www.instagram.com/p/${shortcode}/` : '',
                thumbnail: node?.thumbnail_src || node?.display_url || node?.image_versions2?.candidates?.[0]?.url || '',
                platform: 'instagram' as const,
                timestamp: node?.taken_at_timestamp
                    ? new Date(node.taken_at_timestamp * 1000).toISOString()
                    : node?.taken_at
                        ? new Date(node.taken_at * 1000).toISOString()
                        : undefined,
                isVideo,
            };
        }).sort((a: PostData, b: PostData) => {
            const engA = a.likes + a.comments;
            const engB = b.likes + b.comments;
            return engB - engA;
        });
    } catch (error) {
        console.error('Instagram posts fetch error:', error);
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const { tiktok, instagram } = await req.json();

        // Fetch both in parallel
        const [tiktokPosts, instagramPosts] = await Promise.all([
            tiktok ? fetchTikTokVideos(tiktok.replace('@', '').trim()) : Promise.resolve([]),
            instagram ? fetchInstagramPosts(instagram.replace('@', '').trim()) : Promise.resolve([]),
        ]);

        return NextResponse.json({
            success: true,
            tiktokPosts,
            instagramPosts,
            totalTiktok: tiktokPosts.length,
            totalInstagram: instagramPosts.length,
        });
    } catch (error: any) {
        console.error('Fetch own data error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
