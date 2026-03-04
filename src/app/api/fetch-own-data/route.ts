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

// ===== TIKTOK: Fetch user videos =====
async function fetchTikTokVideos(username: string): Promise<PostData[]> {
    try {
        // First get secUid from user info
        const infoRes = await fetch(`https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${username}`, {
            headers: {
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                'x-rapidapi-key': RAPIDAPI_KEY,
            },
        });
        const infoData = await infoRes.json();
        const secUid = infoData?.userInfo?.user?.secUid;
        if (!secUid) return [];

        // Fetch user posts
        const postsRes = await fetch(`https://tiktok-api23.p.rapidapi.com/api/user/posts?secUid=${encodeURIComponent(secUid)}&count=30&cursor=0`, {
            headers: {
                'x-rapidapi-host': 'tiktok-api23.p.rapidapi.com',
                'x-rapidapi-key': RAPIDAPI_KEY,
            },
        });
        const postsData = await postsRes.json();

        const items = postsData?.itemList || postsData?.items || [];
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
        })).sort((a: PostData, b: PostData) => b.views - a.views); // Sort by views descending
    } catch (error) {
        console.error('TikTok videos fetch error:', error);
        return [];
    }
}

// ===== INSTAGRAM: Fetch user posts =====
async function fetchInstagramPosts(username: string): Promise<PostData[]> {
    try {
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
                views: isVideo ? (views > 0 ? views : likes) : likes, // Instagram often returns 0 views, use likes as fallback
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
            // Sort by total engagement: likes + comments (more reliable than views on Instagram)
            const engA = a.likes + a.comments;
            const engB = b.likes + b.comments;
            return engB - engA;
        }); // Sort by engagement descending
    } catch (error) {
        console.error('Instagram posts fetch error:', error);
        return [];
    }
}

export async function POST(req: Request) {
    try {
        const { tiktok, instagram } = await req.json();
        const result: { tiktokPosts: PostData[]; instagramPosts: PostData[] } = {
            tiktokPosts: [],
            instagramPosts: [],
        };

        if (tiktok) {
            const username = tiktok.replace('@', '').trim();
            result.tiktokPosts = await fetchTikTokVideos(username);
        }

        if (instagram) {
            const username = instagram.replace('@', '').trim();
            result.instagramPosts = await fetchInstagramPosts(username);
        }

        return NextResponse.json({
            success: true,
            tiktokPosts: result.tiktokPosts,
            instagramPosts: result.instagramPosts,
            totalTiktok: result.tiktokPosts.length,
            totalInstagram: result.instagramPosts.length,
        });
    } catch (error: any) {
        console.error('Fetch own data error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
