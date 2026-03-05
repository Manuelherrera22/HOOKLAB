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
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
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
    try {
        // Step 1: Get secUid from user info (with 10s timeout)
        const infoRes = await fetchWithTimeout(
            `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            10000
        );
        const infoData = await infoRes.json();
        const secUid = infoData?.userInfo?.user?.secUid;
        if (!secUid) {
            console.log('TikTok: No secUid found for', username);
            return [];
        }

        // Step 2: Fetch user posts (with 10s timeout)
        const postsRes = await fetchWithTimeout(
            `https://tiktok-api23.p.rapidapi.com/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=30&cursor=0`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            10000
        );
        const postsData = await postsRes.json();

        const items = postsData?.itemList || postsData?.items || [];
        if (items.length === 0) {
            console.log('TikTok: No posts returned for', username, '- response keys:', Object.keys(postsData));
        }

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
    } catch (error: any) {
        console.error('TikTok videos fetch error:', error.name === 'AbortError' ? 'TIMEOUT' : error.message);

        // Fallback: Try web scraping via TikTok profile page
        try {
            return await fetchTikTokVideosFallback(username);
        } catch (fbError) {
            console.error('TikTok fallback also failed:', fbError);
            return [];
        }
    }
}

// Fallback: Scrape TikTok profile page for video data
async function fetchTikTokVideosFallback(username: string): Promise<PostData[]> {
    console.log('TikTok: Attempting web scrape fallback for', username);
    const res = await fetchWithTimeout(
        `https://www.tiktok.com/@${username}`,
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        },
        8000
    );
    const html = await res.text();

    // Try to extract __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE
    const posts: PostData[] = [];
    const sigiMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]+?)<\/script>/)
        || html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]+?)<\/script>/);

    if (sigiMatch) {
        try {
            const jsonData = JSON.parse(sigiMatch[1]);
            // Try different paths where video data might live
            const itemModule = jsonData?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.id
                ? jsonData?.__DEFAULT_SCOPE__?.['webapp.video-detail']
                : null;

            // Try ItemList path
            const itemList = jsonData?.ItemModule || jsonData?.items || {};
            const entries = typeof itemList === 'object' ? Object.values(itemList) : [];

            for (const item of entries as any[]) {
                if (item?.desc || item?.id) {
                    posts.push({
                        id: item.id || String(Math.random()),
                        caption: (item.desc || '').substring(0, 300),
                        likes: item.stats?.diggCount || 0,
                        comments: item.stats?.commentCount || 0,
                        views: item.stats?.playCount || 0,
                        url: `https://www.tiktok.com/@${username}/video/${item.id}`,
                        platform: 'tiktok',
                        timestamp: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
                        isVideo: true,
                    });
                }
            }
        } catch (parseErr) {
            console.error('TikTok: Failed to parse page JSON:', parseErr);
        }
    }

    console.log(`TikTok fallback: found ${posts.length} videos via scraping`);
    return posts.sort((a, b) => b.views - a.views);
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

        // Fetch both in parallel with independent error handling
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
