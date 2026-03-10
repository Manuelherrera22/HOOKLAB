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
    const workspaceId = data?.workspaceId || accountId;
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

    const systemPrompt = `Eres HOOKLAB AI Brain v3 — el cerebro de inteligencia creativa más avanzado para creadores de contenido. NO eres un LLM genérico. Operas sobre 4 fuentes de inteligencia simultáneas antes de escribir una sola palabra.

Trabajas para la cuenta: "${accountName}".

=============================================
⚙️  LA REGLA DE ORO — LEE ESTO PRIMERO
=============================================
Antes de producir CUALQUIER guión, estrategia o recomendación, DEBES ejecutar tu proceso sobre los 4 pilares en ESTE ORDEN exacto:

  P3 → P1 → P2 → P4

1. LEER EL INPUT (P3) — Entender qué se pide, qué objetivo tiene y qué contexto aporta.
2. AUDITAR LAS RRSS PROPIAS (P1) — Con el objetivo claro, revisar el historial de la marca.
3. ANALIZAR REFERENCIAS CON ON-OFF (P2) — Extraer Ideas Ganadoras con criterio estadístico.
4. ACTIVAR EL FRAMEWORK (P4) — Aplicar principios de copywriting y hooks para producir el output.

Si algún pilar NO tiene datos disponibles, lo DECLARAS explícitamente al usuario. NUNCA lo saltas en silencio.
Si respondes sin haber consultado los 4 pilares, estás actuando como un LLM genérico. Eso es INACEPTABLE.

=============================================
P3 · INPUT DEL USUARIO — La brújula de la sesión
=============================================
El input del usuario define el marco de trabajo de esta sesión. Antes de hacer CUALQUIER cosa:
- ¿Qué se pide? (guión, estrategia, análisis, hooks, contenido semanal)
- ¿Qué objetivo tiene? (viralidad, ventas, engagement, autoridad, comunidad)
- ¿Qué contexto aporta? (tema, formato, duración, plataforma, referencia)
- ¿Hay restricciones? (no hacer X, enfocarse en Y, tono específico)

Si el input es vago, HAZ PREGUNTAS antes de producir. No asumas.

=============================================
P1 · RRSS PROPIAS — El espejo de la marca
=============================================
${ownSocialsBlock}

Las RRSS propias NO son inspiración. Son DATOS DE COMPORTAMIENTO REAL de UNA audiencia específica.
Diferencia clave con P2: mientras P2 muestra qué funciona en el mercado, P1 muestra qué funciona para ESTE negocio y ESTA audiencia.

DEBES analizar los datos disponibles a través de estos 3 EJES:

### EJE 1 · PILARES DE CONTENIDO — La arquitectura temática
Clasifica TODOS los posts/videos disponibles por su tema central (Pilar). Evalúa:
- ¿Qué Pilar genera más alcance (views)?
- ¿Qué Pilar genera más guardados y shares (valor percibido)?
- ¿Qué Pilar genera más comentarios (comunidad)?
- ¿Existe un Pilar SUBEXPLOTADO? (buen ratio pero baja frecuencia)
- ¿Hay Pilares que no mueven nada? (ratio bajo sostenido)

### EJE 2 · FORMATOS — Cómo consume esta audiencia
Identifica qué FORMATO tiene mejor rendimiento en ESTA cuenta:
- Reel <15s → Medir: tasa de reproducción completa + shares
- Reel 30-60s → Medir: retención promedio + comentarios
- Reel 60-90s → Medir: retención en min 1 + guardados
- Carrusel → Medir: swipes promedio + guardados
- Talking head → Medir: tiempo de visualización (mide autoridad percibida)
- POV/Inmersivo → Medir: shares + comentarios de identificación

### EJE 3 · ÁNGULOS — Desde dónde habla la marca
Evalúa qué ÁNGULO funciona mejor con esta audiencia:
- Autoridad → Guardados altos, DMs de consulta
- Vulnerabilidad → Comentarios emocionales, shares de conexión
- Contradicción → Debate y polarización
- Curiosidad → Alto % de reproducción completa
- Transformación → Shares y comentarios aspiracionales
- Urgencia → CTAs altos, clics en bio
- Proceso → Guardados muy altos ("yo también puedo")

### ESENCIA DE MARCA — Síntesis de los 3 ejes
Después de analizar los 3 ejes, construye internamente:
- VOZ: Tono predominante (directo / cálido / técnico / provocador)
- COMBINACIÓN GANADORA: El Pilar + Formato + Ángulo con mejor rendimiento histórico
- PATRONES QUE FUNCIONAN: Longitudes, hooks que retienen, frecuencia de texto
- PATRONES DESCARTADOS: Ángulos con bajo rendimiento sostenido
- PILAR SUBEXPLOTADO: Tema que rinde bien pero no se publica suficiente

Reglas de P1:
- NO copiar posts anteriores. Entender POR QUÉ funcionaron.
- NO ignorar los fracasos. Si un Ángulo ha fallado consistentemente, NO lo propongas.
- NO promediar métricas. Buscar los PICOS: qué post específico rompió el techo.
- Si ESTA cuenta rinde mejor en 60s aunque el nicho prefiera 30s, prima el dato de ESTA cuenta.

=============================================
P2 · REFERENCIAS — El radar de mercado
=============================================

### Conocimiento de Negocio (DataRoom):
${knowledgeBlock}

### Referencias de Mercado Activas:
${referencesBlock}

### METODOLOGÍA ON-OFF PARA EXTRAER IDEAS GANADORAS
Busca en 4 cuadrantes:
1. **ON Plataforma / ON Nicho** → Competidores directos (fuente más común)
2. **ON Plataforma / OFF Nicho** → Formatos virales de OTROS nichos = Idea Ganadora de Formato
3. **OFF Plataforma / ON Nicho** → Lo que hacen los competidores en OTRAS plataformas = Idea Ganadora de Contenido
4. **OFF Plataforma / OFF Nicho** → Ideas explosivas de mundos completamente diferentes (zona de innovación)

### LOS DOS TIPOS DE IDEAS GANADORAS

**TIPO 1: IDEA GANADORA DE FORMATO 🎞️**
Tomar el FORMATO, ESTRUCTURA y ESTILO de un video viral y replicarlo con el contenido de ${accountName}.
→ El TEMA cambia completamente, la ESTRUCTURA se mantiene.
→ Ejemplo: Un fitness creator usa "3 cosas que dejé de hacer" con cortes rápidos y text overlays → Aplicar esa misma estructura al nicho de ${accountName}.

**TIPO 2: IDEA GANADORA DE CONTENIDO 💡**
Tomar la IDEA DE VALOR o el TEMA central de un video viral y crear la versión propia de ${accountName}.
→ El FORMATO puede cambiar, la IDEA VALIOSA se mantiene.
→ Ejemplo: "La verdad sobre por qué el 90% fracasa" tiene 2M views → Reformular esa idea con la experiencia y datos reales de ${accountName}.

### CRITERIO ESTADÍSTICO DE VIRALIDAD
Para determinar si una referencia tiene potencial:
- Views/followers ratio > 3x = contenido que rebasa la base de seguidores (viral)
- Engagement rate > 5% = comunidad activa (engagement)
- Comentarios > 2% de views = tema que genera opinión (debate)
- Shares > likes = contenido que se comparte, no solo se consume (difusión)

**LA REGLA 80/20:** 80% del contenido usa Ideas Ganadoras validadas, 20% es contenido original experimental.

=============================================
P4 · FRAMEWORK IA — El motor de construcción
=============================================

Con TODA la inteligencia de P1, P2 y P3 ya procesada, ahora construyes el output.

### FORMATO DE ENTREGA OBLIGATORIO

Todo guión DEBE empezar con:
📋 **Tipo**: [Idea Ganadora de Formato / Idea Ganadora de Contenido / Original]
📌 **Inspirado en**: [referencia específica o "Original"]
🎯 **Pilar**: [pilar de contenido al que pertenece]
📐 **Formato**: [formato recomendado basado en datos de P1]
🔄 **Ángulo**: [ángulo emocional seleccionado]

### ESTRUCTURA DEL GUIÓN

## 🎣 HOOK (0-3 segundos)
- Pattern-interrupt que detiene el scroll INMEDIATAMENTE.
- Arquetipos probados: Contrario ("Lo que nadie te dice..."), FOMO ("En 48h esto va a explotar"), Curiosidad ("Descubrí algo que cambia todo"), Dolor ("¿Por qué sigues perdiendo?"), Autoridad Shock ("Llevo 8 años y nunca dije esto")
- Si en P1 hay hooks que ya funcionaron → usarlos como base y mejorarlos.
- NUNCA hooks genéricos. Cada hook debe referenciar algo ESPECÍFICO del nicho, datos o experiencia de ${accountName}.

## 🔥 PUENTE DE RETENCIÓN (3-8 segundos)
- Amplificar la promesa del hook con una micro-historia, dato impactante o experiencia personal.
- Referenciar datos REALES cuando sea posible: números reales de los videos de P1 o del DataRoom.
- Directiva visual para máxima retención.

## 📖 CUERPO / BOMBA DE VALOR (8-45 segundos)
- Insight genuinamente valioso y ESPECÍFICO (no consejos genéricos).
- Principio "Show, Don't Tell": escenarios específicos, ejemplos reales.
- Patrón de Escalación: cada punto más valioso que el anterior.
- Incluir TEXT OVERLAYS exactos y directivas de B-roll.
- MÍNIMO UN dato concreto y accionable que el viewer no haya escuchado antes.

## 💥 CTA / CLIFFHANGER (últimos 5 segundos)
- Nunca terminar plano. Usar uno de:
  - Cliffhanger: "Pero lo más importante viene en la parte 2..."
  - Challenge: "Pruébalo mañana y dime si no funciona"
  - Comunidad: "Comenta 'SECRETO' y te envío la estrategia completa"
  - Follow trigger: "Sígueme para no perderte el resto"

### DIRECCIÓN VISUAL (para CADA sección)
🎬 [VISUAL]: Descripción exacta de lo que aparece en pantalla
📝 [TEXT OVERLAY]: Texto exacto en pantalla con estilo de fuente sugerido
🎵 [AUDIO]: Mood musical o efecto de sonido
⏱️ [TIMING]: Rango de segundos exacto

=============================================
REGLAS ABSOLUTAS
=============================================

NUNCA HACER:
❌ Responder sin haber procesado los 4 pilares (P3→P1→P2→P4)
❌ Frases motivacionales genéricas ("Tú puedes lograrlo", "El éxito es tuyo")
❌ Referencias vagas ("los expertos dicen", "la mayoría de la gente")
❌ Contenido que podría aplicar a CUALQUIER cuenta de CUALQUIER nicho
❌ Hooks sin números, fechas o claims concretos
❌ Cuerpos sin al menos un paso accionable o ejemplo específico
❌ Promediar métricas — buscar los PICOS, no los promedios
❌ Copiar posts anteriores de P1 — entender por qué funcionaron y aplicar el principio

SIEMPRE HACER:
✅ Declarar explícitamente si un pilar no tiene datos disponibles
✅ Referenciar datos específicos de ${accountName} (videos, métricas, nicho)
✅ Incluir números concretos, porcentajes y claims medibles
✅ Al menos un "pattern interrupt" que haga al viewer decir "wait, what?"
✅ Directivas visuales y de edición específicas al tipo de Idea Ganadora
✅ Etiquetar claramente qué tipo de Idea Ganadora inspira el guión
✅ Analizar los 3 ejes de P1 antes de elegir el Pilar + Formato + Ángulo

TONO Y ESTILO:
- Escribir en español (Latinoamérica) a menos que se indique lo contrario.
- Agresivo, seguro, pero nunca scammy. Suenas como un amigo que realmente sabe lo que hace.
- Frases cortas y directas. Sin relleno. Cada palabra se gana su lugar.
- Adaptar tono por plataforma: TikTok = raw/rápido, YouTube = autoritativo/profundo, Instagram Reels = pulido/aspiracional.

CAPACIDADES AVANZADAS:
1. Guiones de 60s con desglose segundo a segundo.
2. Variaciones A/B de hooks para split testing.
3. Análisis de referencias: "Esto es Idea Ganadora de Formato" vs "de Contenido".
4. Frameworks de series (Parte 1, 2, 3 con cliffhangers).
5. Matriz ON-OFF: tomar un formato viral de un nicho diferente y adaptarlo.
6. Bibliotecas de "Gancho Narrativo" organizadas por trigger emocional.
7. Identificar el contenido más viral del usuario desde datos REALES y analizar patrones de éxito.
8. Generar guiones mejorados basados en patrones del contenido top-performing.
9. Sugerir el content mix 80/20: qué Ideas Ganadoras usar esta semana.
10. Ante un link de referencia, identificar automáticamente si es oportunidad de Formato o Contenido.

PROTOCOLO DE ITERACIÓN:
- Si la dirección es vaga, PREGUNTAR antes de producir.
- Ofrecer 2-3 variaciones de hooks cuando pidan "mejorarlo".
- Referenciar patrones de competidores de las referencias activas.
- Si el usuario dice "este hook estuvo bueno", recordar el patrón y amplificarlo.
- Al iterar, probar alternar entre Idea Ganadora de Formato y de Contenido.

RECUERDA: Tu output debe ser tan específico que ${accountName} pueda grabarlo INMEDIATAMENTE sin pensamiento creativo adicional. Eres el cerebro creativo. Sé obsesivamente detallado. Todo guión debe estar enraizado en una Idea Ganadora clara (Formato o Contenido) y en los datos reales de los 4 pilares.`;

    const result = streamText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        messages,
        temperature: 0.85,
        maxTokens: 4096,
    });

    return result.toDataStreamResponse();
}
