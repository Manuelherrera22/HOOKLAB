import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    try {
        // Fetch scraped videos for this workspace
        let query = supabase
            .from('scraped_videos')
            .select('video_id, caption, likes, comments, views, url, thumbnail, timestamp, platform, saves, shares')
            .eq('workspace_id', workspaceId)
            .order('views', { ascending: false });

        if (platform && platform !== 'all') {
            query = query.eq('platform', platform);
        }

        if (startDate) {
            query = query.gte('timestamp', startDate);
        }

        if (endDate) {
            query = query.lte('timestamp', endDate);
        }

        const { data: videos, error } = await query;

        if (error) {
            console.error('[Content Stats] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const posts = (videos || []).map((v: any) => ({
            id: v.video_id,
            caption: v.caption || '',
            likes: v.likes || 0,
            comments: v.comments || 0,
            views: v.views || 0,
            saves: v.saves || 0,
            shares: v.shares || 0,
            url: v.url || '',
            thumbnail: v.thumbnail || '',
            platform: v.platform || 'tiktok',
            timestamp: v.timestamp,
        }));

        // Compute summary stats
        const totalViews = posts.reduce((sum: number, p: any) => sum + p.views, 0);
        const totalLikes = posts.reduce((sum: number, p: any) => sum + p.likes, 0);
        const totalComments = posts.reduce((sum: number, p: any) => sum + p.comments, 0);
        const totalSaves = posts.reduce((sum: number, p: any) => sum + p.saves, 0);
        const bestPost = posts.length > 0 ? posts[0] : null; // Already sorted by views desc

        return NextResponse.json({
            posts,
            summary: {
                totalPosts: posts.length,
                totalViews,
                totalLikes,
                totalComments,
                totalSaves,
                bestPost,
            },
        });
    } catch (error: any) {
        console.error('[Content Stats] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch stats' }, { status: 500 });
    }
}
