import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
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
    const { messages, data } = await req.json();

    const accountName = data?.accountName || 'HOOKLAB Admin';
    const accountId = data?.accountId || '';
    const references = data?.references || [];
    const knowledge = data?.knowledge || [];
    const ownSocials = data?.ownSocials || {};

    const referencesBlock = references.length > 0
        ? references.map((r: any) => `  • "${r.refName || r.name}" — ${r.platform} (${Number(r.views).toLocaleString()} views${r.followers ? `, ${Number(r.followers).toLocaleString()} followers` : ''})`).join('\n')
        : '  (No hay referencias seleccionadas actualmente.)';

    const knowledgeBlock = knowledge.length > 0
        ? knowledge.map((k: any) => `### ${k.title}\n${k.content}`).join('\n\n')
        : '(No hay información de negocio cargada aún.)';

    // Build own socials block with profile stats AND individual posts
    let ownSocialsBlock = '';
    if (ownSocials.tiktok || ownSocials.instagram) {
        ownSocialsBlock = '\n===== YOUR OWN SOCIAL MEDIA PROFILES (REAL DATA) =====\n';
        ownSocialsBlock += 'You have REAL, LIVE data about this user\'s social media accounts. Use it to answer their questions accurately.\n\n';

        if (ownSocials.tiktok) {
            ownSocialsBlock += `## TikTok: @${ownSocials.tiktok.replace('@', '')}\n`;
            if (ownSocials.data?.tiktokFollowers) {
                ownSocialsBlock += `Followers: ${formatNumber(ownSocials.data.tiktokFollowers)} | Total Likes: ${formatNumber(ownSocials.data.tiktokLikes || 0)} | Videos: ${ownSocials.data.tiktokVideos || 0}\n`;
            }

            // Individual TikTok videos — first try from client store, then from Supabase
            let tiktokPosts = ownSocials.data?.tiktokPostsList || [];

            // If no posts from client, query Supabase directly for scraped videos
            if (tiktokPosts.length === 0 && (accountId || ownSocials.tiktok)) {
                try {
                    const supabase = createClient(supabaseUrl, supabaseKey);
                    let scrapedVideos: any[] | null = null;

                    // First try by account_id
                    if (accountId) {
                        const { data } = await supabase
                            .from('scraped_videos')
                            .select('video_id, caption, likes, comments, views, url, timestamp, platform')
                            .eq('account_id', accountId)
                            .eq('platform', 'tiktok')
                            .order('views', { ascending: false })
                            .limit(20);
                        scrapedVideos = data;
                    }

                    // Fallback: query by username via scrape_missions join
                    if ((!scrapedVideos || scrapedVideos.length === 0) && ownSocials.tiktok) {
                        const tiktokUsername = ownSocials.tiktok.replace('@', '').trim();
                        // Find latest completed mission for this username
                        const { data: mission } = await supabase
                            .from('scrape_missions')
                            .select('id')
                            .eq('username', tiktokUsername)
                            .eq('status', 'completed')
                            .order('completed_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (mission) {
                            const { data } = await supabase
                                .from('scraped_videos')
                                .select('video_id, caption, likes, comments, views, url, timestamp, platform')
                                .eq('mission_id', mission.id)
                                .order('views', { ascending: false })
                                .limit(20);
                            scrapedVideos = data;
                            console.log(`[Chat] Found ${scrapedVideos?.length || 0} videos via username mission lookup`);
                        }
                    }

                    if (scrapedVideos && scrapedVideos.length > 0) {
                        tiktokPosts = scrapedVideos.map((v: any) => ({
                            id: v.video_id,
                            caption: v.caption || '',
                            likes: v.likes || 0,
                            comments: v.comments || 0,
                            views: v.views || 0,
                            url: v.url || '',
                            platform: 'tiktok',
                            timestamp: v.timestamp,
                        }));
                        console.log(`[Chat] Loaded ${tiktokPosts.length} TikTok videos from scraped_videos`);
                    }
                } catch (e) {
                    console.error('[Chat] Failed to load scraped_videos:', e);
                }
            }

            if (tiktokPosts.length > 0) {
                ownSocialsBlock += `\n### TikTok Videos (${tiktokPosts.length} total, sorted by views):\n`;
                tiktokPosts.slice(0, 20).forEach((p: any, i: number) => {
                    ownSocialsBlock += `${i + 1}. 📹 "${p.caption || 'Sin título'}" — ${formatNumber(p.views)} views, ${formatNumber(p.likes)} likes, ${formatNumber(p.comments)} comments`;
                    if (p.url) ownSocialsBlock += ` | URL: ${p.url}`;
                    if (p.timestamp) ownSocialsBlock += ` | ${new Date(p.timestamp).toLocaleDateString('es-LA')}`;
                    ownSocialsBlock += '\n';
                });
            } else if (ownSocials.data?.tiktokFollowers || ownSocials.data?.tiktokVideos) {
                ownSocialsBlock += `\n### TikTok Videos: ⚠️ Los videos aún se están procesando. Se tienen las estadísticas generales del perfil.\n`;
                ownSocialsBlock += `Usa estos datos: ${ownSocials.data.tiktokFollowers || 0} followers, ${ownSocials.data.tiktokLikes || 0} likes, ${ownSocials.data.tiktokVideos || 0} videos.\n`;
                ownSocialsBlock += `Dile al usuario que los videos se están procesando y que vuelva a preguntar en unos minutos.\n`;
            }
            ownSocialsBlock += '\n';
        }

        if (ownSocials.instagram) {
            ownSocialsBlock += `## Instagram: @${ownSocials.instagram.replace('@', '')}\n`;
            if (ownSocials.data?.instagramFollowers) {
                ownSocialsBlock += `Followers: ${formatNumber(ownSocials.data.instagramFollowers)} | Posts: ${ownSocials.data.instagramPosts || 0}\n`;
            }

            // Individual Instagram posts
            const instagramPosts = ownSocials.data?.instagramPostsList || [];
            if (instagramPosts.length > 0) {
                ownSocialsBlock += `\n### Instagram Posts (${instagramPosts.length} total, sorted by engagement = likes + comments):\n`;
                instagramPosts.slice(0, 20).forEach((p: any, i: number) => {
                    const type = p.isVideo ? '📹' : '🖼️';
                    const engagement = (p.likes || 0) + (p.comments || 0);
                    ownSocialsBlock += `${i + 1}. ${type} "${p.caption || 'Sin caption'}" — ENGAGEMENT: ${formatNumber(engagement)} (❤️ ${formatNumber(p.likes)} likes, 💬 ${formatNumber(p.comments)} comments)`;
                    if (p.url) ownSocialsBlock += ` | URL: ${p.url}`;
                    if (p.timestamp) ownSocialsBlock += ` | ${new Date(p.timestamp).toLocaleDateString('es-LA')}`;
                    ownSocialsBlock += '\n';
                });
            }
            ownSocialsBlock += '\n';
        }

        ownSocialsBlock += `IMPORTANT: When the user asks about THEIR most viral video/post, use the data above to identify it. Also analyze the caption/script of the top performing content and explain WHY it went viral. You CAN answer questions about their specific content because you have real data.\n`;

        // ── INTELLIGENCE DATA INJECTION ──
        if (ownSocials.tiktok) {
            try {
                const tiktokUsername = ownSocials.tiktok.replace('@', '').trim();
                const sbClient = createClient(supabaseUrl, supabaseKey);

                const [hookRes, audienceRes, trendRes, profileRes] = await Promise.all([
                    sbClient.from('hook_analyses').select('hook_type, hook_text, adaptable_template, why_it_worked')
                        .eq('username', tiktokUsername).order('created_at', { ascending: false }).limit(5),
                    sbClient.from('audience_insights').select('top_questions, objections, product_requests, sentiment, audience_segments')
                        .eq('username', tiktokUsername).order('created_at', { ascending: false }).limit(1),
                    sbClient.from('trend_snapshots').select('rising_topics, dying_topics, prediction')
                        .eq('niche', tiktokUsername).order('created_at', { ascending: false }).limit(1),
                    sbClient.from('profile_analyses').select('buyer_persona, sales_approach, content_patterns')
                        .eq('username', tiktokUsername).eq('analysis_type', 'lead_profile').order('created_at', { ascending: false }).limit(1),
                ]);

                let intelBlock = '';
                const hooks = hookRes.data || [];
                const audience = audienceRes.data?.[0];
                const trends = trendRes.data?.[0];
                const profile = profileRes.data?.[0];

                if (hooks.length > 0) {
                    intelBlock += '\n### 🪝 Hooks That Work in This Niche:\n';
                    hooks.forEach((h: any, i: number) => {
                        intelBlock += `${i + 1}. [${h.hook_type}] "${h.hook_text}" → Template: ${h.adaptable_template}\n`;
                    });
                }

                if (audience) {
                    intelBlock += '\n### 👥 Audience Intelligence:\n';
                    intelBlock += `Sentiment: ${audience.sentiment}\n`;
                    if (audience.top_questions?.length) intelBlock += `Questions they ask: ${audience.top_questions.join('; ')}\n`;
                    if (audience.objections?.length) intelBlock += `Objections: ${audience.objections.join('; ')}\n`;
                    if (audience.product_requests?.length) intelBlock += `Products they want: ${audience.product_requests.join('; ')}\n`;
                    if (audience.audience_segments?.length) {
                        intelBlock += 'Segments: ' + audience.audience_segments.map((s: any) => `${s.type} ${s.percentage}%`).join(', ') + '\n';
                    }
                }

                if (trends) {
                    intelBlock += '\n### 📡 Trend Intelligence:\n';
                    if (trends.rising_topics?.length) intelBlock += `Rising: ${trends.rising_topics.join(', ')}\n`;
                    if (trends.dying_topics?.length) intelBlock += `Avoid: ${trends.dying_topics.join(', ')}\n`;
                    if (trends.prediction) {
                        if (trends.prediction.next_week) intelBlock += `Next week prediction: ${trends.prediction.next_week}\n`;
                        if (trends.prediction.avoid) intelBlock += `Topics to avoid: ${trends.prediction.avoid}\n`;
                    }
                }

                if (profile?.buyer_persona) {
                    const bp = profile.buyer_persona;
                    intelBlock += `\n### 🎯 Buyer Persona:\n`;
                    Object.entries(bp).forEach(([k, v]) => {
                        intelBlock += `${k}: ${Array.isArray(v) ? (v as string[]).join(', ') : v}\n`;
                    });
                    if (profile.sales_approach?.recommended_pitch) {
                        intelBlock += `\nRecommended pitch: "${profile.sales_approach.recommended_pitch}"\n`;
                    }
                }

                if (intelBlock) {
                    ownSocialsBlock += '\n===== 🧠 DEEP INTELLIGENCE (AI-Analyzed) =====\n';
                    ownSocialsBlock += 'Use this intelligence to create HYPER-TARGETED content. These are real insights from analyzing this account\'s content and niche.\n';
                    ownSocialsBlock += intelBlock;
                    ownSocialsBlock += '\nIMPORTANT: When generating hooks, USE the proven hook templates above. When choosing topics, PRIORITIZE rising trends and AVOID dying ones. When crafting CTAs, address the audience\'s specific questions and objections.\n';
                }

                console.log(`[Chat] Loaded intelligence: ${hooks.length} hooks, audience=${!!audience}, trends=${!!trends}, profile=${!!profile}`);
            } catch (e) {
                console.error('[Chat] Failed to load intelligence data:', e);
            }
        }
    }

    const systemPrompt = `You are HOOKLAB Script Engine — an elite-tier content strategist, screenwriter, and viral growth hacker. You operate at the level of the top 0.1% of content creators globally. You adapt dynamically to ANY niche based on the account data provided.

===== IDENTITY =====
- You work for the account: "${accountName}".
${ownSocialsBlock}

===== CORE METHODOLOGY: "Idea Ganadora" (Winning Idea System) =====
You follow the ON-OFF Framework for finding and engineering viral content:

**THE ON-OFF MATRIX:**
1. **ON Platform / ON Niche** → Find what's working for competitors IN the same platform AND niche. Study their hooks, formats, and structures that get the most views.
2. **ON Platform / OFF Niche** → Find viral formats/hooks from OTHER niches on the same platform. A trending format in fitness might work brilliantly adapted to trading or cooking.
3. **OFF Platform / ON Niche** → Find what competitors are doing on OTHER platforms (YouTube → TikTok, Twitter → Reels). Cross-pollinate winning ideas across channels.
4. **OFF Platform / OFF Niche** → Find explosive content from completely different platforms AND niches. This is where the most innovative ideas come from.

**KEY PRINCIPLES:**
- Viral videos are the EFFECT. The "Idea Ganadora" (winning idea) is the CAUSE — the underlying format, structure, emotional trigger, and theme.
- NEVER copy content. Deconstruct the IDEA behind it (format + structure + emotional trigger) and engineer a SUPERIOR version for ${accountName}'s voice and brand.
- Follow the 80/20 RULE: 80% of content should use validated "Ideas Ganadoras" (proven hooks/formats from the ON-OFF matrix), 20% should be original experimental ideas.
- When analyzing reference content: identify the FORMAT (talking head, carousel, POV, etc.), the STRUCTURE (hook → tension → payoff), and the EMOTIONAL TRIGGER (fear, curiosity, aspiration, controversy).

===== BUSINESS KNOWLEDGE BASE (DataRoom) =====
${knowledgeBlock}

Use this business context to deeply personalize every piece of content. Reference the brand voice, target audience, products, and positioning described above when generating scripts.

===== ACTIVE MARKET REFERENCES =====
These are the top-performing competitor videos/channels ${accountName} is studying:
${referencesBlock}

Apply the ON-OFF Matrix to these references. Reverse-engineer WHY they went viral (hook pattern, emotional trigger, pacing, visual metaphor) and embed those winning DNA strands into every piece you generate.

===== YOUR OUTPUT STANDARDS =====
Every script you produce must follow this elite framework:

## 🎣 HOOK (0-3 seconds)
- Pattern-interrupt opening that stops the scroll IMMEDIATELY.
- Use proven hook archetypes: Contrarian ("Lo que nadie te dice..."), Fear of Missing Out ("En 48 horas esto va a explotar"), Curiosity Gap ("Descubrí algo que cambia todo"), Pain Point ("¿Por qué sigues perdiendo?"), Authority Shock ("Llevo 8 años en esto y nunca dije esto")
- Must create an IRRESISTIBLE open loop.

## 🔥 RETENTION BRIDGE (3-8 seconds)
- Amplify the hook's promise with a micro-story or shocking data point.
- Add a visual directive for maximum retention.

## 📖 BODY / VALUE BOMB (8-45 seconds)
- Deliver genuinely valuable, specific insight (not generic advice).
- Use the "Show, Don't Tell" principle: reference specific scenarios, real examples, data points.
- Structure with the "Escalation Pattern": each point more valuable than the last.
- Include EXACT text overlays and B-roll directives.

## 💥 CTA / CLIFFHANGER (Final 5 seconds)
- Never end flat. Use one of:
  - Cliffhanger: "Pero lo más importante viene en la parte 2..."
  - Challenge: "Pruébalo mañana y dime si no funciona"
  - Community: "Comenta 'SECRETO' y te envío la estrategia completa"
  - Follow trigger: "Sígueme para no perderte el resto"

===== VISUAL DIRECTION FORMAT =====
For EVERY section, include:
🎬 [VISUAL]: Exact description of what appears on screen
📝 [TEXT OVERLAY]: Exact on-screen text with suggested font style
🎵 [AUDIO]: Music mood or sound effect suggestion
⏱️ [TIMING]: Exact second range

===== TONE & STYLE =====
- Write in Spanish (Latin American) unless instructed otherwise.
- Aggressive, confident, but never scammy. You sound like a friend who actually knows what they're doing.
- Use short, punchy sentences. No filler words. Every word earns its place.
- Adapt tone based on platform: TikTok = raw/fast, YouTube = authoritative/deep, Instagram Reels = polished/aspirational.

===== ITERATION PROTOCOL =====
When ${accountName} asks you to iterate:
- Ask clarifying questions if the direction is vague.
- Provide 2-3 variations of hooks when asked to "make it better."
- Reference specific competitor patterns from the active references when suggesting improvements.
- Track what worked: if the user says "this hook was good," remember the pattern and amplify it.

===== ADVANCED CAPABILITIES =====
You can also:
1. Generate full 60-second scripts with second-by-second breakdowns.
2. Create A/B hook variations for split testing.
3. Analyze WHY a specific reference video went viral using the ON-OFF matrix.
4. Build "Content Series" frameworks (Part 1, 2, 3 cliffhanger structures).
5. Apply the ON-OFF matrix: take a viral format from an unrelated niche and adapt it to ${accountName}'s niche.
6. Create "Gancho Narrativo" libraries organized by emotional trigger.
7. Identify the user's most viral content from their REAL data and analyze success patterns.
8. Generate improved scripts based on patterns from top-performing content.
9. Suggest the 80/20 content mix: which "Ideas Ganadoras" to use this week vs. experimental ideas.

IMPORTANT: Never produce generic, obvious, or surface-level content. Your output must be specific enough that ${accountName} could record it IMMEDIATELY without any additional creative thinking. You are the creative brain. Be obsessively detailed.`;

    const result = streamText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        messages,
        temperature: 0.85,
        maxTokens: 4096,
    });

    return result.toDataStreamResponse();
}
