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
// Strategy: Try RapidAPI first (with timeout), then fallback to TikTok oEmbed for individual videos
async function fetchTikTokVideos(username: string): Promise<PostData[]> {
    console.log(`[TikTok] Fetching videos for: ${username}`);

    // Strategy 1: RapidAPI tiktok-api23 with strict timeout
    try {
        const infoRes = await fetchWithTimeout(
            `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            8000
        );
        const infoData = await infoRes.json();
        const secUid = infoData?.userInfo?.user?.secUid;

        if (secUid) {
            console.log(`[TikTok] Got secUid, fetching posts...`);
            const postsRes = await fetchWithTimeout(
                `https://tiktok-api23.p.rapidapi.com/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=30&cursor=0`,
                {
                    headers: {
                        'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                        'x-rapidapi-key': RAPIDAPI_KEY,
                    },
                },
                8000
            );
            const postsData = await postsRes.json();
            const items = postsData?.itemList || postsData?.items || [];

            if (items.length > 0) {
                console.log(`[TikTok] RapidAPI returned ${items.length} videos`);
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
        }
    } catch (error: any) {
        console.log(`[TikTok] RapidAPI Strategy 1 failed: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
    }

    // Strategy 2: Try tiktok-scraper7 API
    try {
        console.log(`[TikTok] Trying tiktok-scraper7...`);
        const res = await fetchWithTimeout(
            `https://tiktok-scraper7.p.rapidapi.com/user/posts?unique_id=${username}&count=30`,
            {
                headers: {
                    'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            8000
        );
        const data = await res.json();
        const items = data?.data?.videos || data?.data?.items || data?.items || [];

        if (items.length > 0) {
            console.log(`[TikTok] tiktok-scraper7 returned ${items.length} videos`);
            return items.map((item: any) => ({
                id: item.video_id || item.id || String(Math.random()),
                caption: (item.title || item.desc || '').substring(0, 300),
                likes: item.digg_count || item.stats?.diggCount || 0,
                comments: item.comment_count || item.stats?.commentCount || 0,
                views: item.play_count || item.stats?.playCount || 0,
                url: `https://www.tiktok.com/@${username}/video/${item.video_id || item.id}`,
                thumbnail: item.cover || item.origin_cover || '',
                platform: 'tiktok' as const,
                timestamp: item.create_time ? new Date(item.create_time * 1000).toISOString() : undefined,
                isVideo: true,
            })).sort((a: PostData, b: PostData) => b.views - a.views);
        }
    } catch (error: any) {
        console.log(`[TikTok] tiktok-scraper7 failed: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
    }

    // Strategy 3: Try scraptik API
    try {
        console.log(`[TikTok] Trying scraptik...`);
        const res = await fetchWithTimeout(
            `https://scraptik.p.rapidapi.com/user-posts?user_id=0&username=${username}&count=10`,
            {
                headers: {
                    'x-rapidapi-host': 'scraptik.p.rapidapi.com',
                    'x-rapidapi-key': RAPIDAPI_KEY,
                },
            },
            8000
        );
        const data = await res.json();
        const items = data?.aweme_list || data?.items || [];

        if (items.length > 0) {
            console.log(`[TikTok] scraptik returned ${items.length} videos`);
            return items.map((item: any) => ({
                id: item.aweme_id || item.id || String(Math.random()),
                caption: (item.desc || item.title || '').substring(0, 300),
                likes: item.statistics?.digg_count || item.stats?.diggCount || 0,
                comments: item.statistics?.comment_count || item.stats?.commentCount || 0,
                views: item.statistics?.play_count || item.stats?.playCount || 0,
                url: `https://www.tiktok.com/@${username}/video/${item.aweme_id || item.id}`,
                thumbnail: item.video?.cover?.url_list?.[0] || '',
                platform: 'tiktok' as const,
                timestamp: item.create_time ? new Date(item.create_time * 1000).toISOString() : undefined,
                isVideo: true,
            })).sort((a: PostData, b: PostData) => b.views - a.views);
        }
    } catch (error: any) {
        console.log(`[TikTok] scraptik failed: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
    }

    // Strategy 4: Web scrape TikTok profile page
    try {
        console.log(`[TikTok] Trying web scrape fallback...`);
        const res = await fetchWithTimeout(
            `https://www.tiktok.com/@${username}?lang=en`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            },
            8000
        );
        const html = await res.text();
        const posts: PostData[] = [];

        // Try to extract __UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE
        const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]+?)<\/script>/)
            || html.match(/<script id="SIGI_STATE"[^>]*>([\s\S]+?)<\/script>/);

        if (scriptMatch) {
            const jsonData = JSON.parse(scriptMatch[1]);
            const itemModule = jsonData?.ItemModule || {};
            const entries = typeof itemModule === 'object' ? Object.values(itemModule) : [];

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

            if (posts.length > 0) {
                console.log(`[TikTok] Web scrape found ${posts.length} videos`);
                return posts.sort((a, b) => b.views - a.views);
            }
        }
    } catch (error: any) {
        console.log(`[TikTok] Web scrape failed: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
    }

    console.log(`[TikTok] All strategies failed for ${username}`);
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
