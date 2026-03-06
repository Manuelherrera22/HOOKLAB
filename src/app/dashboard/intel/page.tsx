"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import {
    Search, Loader2, User, Eye, Heart, MessageCircle, Hash,
    TrendingUp, TrendingDown, Target, ShieldAlert, Zap,
    FileText, ArrowUpRight, Sparkles, Brain, Radar,
    Users, ShoppingBag, HelpCircle, AlertTriangle, Rocket, CheckCircle2,
    Swords, Plus, X
} from "lucide-react";

interface IntelData {
    leadProfile: any;
    hooks: any[];
    contentSpy: any;
    audienceMirror: any;
    trendRadar: any;
    mediakit: any;
}

const PHASES = [
    "Scraping videos", "Lead profiling", "Hook decoding",
    "Content spy", "Audience mirror", "Trend radar", "Mediakit PDF"
];

export default function IntelligencePage() {
    const user = useStore((s) => s.user);
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<IntelData | null>(null);
    const [activeTab, setActiveTab] = useState<string>("profile");

    // Mission state
    const [missionId, setMissionId] = useState<string | null>(null);
    const [missionStatus, setMissionStatus] = useState<string | null>(null);
    const [missionPhase, setMissionPhase] = useState(0);

    // Battle Map state
    const [battleCompetitors, setBattleCompetitors] = useState<string[]>([""]);
    const [battleLoading, setBattleLoading] = useState(false);
    const [battleData, setBattleData] = useState<any>(null);

    const runBattleMap = async () => {
        const allUsers = [username, ...battleCompetitors.filter(c => c.trim())];
        if (allUsers.length < 2) return;
        setBattleLoading(true);
        try {
            const res = await fetch("/api/battle-map", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usernames: allUsers }),
            });
            const json = await res.json();
            setBattleData(json);
        } catch (e) {
            console.error("Battle map error:", e);
        } finally {
            setBattleLoading(false);
        }
    };

    const fetchIntel = useCallback(async (uname: string) => {
        if (!uname.trim()) return;
        setLoading(true);
        try {
            const clean = uname.replace("@", "").trim();
            const res = await fetch(`/api/intel?username=${encodeURIComponent(clean)}`);
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error("Intel fetch error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-load if user has a TikTok
    useEffect(() => {
        if (user?.ownTiktok) {
            const clean = user.ownTiktok.replace("@", "");
            setUsername(clean);
            fetchIntel(clean);
        }
    }, [user?.ownTiktok, fetchIntel]);

    // Poll mission status
    useEffect(() => {
        if (!missionId || missionStatus === "completed" || missionStatus === "failed") return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/scrape-mission?missionId=${missionId}`);
                const json = await res.json();
                const status = json.mission?.status;
                setMissionStatus(status);
                // Animate phase progress
                if (status === "running") {
                    setMissionPhase(prev => Math.min(prev + 1, PHASES.length - 1));
                }
                if (status === "completed") {
                    setMissionPhase(PHASES.length);
                    // Auto-refresh intel data
                    setTimeout(() => fetchIntel(username), 1000);
                }
            } catch (e) {
                console.error("Poll error:", e);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [missionId, missionStatus, username, fetchIntel]);

    const handleSearch = () => fetchIntel(username);

    const handleRunFullReport = async () => {
        if (!username.trim() || !user?.id) return;
        setMissionStatus("pending");
        setMissionPhase(0);
        try {
            const res = await fetch("/api/scrape-mission", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: user.id,
                    username: username.replace("@", "").trim(),
                    platform: "tiktok",
                    missionType: "full_report",
                }),
            });
            const json = await res.json();
            setMissionId(json.missionId);
            setMissionStatus(json.status);
        } catch (e) {
            console.error("Run report error:", e);
            setMissionStatus("failed");
        }
    };

    const tabs = [
        { id: "profile", label: "Lead Profile", icon: User, color: "text-blue-400" },
        { id: "hooks", label: "Hooks", icon: Zap, color: "text-amber-400" },
        { id: "spy", label: "Content Spy", icon: Eye, color: "text-green-400" },
        { id: "audience", label: "Audience", icon: Users, color: "text-purple-400" },
        { id: "trends", label: "Trends", icon: Radar, color: "text-cyan-400" },
        { id: "mediakit", label: "Mediakit", icon: FileText, color: "text-pink-400" },
        { id: "battle", label: "Battle Map", icon: Swords, color: "text-orange-400" },
    ];

    const fmt = (n: number) => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
        if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
        return n?.toLocaleString() ?? "0";
    };

    const hasAnyData = data && (data.leadProfile || data.hooks?.length || data.contentSpy || data.audienceMirror || data.trendRadar || data.mediakit);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <Brain className="w-7 h-7 text-fuchsia-400" />
                    Intelligence Hub
                </h1>
                <p className="text-neutral-400 text-sm">Full commercial intelligence profile — powered by AI analysis.</p>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Enter TikTok username (e.g. kiyosaki.criollo)"
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !username.trim()}
                    className="flex items-center gap-2 px-5 py-3 bg-fuchsia-600 text-white rounded-xl font-medium hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{loading ? "Loading..." : "View Data"}</span>
                </button>
                <button
                    onClick={handleRunFullReport}
                    disabled={!username.trim() || missionStatus === "pending" || missionStatus === "running"}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-xl font-medium hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                >
                    {missionStatus === "pending" || missionStatus === "running"
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Rocket className="w-4 h-4" />}
                    <span>{missionStatus === "pending" ? "Queued..." : missionStatus === "running" ? "Analyzing..." : "Run Full Analysis"}</span>
                </button>
            </div>

            {/* Mission Progress */}
            {(missionStatus === "pending" || missionStatus === "running") && (
                <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-4">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                        <p className="text-sm font-semibold text-white">Full Report in progress for @{username}</p>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {PHASES.map((phase, i) => (
                            <div key={i} className="text-center">
                                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all duration-500 ${i < missionPhase ? "bg-emerald-500 text-white" :
                                    i === missionPhase ? "bg-emerald-500/30 text-emerald-400 ring-2 ring-emerald-500/50 animate-pulse" :
                                        "bg-neutral-800 text-neutral-600"
                                    }`}>
                                    {i < missionPhase ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                </div>
                                <p className={`text-[10px] ${i <= missionPhase ? "text-emerald-400" : "text-neutral-600"}`}>{phase}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {missionStatus === "completed" && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-2 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm text-emerald-300">Full report completed! Data refreshed automatically.</p>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin" />
                        <p className="text-neutral-500 text-sm animate-pulse">Loading intelligence data...</p>
                    </div>
                </div>
            )}

            {!loading && !hasAnyData && username && (
                <div className="text-center py-20">
                    <Brain className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500">No intelligence data found for <span className="text-white font-semibold">@{username}</span></p>
                    <p className="text-neutral-600 text-sm mt-1">Click <strong>Run Full Analysis</strong> above to generate data.</p>
                </div>
            )}

            {!loading && hasAnyData && (
                <>
                    {/* Tab Navigation */}
                    <div className="flex gap-1 overflow-x-auto bg-neutral-900/50 rounded-xl p-1 border border-neutral-800">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? "bg-neutral-800 text-white shadow-lg"
                                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50"
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ""}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="animate-in fade-in duration-300">

                        {/* ═══ LEAD PROFILE ═══ */}
                        {activeTab === "profile" && data?.leadProfile && (
                            <div className="space-y-4">
                                <SectionCard title="Profile Summary" icon={<User className="w-5 h-5 text-blue-400" />}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {Object.entries(data.leadProfile.profile_summary || {}).map(([k, v]) => (
                                            <div key={k} className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{k.replace(/_/g, " ")}</p>
                                                <p className="text-sm text-white">{Array.isArray(v) ? (v as string[]).join(", ") : String(v)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SectionCard title="Buyer Persona" icon={<Target className="w-5 h-5 text-amber-400" />}>
                                        {Object.entries(data.leadProfile.buyer_persona || {}).map(([k, v]) => (
                                            <div key={k} className="mb-3">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{k.replace(/_/g, " ")}</p>
                                                <p className="text-sm text-white">{Array.isArray(v) ? (v as string[]).map((i, idx) => <span key={idx} className="inline-block bg-neutral-800 rounded px-2 py-0.5 mr-1 mb-1 text-xs">{i}</span>) : String(v)}</p>
                                            </div>
                                        ))}
                                    </SectionCard>

                                    <SectionCard title="Sales Approach" icon={<ShoppingBag className="w-5 h-5 text-green-400" />}>
                                        {data.leadProfile.sales_approach?.recommended_pitch && (
                                            <div className="bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20 rounded-lg p-3 mb-3">
                                                <p className="text-xs text-fuchsia-400 font-semibold mb-1">RECOMMENDED PITCH</p>
                                                <p className="text-sm text-white italic">&ldquo;{data.leadProfile.sales_approach.recommended_pitch}&rdquo;</p>
                                            </div>
                                        )}
                                        {data.leadProfile.sales_approach?.products_they_need && (
                                            <div className="mb-3">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Products They Need</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {data.leadProfile.sales_approach.products_they_need.map((p: string, i: number) => (
                                                        <span key={i} className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs px-2 py-1 rounded-lg">{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {data.leadProfile.sales_approach?.objection_handling && (
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Objection Handling</p>
                                                {data.leadProfile.sales_approach.objection_handling.map((o: string, i: number) => (
                                                    <p key={i} className="text-xs text-neutral-300 mb-1">• {o}</p>
                                                ))}
                                            </div>
                                        )}
                                    </SectionCard>
                                </div>

                                <SectionCard title="Content Patterns" icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {Object.entries(data.leadProfile.content_patterns || {}).map(([k, v]) => (
                                            <div key={k} className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{k.replace(/_/g, " ")}</p>
                                                <p className="text-sm text-white">{Array.isArray(v) ? (v as string[]).join(", ") : String(v)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {/* ═══ HOOKS ═══ */}
                        {activeTab === "hooks" && data?.hooks?.length > 0 && (
                            <div className="space-y-3">
                                {data.hooks.map((hook, i) => (
                                    <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-amber-500/30 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${hook.hook_type === "shock" ? "bg-red-500/20 text-red-400" :
                                                    hook.hook_type === "question" ? "bg-blue-500/20 text-blue-400" :
                                                        hook.hook_type === "challenge" ? "bg-amber-500/20 text-amber-400" :
                                                            hook.hook_type === "controversy" ? "bg-purple-500/20 text-purple-400" :
                                                                "bg-neutral-500/20 text-neutral-400"
                                                    }`}>
                                                    {hook.hook_type}
                                                </span>
                                                <span className="text-xs text-neutral-500">Hook #{i + 1}</span>
                                            </div>
                                            {(hook.views > 0 || hook.likes > 0) && (
                                                <div className="flex gap-3 text-xs text-neutral-500">
                                                    {hook.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmt(hook.views)}</span>}
                                                    {hook.likes > 0 && <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmt(hook.likes)}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-white font-medium text-sm mb-2">&ldquo;{hook.hook_text}&rdquo;</p>
                                        {hook.structure?.emotional_trigger && (
                                            <p className="text-xs text-fuchsia-400 mb-2">Trigger: {hook.structure.emotional_trigger}</p>
                                        )}
                                        <p className="text-xs text-neutral-400 mb-2">{hook.why_it_worked}</p>
                                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-lg p-2.5">
                                            <p className="text-xs text-neutral-500 mb-1">TEMPLATE</p>
                                            <p className="text-xs text-amber-300 font-mono">{hook.adaptable_template}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ═══ CONTENT SPY ═══ */}
                        {activeTab === "spy" && data?.contentSpy && (
                            <SectionCard title="Content Spy Report" icon={<Eye className="w-5 h-5 text-green-400" />}>
                                {(() => {
                                    const spy = data.contentSpy.profile_summary?.spy_report || {};
                                    const meta = data.contentSpy.content_patterns || {};
                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                <StatCard label="New Videos" value={meta.new_videos_count ?? 0} color="text-green-400" />
                                                <StatCard label="Tracked" value={meta.total_tracked ?? 0} color="text-blue-400" />
                                                <StatCard label="Trend" value={spy.engagement_trend ?? "N/A"} color="text-amber-400" />
                                            </div>
                                            {meta.strategic_summary && (
                                                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-green-400 font-semibold mb-1">STRATEGIC SUMMARY</p>
                                                    <p className="text-sm text-neutral-300">{meta.strategic_summary}</p>
                                                </div>
                                            )}
                                            {spy.recommendations?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Recommendations</p>
                                                    {spy.recommendations.map((r: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-2 mb-2">
                                                            <ArrowUpRight className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
                                                            <p className="text-sm text-neutral-300">{r}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </SectionCard>
                        )}

                        {/* ═══ AUDIENCE MIRROR ═══ */}
                        {activeTab === "audience" && data?.audienceMirror && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${data.audienceMirror.sentiment === "positive" ? "bg-green-500/20 text-green-400" :
                                        data.audienceMirror.sentiment === "mixed" ? "bg-amber-500/20 text-amber-400" :
                                            data.audienceMirror.sentiment === "negative" ? "bg-red-500/20 text-red-400" :
                                                "bg-neutral-500/20 text-neutral-400"
                                        }`}>
                                        Sentiment: {data.audienceMirror.sentiment}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <SectionCard title="Top Questions" icon={<HelpCircle className="w-5 h-5 text-blue-400" />}>
                                        {(data.audienceMirror.top_questions || []).map((q: string, i: number) => (
                                            <p key={i} className="text-sm text-neutral-300 mb-2 flex items-start gap-2">
                                                <span className="text-blue-400 shrink-0">?</span> {q}
                                            </p>
                                        ))}
                                    </SectionCard>

                                    <SectionCard title="Objections" icon={<AlertTriangle className="w-5 h-5 text-red-400" />}>
                                        {(data.audienceMirror.objections || []).map((o: string, i: number) => (
                                            <p key={i} className="text-sm text-neutral-300 mb-2 flex items-start gap-2">
                                                <ShieldAlert className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> {o}
                                            </p>
                                        ))}
                                    </SectionCard>

                                    <SectionCard title="Products Requested" icon={<ShoppingBag className="w-5 h-5 text-green-400" />}>
                                        {(data.audienceMirror.product_requests || []).map((p: string, i: number) => (
                                            <p key={i} className="text-sm text-neutral-300 mb-2 flex items-start gap-2">
                                                <ShoppingBag className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" /> {p}
                                            </p>
                                        ))}
                                    </SectionCard>
                                </div>

                                {data.audienceMirror.audience_segments?.length > 0 && (
                                    <SectionCard title="Audience Segments" icon={<Users className="w-5 h-5 text-purple-400" />}>
                                        <div className="space-y-2">
                                            {data.audienceMirror.audience_segments.map((seg: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-full bg-neutral-800 rounded-full h-6 relative overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full flex items-center px-3 ${i === 0 ? "bg-purple-500/30" : i === 1 ? "bg-blue-500/30" : "bg-red-500/30"
                                                                }`}
                                                            style={{ width: `${seg.percentage}%` }}
                                                        >
                                                            <span className="text-xs text-white font-medium whitespace-nowrap">
                                                                {seg.type} — {seg.percentage}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionCard>
                                )}
                            </div>
                        )}

                        {/* ═══ TREND RADAR ═══ */}
                        {activeTab === "trends" && data?.trendRadar && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SectionCard title="Rising Topics" icon={<TrendingUp className="w-5 h-5 text-green-400" />}>
                                        {(data.trendRadar.rising_topics || []).map((t: string, i: number) => (
                                            <p key={i} className="text-sm text-green-300 mb-2 flex items-start gap-2">
                                                <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {t}
                                            </p>
                                        ))}
                                    </SectionCard>

                                    <SectionCard title="Dying Topics" icon={<TrendingDown className="w-5 h-5 text-red-400" />}>
                                        {(data.trendRadar.dying_topics || []).map((t: string, i: number) => (
                                            <p key={i} className="text-sm text-red-300 mb-2 flex items-start gap-2">
                                                <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {t}
                                            </p>
                                        ))}
                                    </SectionCard>
                                </div>

                                <SectionCard title="Trending Hashtags" icon={<Hash className="w-5 h-5 text-cyan-400" />}>
                                    <div className="flex flex-wrap gap-2">
                                        {(data.trendRadar.trending_hashtags || []).map((h: any, i: number) => (
                                            <span
                                                key={i}
                                                className={`text-xs px-3 py-1.5 rounded-lg border font-medium ${h.growth === "rising" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                    h.growth === "declining" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                        "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                                                    }`}
                                            >
                                                {h.tag} {h.growth === "rising" ? "↑" : h.growth === "declining" ? "↓" : "→"}
                                            </span>
                                        ))}
                                    </div>
                                </SectionCard>

                                {data.trendRadar.prediction && (
                                    <SectionCard title="Predictions" icon={<Sparkles className="w-5 h-5 text-amber-400" />}>
                                        <div className="space-y-3">
                                            {data.trendRadar.prediction.next_week && (
                                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-amber-400 font-semibold mb-1">NEXT WEEK</p>
                                                    <p className="text-sm text-neutral-300">{data.trendRadar.prediction.next_week}</p>
                                                </div>
                                            )}
                                            {data.trendRadar.prediction.next_month && (
                                                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-cyan-400 font-semibold mb-1">NEXT MONTH</p>
                                                    <p className="text-sm text-neutral-300">{data.trendRadar.prediction.next_month}</p>
                                                </div>
                                            )}
                                            {data.trendRadar.prediction.avoid && (
                                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-red-400 font-semibold mb-1">AVOID</p>
                                                    <p className="text-sm text-neutral-300">{data.trendRadar.prediction.avoid}</p>
                                                </div>
                                            )}
                                        </div>
                                    </SectionCard>
                                )}
                            </div>
                        )}

                        {/* ═══ MEDIAKIT ═══ */}
                        {activeTab === "mediakit" && data?.mediakit && (
                            <SectionCard title="Mediakit — Verified Stats" icon={<FileText className="w-5 h-5 text-pink-400" />}>
                                {(() => {
                                    const mk = data.mediakit.profile_summary || {};
                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <StatCard label="Total Views" value={fmt(mk.total_views || 0)} color="text-blue-400" icon={<Eye className="w-4 h-4" />} />
                                                <StatCard label="Total Likes" value={fmt(mk.total_likes || 0)} color="text-red-400" icon={<Heart className="w-4 h-4" />} />
                                                <StatCard label="Comments" value={fmt(mk.total_comments || 0)} color="text-amber-400" icon={<MessageCircle className="w-4 h-4" />} />
                                                <StatCard label="Engagement" value={`${mk.engagement_rate || 0}%`} color="text-green-400" icon={<TrendingUp className="w-4 h-4" />} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <StatCard label="Avg Views/Video" value={fmt(mk.avg_views || 0)} color="text-cyan-400" />
                                                <StatCard label="Videos" value={data.mediakit.video_count || 0} color="text-purple-400" />
                                            </div>
                                            {mk.pdf_path && (
                                                <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3">
                                                    <p className="text-xs text-pink-400 font-semibold mb-1">PDF MEDIAKIT</p>
                                                    <p className="text-sm text-neutral-300 truncate">{mk.pdf_path}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </SectionCard>
                        )}
                        {/* ═══ BATTLE MAP ═══ */}
                        {activeTab === "battle" && (
                            <div className="space-y-4">
                                <SectionCard title="Competitor Battle Map" icon={<Swords className="w-5 h-5 text-orange-400" />}>
                                    <p className="text-xs text-neutral-500 mb-3">Add up to 3 competitor usernames to compare against @{username}</p>
                                    <div className="space-y-2 mb-3">
                                        {battleCompetitors.map((c, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input
                                                    value={c}
                                                    onChange={(e) => {
                                                        const updated = [...battleCompetitors];
                                                        updated[i] = e.target.value;
                                                        setBattleCompetitors(updated);
                                                    }}
                                                    placeholder={`Competitor ${i + 1} username`}
                                                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                                                />
                                                {battleCompetitors.length > 1 && (
                                                    <button onClick={() => setBattleCompetitors(prev => prev.filter((_, j) => j !== i))} className="text-neutral-500 hover:text-red-400">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        {battleCompetitors.length < 3 && (
                                            <button onClick={() => setBattleCompetitors(prev => [...prev, ""])} className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white px-3 py-1.5 bg-neutral-800 rounded-lg">
                                                <Plus className="w-3 h-3" /> Add
                                            </button>
                                        )}
                                        <button
                                            onClick={runBattleMap}
                                            disabled={battleLoading || !battleCompetitors.some(c => c.trim())}
                                            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-sm font-medium hover:from-orange-500 hover:to-red-500 transition-all disabled:opacity-50"
                                        >
                                            {battleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Swords className="w-3.5 h-3.5" />}
                                            {battleLoading ? "Analyzing..." : "Compare"}
                                        </button>
                                    </div>
                                </SectionCard>

                                {battleLoading && (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                                            <p className="text-neutral-500 text-sm animate-pulse">AI is comparing accounts...</p>
                                        </div>
                                    </div>
                                )}

                                {!battleLoading && battleData?.accounts && (
                                    <>
                                        {/* Side-by-side stats */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {battleData.accounts.map((acc: any) => (
                                                <div key={acc.username} className={`bg-card border rounded-xl p-4 ${battleData.analysis?.winner === acc.username ? "border-orange-500/40 ring-1 ring-orange-500/20" : "border-border"
                                                    }`}>
                                                    <p className="text-sm font-bold text-white mb-2 truncate">@{acc.username}</p>
                                                    {battleData.analysis?.winner === acc.username && (
                                                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">WINNER</span>
                                                    )}
                                                    <div className="mt-2 space-y-1.5">
                                                        <p className="text-xs text-neutral-400">Videos: <span className="text-white font-medium">{acc.videoCount}</span></p>
                                                        <p className="text-xs text-neutral-400">Views: <span className="text-white font-medium">{acc.totalViews?.toLocaleString()}</span></p>
                                                        <p className="text-xs text-neutral-400">Avg: <span className="text-white font-medium">{acc.avgViews?.toLocaleString()}</span></p>
                                                        <p className="text-xs text-neutral-400">Engagement: <span className="text-emerald-400 font-medium">{acc.engagementRate}%</span></p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* GPT Insights */}
                                        {battleData.analysis?.insights && (
                                            <SectionCard title="AI Competitive Analysis" icon={<Brain className="w-5 h-5 text-orange-400" />}>
                                                <div className="space-y-3">
                                                    {battleData.analysis.insights.map((ins: any, i: number) => (
                                                        <div key={i} className="bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-orange-400 uppercase">{ins.category}</span>
                                                                <span className="text-xs text-neutral-500">Leader: @{ins.leader}</span>
                                                            </div>
                                                            <p className="text-sm text-neutral-300">{ins.analysis}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </SectionCard>
                                        )}

                                        {battleData.analysis?.opportunities && (
                                            <SectionCard title="Opportunities" icon={<Sparkles className="w-5 h-5 text-amber-400" />}>
                                                {battleData.analysis.opportunities.map((o: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-2 mb-2">
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                                        <p className="text-sm text-neutral-300">{o}</p>
                                                    </div>
                                                ))}
                                            </SectionCard>
                                        )}

                                        {battleData.analysis?.recommendation && (
                                            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-4">
                                                <p className="text-xs text-orange-400 font-semibold mb-1">STRATEGIC RECOMMENDATION</p>
                                                <p className="text-sm text-neutral-200">{battleData.analysis.recommendation}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Reusable Components ──────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                {icon} {title}
            </h3>
            {children}
        </div>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
    return (
        <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-xl p-4 text-center">
            {icon && <div className={`${color} mx-auto mb-1`}>{icon}</div>}
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{label}</p>
        </div>
    );
}
