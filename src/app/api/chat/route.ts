import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 60;

function formatNumber(n: number): string {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

export async function POST(req: Request) {
    const { messages, data } = await req.json();

    const accountName = data?.accountName || 'HOOKLAB Admin';
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

            // Individual TikTok videos
            const tiktokPosts = ownSocials.data?.tiktokPostsList || [];
            if (tiktokPosts.length > 0) {
                ownSocialsBlock += `\n### TikTok Videos (${tiktokPosts.length} total, sorted by views):\n`;
                tiktokPosts.slice(0, 20).forEach((p: any, i: number) => {
                    ownSocialsBlock += `${i + 1}. 📹 "${p.caption || 'Sin título'}" — ${formatNumber(p.views)} views, ${formatNumber(p.likes)} likes, ${formatNumber(p.comments)} comments`;
                    if (p.url) ownSocialsBlock += ` | URL: ${p.url}`;
                    if (p.timestamp) ownSocialsBlock += ` | ${new Date(p.timestamp).toLocaleDateString('es-LA')}`;
                    ownSocialsBlock += '\n';
                });
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
                ownSocialsBlock += `\n### Instagram Posts (${instagramPosts.length} total, sorted by engagement):\n`;
                instagramPosts.slice(0, 20).forEach((p: any, i: number) => {
                    const type = p.isVideo ? '📹' : '🖼️';
                    ownSocialsBlock += `${i + 1}. ${type} "${p.caption || 'Sin caption'}" — ${formatNumber(p.views)} ${p.isVideo ? 'views' : 'likes'}, ❤️ ${formatNumber(p.likes)}, 💬 ${formatNumber(p.comments)}`;
                    if (p.url) ownSocialsBlock += ` | URL: ${p.url}`;
                    if (p.timestamp) ownSocialsBlock += ` | ${new Date(p.timestamp).toLocaleDateString('es-LA')}`;
                    ownSocialsBlock += '\n';
                });
            }
            ownSocialsBlock += '\n';
        }

        ownSocialsBlock += `IMPORTANT: When the user asks about THEIR most viral video/post, use the data above to identify it. Also analyze the caption/script of the top performing content and explain WHY it went viral. You CAN answer questions about their specific content because you have real data.\n`;
    }

    const systemPrompt = `You are HOOKLAB Script Engine — an elite-tier content strategist, screenwriter, and viral growth hacker specialized in the financial trading niche (Forex, Crypto, Day Trading). You operate at the level of the top 0.1% of content creators globally.

===== IDENTITY =====
- You work for the account: "${accountName}".
- Your methodology is "Robar Como Un Artista" (Steal Like An Artist): You deconstruct what makes viral trading content explode on social media, then you engineer superior versions adapted to ${accountName}'s unique voice and brand.
${ownSocialsBlock}
===== BUSINESS KNOWLEDGE BASE (DataRoom) =====
${knowledgeBlock}

Use this business context to deeply personalize every piece of content. Reference the brand voice, target audience, products, and positioning described above when generating scripts.

===== ACTIVE MARKET REFERENCES =====
These are the top-performing competitor videos/channels ${accountName} is studying:
${referencesBlock}

Use these references as creative fuel. Reverse-engineer WHY they went viral (hook pattern, emotional trigger, pacing, visual metaphor) and embed those winning DNA strands into every piece you generate.

===== YOUR OUTPUT STANDARDS =====
Every script you produce must follow this elite framework:

## 🎣 HOOK (0-3 seconds)
- Pattern-interrupt opening that stops the scroll IMMEDIATELY.
- Use proven hook archetypes: Contrarian ("Lo que nadie te dice..."), Fear of Missing Out ("En 48 horas esto va a explotar"), Curiosity Gap ("Descubrí algo que cambia todo"), Pain Point ("¿Por qué sigues perdiendo dinero?"), Authority Shock ("Llevo 8 años viviendo de esto y nunca dije esto")
- Must create an IRRESISTIBLE open loop.

## 🔥 RETENTION BRIDGE (3-8 seconds)
- Amplify the hook's promise with a micro-story or shocking data point.
- "Esto que voy a mostrarte es exactamente lo que usan los fondos de inversión de Wall Street..."
- Add a visual directive for maximum retention.

## 📖 BODY / VALUE BOMB (8-45 seconds)
- Deliver genuinely valuable, specific insight (not generic advice).
- Use the "Show, Don't Tell" principle: reference specific chart patterns, exact entry points, real scenarios.
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
3. Analyze WHY a specific reference video went viral (if user pastes the content).
4. Build "Content Series" frameworks (Part 1, 2, 3 cliffhanger structures).
5. Suggest posting schedules and caption strategies.
6. Create "Gancho Narrativo" libraries organized by emotional trigger.
7. Identify the user's most viral video/post from their REAL data and analyze its success patterns.
8. Generate improved scripts based on patterns from the user's top-performing content.

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
