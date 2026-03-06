import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// POST: Create a new scraping mission
// GET:  Check mission status + get results
export async function POST(req: Request) {
    try {
        const { accountId, username, platform = 'tiktok', missionType = 'scrape_videos' } = await req.json();

        if (!accountId || !username) {
            return NextResponse.json({ error: 'accountId and username are required' }, { status: 400 });
        }

        const validTypes = ['scrape_videos', 'lead_profile', 'hook_decode', 'content_spy', 'audience_mirror', 'trend_scan', 'mediakit', 'full_intel', 'full_report'];
        const finalType = validTypes.includes(missionType) ? missionType : 'scrape_videos';

        // Check for existing pending/running mission for same user+username
        const { data: existing } = await supabase
            .from('scrape_missions')
            .select('id, status')
            .eq('account_id', accountId)
            .eq('username', username.replace('@', '').trim())
            .in('status', ['pending', 'running'])
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                missionId: existing.id,
                status: existing.status,
                message: 'Mission already in progress',
            });
        }

        // Create new mission
        const { data: mission, error } = await supabase
            .from('scrape_missions')
            .insert([{
                account_id: accountId,
                username: username.replace('@', '').trim(),
                platform,
                status: 'pending',
                mission_type: finalType,
            }])
            .select('*')
            .single();

        if (error) {
            console.error('Failed to create mission:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            missionId: mission.id,
            status: 'pending',
            message: 'Analysis mission created. Worker will process it shortly.',
        });
    } catch (error: any) {
        console.error('Scrape mission error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const missionId = searchParams.get('missionId');
        const accountId = searchParams.get('accountId');

        // If missionId provided — return specific mission status + videos
        if (missionId) {
            const { data: mission } = await supabase
                .from('scrape_missions')
                .select('*')
                .eq('id', missionId)
                .single();

            if (!mission) {
                return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
            }

            let videos: any[] = [];
            if (mission.status === 'completed') {
                const { data } = await supabase
                    .from('scraped_videos')
                    .select('*')
                    .eq('mission_id', missionId)
                    .order('views', { ascending: false });
                videos = data || [];
            }

            return NextResponse.json({
                mission: {
                    id: mission.id,
                    status: mission.status,
                    username: mission.username,
                    platform: mission.platform,
                    videoCount: mission.video_count,
                    error: mission.error,
                    createdAt: mission.created_at,
                    startedAt: mission.started_at,
                    completedAt: mission.completed_at,
                },
                videos: videos.map(v => ({
                    id: v.video_id,
                    caption: v.caption,
                    likes: v.likes,
                    comments: v.comments,
                    views: v.views,
                    url: v.url,
                    thumbnail: v.thumbnail,
                    platform: v.platform,
                    timestamp: v.timestamp,
                    isVideo: true,
                })),
            });
        }

        // If accountId — return latest missions for that account
        if (accountId) {
            const { data: missions } = await supabase
                .from('scrape_missions')
                .select('*')
                .eq('account_id', accountId)
                .order('created_at', { ascending: false })
                .limit(10);

            return NextResponse.json({ missions: missions || [] });
        }

        return NextResponse.json({ error: 'missionId or accountId required' }, { status: 400 });
    } catch (error: any) {
        console.error('Scrape mission GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
