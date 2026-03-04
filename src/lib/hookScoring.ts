/**
 * HOOKLAB Hook Scoring Algorithm
 * 
 * Analyzes a hook's text structure and assigns a real score based on
 * proven viral content patterns in the trading niche.
 */

const POWER_WORDS = [
    'secreto', 'descubrí', 'nadie', 'nunca', 'siempre', 'increíble', 'imposible',
    'prohibido', 'revelado', 'exclusivo', 'urgente', 'gratis', 'millones', 'millonario',
    'error', 'trampa', 'mentira', 'verdad', 'real', 'probado', 'garantizado',
    'rápido', 'fácil', 'simple', 'poderoso', 'peligroso', 'letal', 'mortal',
    'explota', 'destruye', 'transforma', 'domina', 'conquista',
    // English variants
    'secret', 'discover', 'nobody', 'never', 'always', 'incredible', 'impossible',
    'revealed', 'exclusive', 'urgent', 'free', 'million', 'millionaire',
    'mistake', 'trap', 'lie', 'truth', 'real', 'proven', 'guaranteed',
    'fast', 'easy', 'simple', 'powerful', 'dangerous', 'lethal',
];

const EMOTIONAL_TRIGGERS = [
    'miedo', 'codicia', 'curiosidad', 'sorpresa', 'enojo', 'frustración',
    'esperanza', 'orgullo', 'vergüenza', 'culpa', 'ansiedad',
    'fear', 'greed', 'curiosity', 'surprise', 'anger', 'frustration',
    'hope', 'pride', 'shame', 'guilt', 'anxiety',
];

const URGENCY_WORDS = [
    'ahora', 'hoy', 'ya', 'antes', 'últim', 'oportunidad', 'tiempo',
    'rápido', 'inmediato', 'mañana', 'próximo', 'deadline',
    'now', 'today', 'before', 'last', 'opportunity', 'time',
    'quick', 'immediate', 'tomorrow', 'next',
];

export interface HookScoreBreakdown {
    total: number;
    length: number;
    powerWords: number;
    emotionalTriggers: number;
    questionHook: number;
    numberUsage: number;
    urgency: number;
    openLoop: number;
    specificity: number;
}

export function calculateHookScore(title: string, content: string): HookScoreBreakdown {
    const fullText = `${title} ${content}`.toLowerCase();
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // 1. Length Score (0-15): Optimal hook is 8-20 words for title, body can be longer
    const titleWords = title.split(/\s+/).filter(w => w.length > 0).length;
    let lengthScore = 0;
    if (titleWords >= 5 && titleWords <= 15) lengthScore = 15;
    else if (titleWords >= 3 && titleWords <= 25) lengthScore = 10;
    else if (titleWords >= 1) lengthScore = 5;

    // 2. Power Words (0-20): Count power words used
    const powerWordCount = POWER_WORDS.filter(pw => fullText.includes(pw)).length;
    const powerWordScore = Math.min(20, powerWordCount * 5);

    // 3. Emotional Triggers (0-15): Hooks that trigger emotions perform better
    const emotionalCount = EMOTIONAL_TRIGGERS.filter(et => fullText.includes(et)).length;
    const emotionalScore = Math.min(15, emotionalCount * 5);

    // 4. Question Hook (0-10): Questions create curiosity gaps
    const hasQuestion = /[?¿]/.test(title) || /[?¿]/.test(content);
    const questionScore = hasQuestion ? 10 : 0;

    // 5. Number Usage (0-10): Specific numbers increase credibility
    const numberMatch = fullText.match(/\d+/g);
    const numberScore = numberMatch ? Math.min(10, numberMatch.length * 5) : 0;

    // 6. Urgency (0-10): Creates FOMO
    const urgencyCount = URGENCY_WORDS.filter(uw => fullText.includes(uw)).length;
    const urgencyScore = Math.min(10, urgencyCount * 5);

    // 7. Open Loop (0-10): Incomplete thoughts that demand resolution
    const openLoopPatterns = ['...', 'pero', 'sin embargo', 'lo que', 'cómo', 'por qué', 'qué pasa', 'resulta que', 'but', 'however', 'what if', 'how to', 'why'];
    const openLoopCount = openLoopPatterns.filter(ol => fullText.includes(ol)).length;
    const openLoopScore = Math.min(10, openLoopCount * 4);

    // 8. Specificity (0-10): Specific claims vs vague ones
    const specificPatterns = [/\d+%/, /\$[\d,]+/, /\d+ de \d+/, /\d+x/, /\d+ veces/, /\d+ días/, /\d+ horas/];
    const specificCount = specificPatterns.filter(sp => sp.test(fullText)).length;
    const specificityScore = Math.min(10, specificCount * 5);

    const total = Math.min(100, lengthScore + powerWordScore + emotionalScore + questionScore + numberScore + urgencyScore + openLoopScore + specificityScore);

    return {
        total,
        length: lengthScore,
        powerWords: powerWordScore,
        emotionalTriggers: emotionalScore,
        questionHook: questionScore,
        numberUsage: numberScore,
        urgency: urgencyScore,
        openLoop: openLoopScore,
        specificity: specificityScore,
    };
}
