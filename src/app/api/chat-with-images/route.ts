import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function formatNumber(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

export async function POST(req: Request) {
    try {
        const { messages, userMessage, images, data } = await req.json();

        const accountName = data?.accountName || 'HOOKLAB Admin';
        const accountId = data?.accountId || '';
        const ownSocials = data?.ownSocials || {};
        const knowledge = data?.knowledge || [];

        // Build context (simplified version of the main chat route's context)
        let context = `You are HOOKLAB Script Engine. You work for "${accountName}" in the financial trading niche.\n`;
        context += `You specialize in creating viral hooks and scripts for TikTok, Instagram, and YouTube.\n`;
        context += `Respond in Spanish (Latin American) unless asked otherwise.\n\n`;

        // Add knowledge
        if (knowledge.length > 0) {
            context += '=== KNOWLEDGE BASE ===\n';
            knowledge.forEach((k: any) => {
                context += `### ${k.title}\n${k.content}\n\n`;
            });
        }

        // Add social data context
        if (ownSocials.tiktok) {
            context += `\nUser's TikTok: @${ownSocials.tiktok.replace('@', '')}\n`;
            if (ownSocials.data?.tiktokFollowers) {
                context += `TikTok stats: ${formatNumber(ownSocials.data.tiktokFollowers)} followers, ${formatNumber(ownSocials.data.tiktokLikes || 0)} likes\n`;
            }
        }
        if (ownSocials.instagram) {
            context += `User's Instagram: @${ownSocials.instagram.replace('@', '')}\n`;
            if (ownSocials.data?.instagramFollowers) {
                context += `Instagram stats: ${formatNumber(ownSocials.data.instagramFollowers)} followers\n`;
            }
        }

        // Load TikTok scraped videos if available
        if (accountId || ownSocials.tiktok) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                let videos: any[] | null = null;

                if (accountId) {
                    const { data: v } = await supabase
                        .from('scraped_videos')
                        .select('video_id, caption, likes, comments, views, url')
                        .eq('account_id', accountId)
                        .eq('platform', 'tiktok')
                        .order('views', { ascending: false })
                        .limit(10);
                    videos = v;
                }

                if ((!videos || videos.length === 0) && ownSocials.tiktok) {
                    const username = ownSocials.tiktok.replace('@', '').trim();
                    const { data: mission } = await supabase
                        .from('scrape_missions')
                        .select('id')
                        .eq('username', username)
                        .eq('status', 'completed')
                        .order('completed_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (mission) {
                        const { data: v } = await supabase
                            .from('scraped_videos')
                            .select('video_id, caption, likes, comments, views, url')
                            .eq('mission_id', mission.id)
                            .order('views', { ascending: false })
                            .limit(10);
                        videos = v;
                    }
                }

                if (videos && videos.length > 0) {
                    context += '\n=== TikTok Videos ===\n';
                    videos.forEach((v: any, i: number) => {
                        context += `${i + 1}. "${v.caption}" — ${formatNumber(v.views)} views, ${formatNumber(v.likes)} likes\n`;
                    });
                }
            } catch (e) {
                console.error('Failed to load videos for image chat:', e);
            }
        }

        context += '\n\nIMPORTANT: The user is sharing an image with you. Analyze it thoroughly in the context of content creation for social media. If it\'s a screenshot of a video, analyze the hook, visual style, and engagement potential. If it\'s a chart or trading screenshot, discuss how to create content around it.';

        // Build multimodal content parts for the user message
        const contentParts: any[] = [
            { type: 'text', text: userMessage || 'Analiza esta imagen' },
        ];

        // Add images
        for (const img of images) {
            contentParts.push({
                type: 'image',
                image: img.data, // base64 string
                mimeType: img.mimeType,
            });
        }

        // Build conversation history (text-only for previous messages)
        const historyMessages = (messages || []).slice(-10).map((m: any) => ({
            role: m.role,
            content: m.content,
        }));

        const result = await generateText({
            model: openai('gpt-4o'),
            system: context,
            messages: [
                ...historyMessages,
                {
                    role: 'user',
                    content: contentParts,
                },
            ],
            temperature: 0.85,
            maxTokens: 4096,
        });

        return Response.json({
            response: result.text,
        });
    } catch (error: any) {
        console.error('Chat with images error:', error);
        return Response.json(
            { error: error.message, response: 'Error procesando la imagen. Intenta de nuevo.' },
            { status: 500 }
        );
    }
}
