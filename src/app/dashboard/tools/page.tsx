"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/store/useStore";
import {
    Gauge, Loader2, Sparkles, Zap, HelpCircle, Flame,
    AlertTriangle, Shield, Eye, Copy, Star, StarOff,
    Trash2, BookOpen, FlaskConical, Save, Check, Trophy,
    TrendingUp, Target, MessageCircle, Lightbulb
} from "lucide-react";

interface ViralResult {
    score: number;
    grade: string;
    breakdown: Record<string, { score: number; reason: string }>;
    suggestions: string[];
    predictedViews: string;
}

interface HookVariation {
    rank: number;
    hookType: string;
    text: string;
    caption: string;
    predictedScore: number;
    whyItWorks: string;
    template: string;
}

interface SavedScript {
    id: string;
    title: string;
    content: string;
    hook_type: string | null;
    tags: string[];
    viral_score: number | null;
    is_favorite: boolean;
    created_at: string;
}

const hookColors: Record<string, string> = {
    shock: "bg-white/10 text-neutral-300",
    question: "bg-white/10 text-neutral-300",
    challenge: "bg-white/10 text-neutral-300",
    controversy: "bg-white/10 text-neutral-300",
    authority: "bg-white/10 text-neutral-300",
    curiosity: "bg-white/10 text-neutral-300",
};

const gradeColors: Record<string, string> = {
    S: "from-neutral-200 to-neutral-400 text-black",
    A: "from-neutral-300 to-neutral-500 text-black",
    B: "from-neutral-400 to-neutral-600 text-white",
    C: "from-neutral-500 to-neutral-600 text-white",
    D: "from-neutral-600 to-neutral-700 text-white",
    F: "from-neutral-700 to-neutral-800 text-white",
};

export default function ToolsPage() {
    const user = useStore((s) => s.user);
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("viral");
    const username = user?.ownTiktok?.replace("@", "") || "";

    // Pre-fill from Studio pipeline
    useEffect(() => {
        const hook = searchParams.get('hook');
        const caption = searchParams.get('caption');
        if (hook) setHookText(hook);
        if (caption) setCaptionText(caption);
        if (hook || caption) setActiveTab('viral');
    }, [searchParams]);

    // Viral Score state
    const [hookText, setHookText] = useState("");
    const [captionText, setCaptionText] = useState("");
    const [viralLoading, setViralLoading] = useState(false);
    const [viralResult, setViralResult] = useState<ViralResult | null>(null);

    // A/B Hooks state
    const [abTopic, setAbTopic] = useState("");
    const [abLoading, setAbLoading] = useState(false);
    const [abHooks, setAbHooks] = useState<HookVariation[]>([]);

    // Script Library state
    const [scripts, setScripts] = useState<SavedScript[]>([]);
    const [scriptsLoading, setScriptsLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // Load scripts
    const loadScripts = useCallback(async () => {
        if (!user?.id) return;
        setScriptsLoading(true);
        try {
            const res = await fetch(`/api/scripts?accountId=${user.id}`);
            const json = await res.json();
            setScripts(json.scripts || []);
        } catch (e) { console.error(e); }
        finally { setScriptsLoading(false); }
    }, [user?.id]);

    useEffect(() => { if (activeTab === "library") loadScripts(); }, [activeTab, loadScripts]);

    const runViralScore = async () => {
        if (!hookText.trim() && !captionText.trim()) return;
        setViralLoading(true);
        try {
            const res = await fetch("/api/viral-score", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, hookText, caption: captionText }),
            });
            const json = await res.json();
            setViralResult(json);
        } catch (e) { console.error(e); }
        finally { setViralLoading(false); }
    };

    const runABHooks = async () => {
        if (!abTopic.trim()) return;
        setAbLoading(true);
        try {
            const res = await fetch("/api/ab-hooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, topic: abTopic }),
            });
            const json = await res.json();
            setAbHooks(json.hooks || []);
        } catch (e) { console.error(e); }
        finally { setAbLoading(false); }
    };

    const saveScript = async (content: string, hookType?: string, score?: number) => {
        if (!user?.id) return;
        try {
            await fetch("/api/scripts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: user.id,
                    title: content.slice(0, 50) + "...",
                    content,
                    hookType,
                    score,
                }),
            });
            if (activeTab === "library") loadScripts();
        } catch (e) { console.error(e); }
    };

    const toggleFavorite = async (id: string, current: boolean) => {
        await fetch("/api/scripts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_favorite: !current }),
        });
        setScripts(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !current } : s));
    };

    const deleteScript = async (id: string) => {
        await fetch(`/api/scripts?id=${id}`, { method: "DELETE" });
        setScripts(prev => prev.filter(s => s.id !== id));
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const tabs = [
        { id: "viral", label: "Viral Score", icon: Gauge, color: "text-neutral-300" },
        { id: "ab", label: "A/B Hooks", icon: FlaskConical, color: "text-neutral-300" },
        { id: "library", label: "Script Library", icon: BookOpen, color: "text-neutral-300" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <FlaskConical className="w-7 h-7 text-neutral-400" />
                    Creator Tools
                </h1>
                <p className="text-neutral-400 text-sm">AI-powered tools to maximize your content performance.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-900/50 rounded-xl p-1 border border-neutral-800">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-neutral-800 text-white shadow-lg" : "text-neutral-500 hover:text-neutral-300"
                            }`}>
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ VIRAL SCORE ═══ */}
            {activeTab === "viral" && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-neutral-400" /> Predict Virality
                        </h3>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Hook (first 3 seconds)</label>
                            <textarea value={hookText} onChange={e => setHookText(e.target.value)} rows={2}
                                placeholder="e.g. 'Llevo 8 años en trading y nunca te contaron este secreto...'"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none" />
                        </div>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Caption</label>
                            <textarea value={captionText} onChange={e => setCaptionText(e.target.value)} rows={2}
                                placeholder="Full video caption with emojis and hashtags..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none" />
                        </div>
                        <button onClick={runViralScore} disabled={viralLoading || (!hookText.trim() && !captionText.trim())}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-all disabled:opacity-50 shadow-lg shadow-white/10">
                            {viralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {viralLoading ? "Analyzing..." : "Predict Score"}
                        </button>
                        {!hookText && !captionText && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="text-[10px] text-neutral-600">Quick fill:</span>
                                {[
                                    { hook: "Llevo 8 años en trading y nunca te contaron este secreto...", cap: "La verdad que nadie te dice sobre los mercados 📈🔥 #trading #forex" },
                                    { hook: "¿Sabías que el 90% de los traders pierden dinero? Yo era uno de ellos", cap: "Mi historia de fracaso a éxito 💪 #mentalidad #inversiones" },
                                    { hook: "Este error me costó $10,000 dólares en UN solo día", cap: "No cometas este error!! ⚠️ #tradinglife #cripto" },
                                ].map((ex, i) => (
                                    <button key={i} onClick={() => { setHookText(ex.hook); setCaptionText(ex.cap); }}
                                        className="text-[10px] bg-white/5 text-neutral-400 border border-white/10 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors truncate max-w-[200px]">
                                        {ex.hook.slice(0, 35)}...
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {viralResult && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            {/* Score Hero */}
                            <div className="bg-card border border-border rounded-2xl p-6 text-center">
                                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${gradeColors[viralResult.grade] || gradeColors.C} text-4xl font-black mb-3`}>
                                    {viralResult.grade}
                                </div>
                                <p className="text-5xl font-black text-white mb-1">{viralResult.score}<span className="text-lg text-neutral-500">/100</span></p>
                                <p className="text-sm text-neutral-400">Predicted Views: <span className="text-neutral-200 font-semibold">{viralResult.predictedViews}</span></p>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                {Object.entries(viralResult.breakdown).map(([key, val]) => (
                                    <div key={key} className="bg-card border border-border rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-white">{val.score}</p>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, " $1")}</p>
                                        <p className="text-[11px] text-neutral-400 leading-tight">{val.reason}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Suggestions */}
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-neutral-300 font-semibold mb-2">IMPROVEMENTS TO BOOST SCORE</p>
                                {viralResult.suggestions.map((s, i) => (
                                    <div key={i} className="flex items-start gap-2 mb-1.5">
                                        <Lightbulb className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                        <p className="text-sm text-neutral-300">{s}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ A/B HOOKS ═══ */}
            {activeTab === "ab" && (
                <div className="space-y-4">
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <h3 className="text-base font-semibold text-white flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-neutral-400" /> Generate Hook Variations
                        </h3>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Topic</label>
                            <input value={abTopic} onChange={e => setAbTopic(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && runABHooks()}
                                placeholder="e.g. 'Por qué el 90% pierde en forex'"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20" />
                        </div>
                        <button onClick={runABHooks} disabled={abLoading || !abTopic.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-all disabled:opacity-50 shadow-lg shadow-white/10">
                            {abLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {abLoading ? "Generating 5 variations..." : "Generate A/B Hooks"}
                        </button>
                        {!abTopic && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                <span className="text-[10px] text-neutral-600">Try:</span>
                                {["Por qué el 90% pierde en forex", "Secretos de productividad", "Cómo ganar 5K al mes online", "Errores de principiantes en cripto"].map(ex => (
                                    <button key={ex} onClick={() => setAbTopic(ex)}
                                        className="text-[10px] bg-white/5 text-neutral-400 border border-white/10 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {abHooks.length > 0 && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {abHooks.map((hook, i) => (
                                <div key={i} className={`bg-card border rounded-xl p-4 transition-all ${i === 0 ? "border-white/20 ring-1 ring-white/10" : "border-border"
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {i === 0 && <Trophy className="w-4 h-4 text-neutral-300" />}
                                            <span className="text-xs font-bold text-neutral-500">#{hook.rank}</span>
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${hookColors[hook.hookType] || "bg-neutral-500/20 text-neutral-400"}`}>
                                                {hook.hookType}
                                            </span>
                                            <span className="text-xs font-bold text-neutral-400">{hook.predictedScore}/100</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => copyToClipboard(hook.text, `hook-${i}`)}
                                                className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                                                {copied === `hook-${i}` ? <Check className="w-3.5 h-3.5 text-neutral-300" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => saveScript(hook.text + "\n\n" + hook.caption, hook.hookType, hook.predictedScore)}
                                                className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                                                <Save className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-white font-medium text-sm mb-1">&ldquo;{hook.text}&rdquo;</p>
                                    <p className="text-xs text-neutral-400 mb-2">{hook.caption}</p>
                                    <p className="text-[11px] text-neutral-400">{hook.whyItWorks}</p>
                                    <div className="mt-2 bg-neutral-900/80 border border-neutral-800 rounded-lg p-2">
                                        <p className="text-[10px] text-neutral-500">TEMPLATE</p>
                                        <p className="text-xs text-neutral-400 font-mono">{hook.template}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ SCRIPT LIBRARY ═══ */}
            {activeTab === "library" && (
                <div className="space-y-4">
                    {scriptsLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
                        </div>
                    ) : scripts.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                            <p className="text-neutral-500">No saved scripts yet.</p>
                            <p className="text-neutral-600 text-sm mt-1">Generate hooks and save them here for quick access.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-neutral-500">{scripts.length} scripts saved</p>
                                <div className="flex gap-2 text-xs">
                                    <span className="text-neutral-400">{scripts.filter(s => s.is_favorite).length} favorites</span>
                                </div>
                            </div>
                            {/* Favorites first */}
                            {scripts.sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0)).map(script => (
                                <div key={script.id} className={`bg-card border rounded-xl p-4 transition-all ${script.is_favorite ? "border-white/20" : "border-border"
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleFavorite(script.id, script.is_favorite)}>
                                                {script.is_favorite
                                                    ? <Star className="w-4 h-4 text-neutral-300 fill-neutral-300" />
                                                    : <StarOff className="w-4 h-4 text-neutral-600" />}
                                            </button>
                                            <span className="text-sm font-medium text-white truncate max-w-[300px]">{script.title}</span>
                                            {script.hook_type && (
                                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${hookColors[script.hook_type] || "bg-neutral-500/20 text-neutral-400"}`}>
                                                    {script.hook_type}
                                                </span>
                                            )}
                                            {script.viral_score && (
                                                <span className="text-[10px] font-bold text-neutral-400">{script.viral_score}/100</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => copyToClipboard(script.content, script.id)}
                                                className="text-neutral-500 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                                                {copied === script.id ? <Check className="w-3.5 h-3.5 text-neutral-300" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => deleteScript(script.id)}
                                                className="text-neutral-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-neutral-300 whitespace-pre-wrap line-clamp-4">{script.content}</p>
                                    <p className="text-[10px] text-neutral-600 mt-2">{new Date(script.created_at).toLocaleDateString("es-LA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
