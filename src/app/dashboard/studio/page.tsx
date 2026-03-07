"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import {
    Sparkles, Loader2, Copy, Check, Megaphone, PenTool, CalendarDays,
    BookOpen, Zap, Target, ArrowRight, Globe, Instagram, Hash, Clock,
    TrendingUp, MessageCircle, Heart, Eye, Palette, Volume2, Gauge, Send
} from "lucide-react";

const CAMPAIGNS = [
    { id: "social_post", label: "Social Posts", icon: Megaphone, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/20", desc: "5 posts con hooks, captions y hashtags" },
    { id: "ad_copy", label: "Ad Copy", icon: Target, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", desc: "3 variaciones de copy para ads pagados" },
    { id: "content_calendar", label: "Calendar 7 días", icon: CalendarDays, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", desc: "Plan de contenido semanal completo" },
    { id: "brand_story", label: "Brand Stories", icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", desc: "3 posts de storytelling emocional" },
    { id: "hooks_pack", label: "Hooks Pack", icon: Zap, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20", desc: "10 hooks virales optimizados" },
];

const PLATFORMS = [
    { id: "tiktok", label: "TikTok" },
    { id: "instagram", label: "Instagram" },
    { id: "youtube", label: "YouTube" },
    { id: "facebook", label: "Facebook" },
    { id: "linkedin", label: "LinkedIn" },
    { id: "twitter", label: "X/Twitter" },
];

const TONES = [
    "Profesional y directo", "Casual y cercano", "Agresivo y motivacional",
    "Educativo y didáctico", "Humorístico", "Inspiracional y emocional",
];

export default function StudioPage() {
    const user = useStore((s) => s.user);
    const router = useRouter();
    const [campaignType, setCampaignType] = useState("social_post");
    const [platform, setPlatform] = useState("tiktok");
    const [topic, setTopic] = useState("");
    const [tone, setTone] = useState("Profesional y directo");
    const [language, setLanguage] = useState("Español");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const generate = async () => {
        if (!user?.id) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch("/api/marketing-ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: user.id,
                    campaignType,
                    platform,
                    topic: topic || undefined,
                    tone,
                    language,
                }),
            });
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setResult(json.campaign);
        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const selectedCampaign = CAMPAIGNS.find(c => c.id === campaignType)!;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <Palette className="w-7 h-7 text-fuchsia-400" />
                    Marketing Studio
                </h1>
                <p className="text-neutral-400 text-sm">Genera contenido de marketing basado en tu Brand DNA — powered by AI.</p>
            </div>

            {/* Campaign Type Selector */}
            <div>
                <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Tipo de Campaña</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CAMPAIGNS.map(c => (
                        <button key={c.id} onClick={() => setCampaignType(c.id)}
                            className={`flex flex-col items-start gap-1 p-3 rounded-xl border transition-all ${campaignType === c.id
                                ? `${c.bg} ring-1 ring-white/10`
                                : "bg-neutral-900/50 border-neutral-800 hover:border-neutral-700"
                                }`}>
                            <div className="flex items-center gap-2">
                                <c.icon className={`w-4 h-4 ${campaignType === c.id ? c.color : "text-neutral-600"}`} />
                                <span className={`text-xs font-semibold ${campaignType === c.id ? "text-white" : "text-neutral-400"}`}>{c.label}</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 leading-tight">{c.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Config */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Platform */}
                    <div>
                        <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Plataforma</label>
                        <select value={platform} onChange={e => setPlatform(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
                            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </div>
                    {/* Tone */}
                    <div>
                        <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Tono</label>
                        <select value={tone} onChange={e => setTone(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
                            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    {/* Language */}
                    <div>
                        <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Idioma</label>
                        <select value={language} onChange={e => setLanguage(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50">
                            <option>Español</option>
                            <option>English</option>
                            <option>Portugués</option>
                        </select>
                    </div>
                </div>

                {/* Topic */}
                <div>
                    <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Tema (opcional)</label>
                    <input value={topic} onChange={e => setTopic(e.target.value)}
                        placeholder="Ej: 'Lanzamiento de nuevo curso', 'Promoción Black Friday', 'Tips de trading'..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50" />
                </div>

                {/* Generate */}
                <button onClick={generate} disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-xl font-semibold hover:from-fuchsia-500 hover:to-purple-500 transition-all disabled:opacity-50 shadow-lg shadow-fuchsia-500/20">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {loading ? "Generando campaña con AI..." : `Generar ${selectedCampaign.label}`}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <selectedCampaign.icon className={`w-5 h-5 ${selectedCampaign.color}`} />
                        {selectedCampaign.label} — Resultados
                    </h3>

                    {/* Render based on type */}
                    {renderResults(result, campaignType, copyText, copied, router, platform)}
                </div>
            )}
        </div>
    );
}

function renderResults(result: any, campaignType: string, copyText: (t: string, id: string) => void, copied: string | null, router: any, platform: string) {
    // Normalize: handle various JSON structures
    const items = result.posts || result.ads || result.calendar || result.stories || result.hooks ||
        result.content || result.variations || result.days || result.social_posts ||
        (Array.isArray(result) ? result : Object.values(result).find(v => Array.isArray(v))) || [];

    if (!Array.isArray(items) || items.length === 0) {
        return <div className="bg-card border border-border rounded-xl p-4">
            <pre className="text-xs text-neutral-300 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>;
    }

    return (
        <div className="space-y-3">
            {items.map((item: any, i: number) => {
                const fullText = buildCopyText(item);
                const id = `item-${i}`;
                return (
                    <div key={i} className={`bg-card border rounded-xl p-4 transition-all ${i === 0 ? "border-fuchsia-500/30 ring-1 ring-fuchsia-500/10" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {i === 0 && <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded font-bold">TOP PICK</span>}
                                <span className="text-xs font-bold text-neutral-500">#{i + 1}</span>
                                {item.content_type && <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded font-bold uppercase">{item.content_type}</span>}
                                {item.hook_type && <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded font-bold uppercase">{item.hook_type}</span>}
                                {item.narrative_type && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">{item.narrative_type}</span>}
                                {item.objective && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded font-bold uppercase">{item.objective}</span>}
                                {item.predicted_engagement && <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${item.predicted_engagement === 'viral' ? 'bg-pink-500/15 text-pink-400' :
                                    item.predicted_engagement === 'high' ? 'bg-green-500/15 text-green-400' :
                                        'bg-neutral-500/15 text-neutral-400'
                                    }`}>{item.predicted_engagement}</span>}
                            </div>
                            <button onClick={() => copyText(fullText, id)}
                                className="flex items-center gap-1 text-neutral-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors">
                                {copied === id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied === id ? "Copied!" : "Copy"}
                            </button>
                        </div>

                        {/* Hook */}
                        {(item.hook || item.hook_text || item.headline) && (
                            <p className="text-white font-semibold text-sm mb-2">
                                &ldquo;{item.hook || item.hook_text || item.headline}&rdquo;
                            </p>
                        )}

                        {/* Body / Story / Primary text */}
                        {(item.body || item.story || item.primary_text) && (
                            <p className="text-neutral-300 text-sm leading-relaxed mb-2 whitespace-pre-wrap">
                                {item.body || item.story || item.primary_text}
                            </p>
                        )}

                        {/* Caption */}
                        {item.caption && (
                            <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-3 mb-2">
                                <p className="text-[10px] text-neutral-500 uppercase mb-1">Caption</p>
                                <p className="text-xs text-neutral-300 whitespace-pre-wrap">{item.caption}</p>
                            </div>
                        )}

                        {/* Example caption (hooks) */}
                        {item.example_caption && (
                            <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-3 mb-2">
                                <p className="text-[10px] text-neutral-500 uppercase mb-1">Example Caption</p>
                                <p className="text-xs text-neutral-300">{item.example_caption}</p>
                            </div>
                        )}

                        {/* Meta info row */}
                        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-neutral-500">
                            {item.call_to_action && <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-fuchsia-400" /> {item.call_to_action}</span>}
                            {item.call_to_action_button && <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-cyan-400" /> {item.call_to_action_button}</span>}
                            {item.best_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-400" /> {item.best_time}</span>}
                            {item.target_audience && <span className="flex items-center gap-1"><Target className="w-3 h-3 text-green-400" /> {item.target_audience}</span>}
                            {item.hook_strategy && <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-pink-400" /> {item.hook_strategy}</span>}
                            {item.why_it_works && <span className="flex items-center gap-1 text-fuchsia-400"><Sparkles className="w-3 h-3" /> {item.why_it_works}</span>}
                            {item.visual_suggestion && <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> {item.visual_suggestion}</span>}
                            {item.topic && <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {item.topic}</span>}
                            {item.day && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-violet-400" /> Day {item.day}</span>}
                        </div>

                        {/* Pipeline Actions */}
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-800/50">
                            <button onClick={(e) => { e.stopPropagation(); const caption = buildCopyText(item); router.push(`/dashboard/calendar?caption=${encodeURIComponent(caption)}&platform=${platform}`); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors">
                                <Send className="w-3 h-3" /> Programar
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); const hook = item.hook || item.hook_text || item.headline || ''; const caption = item.caption || item.body || item.example_caption || ''; router.push(`/dashboard/tools?hook=${encodeURIComponent(hook)}&caption=${encodeURIComponent(caption)}`); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">
                                <Gauge className="w-3 h-3" /> Viral Score
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); const text = buildCopyText(item); router.push(`/dashboard/chat?prompt=${encodeURIComponent(`Refina y mejora este contenido de marketing:\n\n${text}`)}`); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                                <MessageCircle className="w-3 h-3" /> Refinar en Chat
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function buildCopyText(item: any): string {
    const parts = [];
    if (item.hook || item.hook_text || item.headline) parts.push(item.hook || item.hook_text || item.headline);
    if (item.body || item.story || item.primary_text) parts.push(item.body || item.story || item.primary_text);
    if (item.caption) parts.push(item.caption);
    if (item.example_caption) parts.push(item.example_caption);
    if (item.call_to_action) parts.push(`CTA: ${item.call_to_action}`);
    return parts.join("\n\n");
}
