"use client";

import { useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import {
    Video, Loader2, Sparkles, Check,
    Clock, Camera, Music, Type, Megaphone, Save,
    Play, Film, Clapperboard, Lightbulb,
    Link2, Globe, Download, RefreshCw, Palette,
    Wand2, ImagePlus, Zap, Star, TrendingUp,
    ChevronRight, ArrowRight, Eye
} from "lucide-react";

interface BrandProfile {
    brandName: string; industry: string; tagline: string; tone: string;
    audience: string; keyMessages: string[]; visualStyle: string;
    colors: { primary: string; secondary: string; accent: string };
    suggestedVideoTopics: string[]; suggestedVideoStyle: string;
    contentThemes: string[]; competitiveEdge: string;
}

interface VideoConcept {
    id: number; title: string;
    videoPrompt: string; imagePrompt: string; thumbnailPrompt: string;
    qualityScore: number; impactReason: string;
    mood: string; cameraStyle: string; lightingStyle: string;
    suggestedMode: string; hashtags: string[]; bestPostingTime: string;
}

const platforms = [
    { id: "tiktok", label: "TikTok", icon: "📱", desc: "9:16 • 15-60s", color: "border-white/20 bg-white/5" },
    { id: "reels", label: "Reels", icon: "📸", desc: "9:16 • 15-30s", color: "border-white/20 bg-white/5" },
    { id: "shorts", label: "Shorts", icon: "▶️", desc: "9:16 • 30-60s", color: "border-white/20 bg-white/5" },
    { id: "youtube", label: "YouTube", icon: "🎬", desc: "16:9 • 3-10min", color: "border-white/20 bg-white/5" },
    { id: "stories", label: "Stories", icon: "⏰", desc: "9:16 • 15s", color: "border-white/20 bg-white/5" },
];

const styles = [
    { id: "educativo", label: "Educativo", emoji: "📚" },
    { id: "storytelling", label: "Storytelling", emoji: "📖" },
    { id: "controversial", label: "Controversial", emoji: "🔥" },
    { id: "tutorial", label: "Tutorial", emoji: "👨‍🏫" },
    { id: "lifestyle", label: "Lifestyle", emoji: "✨" },
    { id: "humor", label: "Humor", emoji: "😂" },
    { id: "testimonial", label: "Testimonial", emoji: "⭐" },
];

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 80 ? "text-neutral-200 bg-white/10 border-white/20"
        : score >= 60 ? "text-neutral-300 bg-white/5 border-white/15"
            : "text-neutral-400 bg-white/5 border-white/10";
    return (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${color}`}>
            <TrendingUp className="w-3 h-3" /> {score}/100
        </div>
    );
}

export default function StudioPage() {
    const user = useStore((s) => s.user);
    const username = user?.ownTiktok?.replace("@", "") || "";

    // Step management
    const [step, setStep] = useState(1);

    // Step 1: Config
    const [platform, setPlatform] = useState("tiktok");
    const [style, setStyle] = useState("educativo");
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState("30-60s");

    // Brand Analyzer
    const [brandUrl, setBrandUrl] = useState("");
    const [brandLoading, setBrandLoading] = useState(false);
    const [brand, setBrand] = useState<BrandProfile | null>(null);

    // AI Director
    const [directorLoading, setDirectorLoading] = useState(false);
    const [concepts, setConcepts] = useState<VideoConcept[]>([]);
    const [directorNotes, setDirectorNotes] = useState("");
    const [selectedConcept, setSelectedConcept] = useState<VideoConcept | null>(null);

    // Step 2: Visual Studio
    const [imageLoading, setImageLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [videoMode, setVideoMode] = useState<"text" | "image">("text");
    const [customPrompt, setCustomPrompt] = useState("");
    const [selectedModel, setSelectedModel] = useState("kling-v3");

    // Step 3: Video
    const [videoLoading, setVideoLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoError, setVideoError] = useState("");
    const [videoProgress, setVideoProgress] = useState("");

    const [copied, setCopied] = useState<string | null>(null);

    // ═══ BRAND ANALYZER ═══
    const analyzeBrand = async () => {
        if (!brandUrl.trim()) return;
        setBrandLoading(true); setBrand(null);
        try {
            const res = await fetch("/api/analyze-brand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: brandUrl }) });
            const json = await res.json();
            if (json.brand) {
                setBrand(json.brand);
                if (json.brand.suggestedVideoTopics?.length && !topic) setTopic(json.brand.suggestedVideoTopics[0]);
            }
        } catch (e) { console.error(e); }
        finally { setBrandLoading(false); }
    };

    // ═══ AI DIRECTOR ═══
    const runDirector = async () => {
        if (!topic.trim()) return;
        setDirectorLoading(true); setConcepts([]); setSelectedConcept(null);
        try {
            const res = await fetch("/api/video-director", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topic, platform, style, duration, username, brandContext: brand }),
            });
            const json = await res.json();
            if (json.concepts) {
                setConcepts(json.concepts);
                setDirectorNotes(json.directorNotes || "");
                // Auto-select best concept
                const best = json.concepts.sort((a: VideoConcept, b: VideoConcept) => b.qualityScore - a.qualityScore)[0];
                setSelectedConcept(best);
                setCustomPrompt(best.videoPrompt);
                setVideoMode(best.suggestedMode === "image-to-video" ? "image" : "text");
            }
        } catch (e) { console.error(e); }
        finally { setDirectorLoading(false); }
    };

    // ═══ GENERATE SUPPORT IMAGE ═══
    const generateImage = async (prompt?: string) => {
        const imgPrompt = prompt || selectedConcept?.imagePrompt;
        if (!imgPrompt) return;
        setImageLoading(true); setGeneratedImage(null);
        try {
            const res = await fetch("/api/generate-image", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imgPrompt, aspectRatio: platform === "youtube" ? "16:9" : "9:16" }),
            });
            const json = await res.json();
            if (json.imageUrl) {
                setGeneratedImage(json.imageUrl);
                setVideoMode("image");
            }
        } catch (e) { console.error(e); }
        finally { setImageLoading(false); }
    };

    // ═══ GENERATE VIDEO ═══
    const generateVideo = async () => {
        const prompt = customPrompt || selectedConcept?.videoPrompt || topic;
        if (!prompt.trim()) return;
        setVideoLoading(true); setVideoUrl(null); setVideoError(""); setVideoProgress("Sending to AI...");

        try {
            const res = await fetch("/api/render-video", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt, platform,
                    mode: videoMode,
                    model: selectedModel,
                    imageUrl: videoMode === "image" ? generatedImage : undefined,
                }),
            });
            const json = await res.json();

            if (!json.success || !json.predictionId) {
                setVideoError(json.error || "Failed to start"); setVideoLoading(false); return;
            }

            const predictionId = json.predictionId;
            setVideoProgress("AI is generating your video...");
            const startTime = Date.now();

            const poll = async () => {
                try {
                    const statusRes = await fetch(`/api/render-video?id=${predictionId}`);
                    const s = await statusRes.json();
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);

                    if (s.status === "succeeded" && s.videoUrl) {
                        setVideoUrl(typeof s.videoUrl === "string" ? s.videoUrl : String(s.videoUrl));
                        setVideoLoading(false); setVideoProgress(""); return;
                    }
                    if (s.status === "failed" || s.status === "canceled") {
                        setVideoError(s.error || "Video generation failed");
                        setVideoLoading(false); setVideoProgress(""); return;
                    }
                    setVideoProgress(s.status === "starting" ? `Initializing AI (${elapsed}s)...` : `Rendering video (${elapsed}s)... ~2-3 min`);
                    setTimeout(poll, 5000);
                } catch (e: any) { setVideoError(e.message); setVideoLoading(false); setVideoProgress(""); }
            };
            setTimeout(poll, 3000);
        } catch (e: any) { setVideoError(e.message); setVideoLoading(false); setVideoProgress(""); }
    };

    const saveToLibrary = async () => {
        if (!selectedConcept || !user?.id) return;
        const content = `🎬 ${selectedConcept.title}\n\n📹 Prompt: ${selectedConcept.videoPrompt}\n\n🖼️ Image: ${selectedConcept.imagePrompt}\n\n⭐ Quality: ${selectedConcept.qualityScore}/100\n\n#️⃣ ${selectedConcept.hashtags.join(" ")}`;
        await fetch("/api/scripts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: user.id, title: `🎬 ${selectedConcept.title}`, content, hookType: "video_concept" }) });
        setCopied("saved"); setTimeout(() => setCopied(null), 2000);
    };

    const stepLabels = ["Configure", "Visual Studio", "Generate"];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <Clapperboard className="w-7 h-7 text-neutral-400" /> Video Studio Pro
                </h1>
                <p className="text-neutral-400 text-sm">Intelligence-driven AI video production for maximum impact.</p>
            </div>

            {/* Step Progress */}
            <div className="flex items-center gap-2">
                {stepLabels.map((label, i) => (
                    <button key={i} onClick={() => (i + 1 <= step || concepts.length > 0) && setStep(i + 1)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${step === i + 1
                            ? "bg-white/10 text-neutral-200 border border-white/20"
                            : step > i + 1 ? "bg-white/5 text-neutral-300 border border-white/10"
                                : "bg-neutral-900 text-neutral-600 border border-neutral-800"}`}>
                        {step > i + 1 ? <Check className="w-4 h-4" /> : <span className="w-5 h-5 rounded-full bg-neutral-800 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>}
                        {label}
                    </button>
                ))}
            </div>

            {/* ═══════════ STEP 1: CONFIGURE ═══════════ */}
            {step === 1 && (
                <div className="space-y-4">
                    {/* Brand Analyzer */}
                    <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-bold text-white">Brand Analyzer</span>
                            <span className="text-[10px] text-neutral-500">Optional — paste URL for context</span>
                        </div>
                        <div className="flex gap-2">
                            <input value={brandUrl} onChange={e => setBrandUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && analyzeBrand()}
                                placeholder="https://example.com or social profile URL"
                                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20" />
                            <button onClick={analyzeBrand} disabled={brandLoading || !brandUrl.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 transition-all">
                                {brandLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Analyze
                            </button>
                        </div>
                        {brand && (
                            <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 animate-in fade-in">
                                <div className="flex items-center justify-between mb-2">
                                    <div><h3 className="text-base font-bold text-white">{brand.brandName}</h3>
                                        <p className="text-xs text-neutral-400">{brand.industry} • {brand.tone}</p></div>
                                    <div className="flex gap-1">
                                        {[brand.colors.primary, brand.colors.secondary, brand.colors.accent].map((c, i) => (
                                            <div key={i} className="w-5 h-5 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                                {brand.suggestedVideoTopics?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {brand.suggestedVideoTopics.map((t, i) => (
                                            <button key={i} onClick={() => setTopic(t)}
                                                className="text-[10px] bg-white/5 text-neutral-300 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition-all">{t}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Config Form */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Platform</label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                {platforms.map(p => (
                                    <button key={p.id} onClick={() => setPlatform(p.id)}
                                        className={`p-2.5 rounded-xl border text-left transition-all ${platform === p.id ? `${p.color} border-2` : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"}`}>
                                        <span className="text-lg">{p.icon}</span>
                                        <p className="text-sm font-medium text-white mt-0.5">{p.label}</p>
                                        <p className="text-[10px] text-neutral-500">{p.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">Style</label>
                            <div className="flex flex-wrap gap-2">
                                {styles.map(s => (
                                    <button key={s.id} onClick={() => setStyle(s.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${style === s.id ? "bg-white/10 text-neutral-200 border border-white/20" : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-neutral-300"}`}>
                                        {s.emoji} {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-neutral-500 uppercase tracking-wider mb-1 block">Topic / Idea</label>
                            <input value={topic} onChange={e => setTopic(e.target.value)}
                                placeholder="e.g. 'Los 3 errores fatales en forex que nadie te dice'"
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20" />
                        </div>
                    </div>

                    {/* AI DIRECTOR BUTTON */}
                    <button onClick={async () => { await runDirector(); if (concepts.length === 0) return; setStep(2); }} disabled={directorLoading || !topic.trim()}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-black rounded-2xl font-bold hover:bg-neutral-200 transition-all disabled:opacity-50 shadow-lg shadow-white/10 text-base">
                        {directorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                        {directorLoading ? "AI Director analyzing data..." : "🧠 Launch AI Director"}
                    </button>

                    {/* DIRECTOR RESULTS */}
                    {concepts.length > 0 && (
                        <div className="space-y-3 animate-in fade-in">
                            {directorNotes && (
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-neutral-300 flex items-start gap-2">
                                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" /> {directorNotes}
                                </div>
                            )}
                            <div className="grid gap-3">
                                {concepts.map((c) => (
                                    <button key={c.id} onClick={() => { setSelectedConcept(c); setCustomPrompt(c.videoPrompt); setVideoMode(c.suggestedMode === "image-to-video" ? "image" : "text"); }}
                                        className={`text-left bg-card border rounded-2xl p-4 transition-all hover:border-white/30 ${selectedConcept?.id === c.id ? "border-white/40 ring-1 ring-white/10" : "border-border"}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-neutral-500">#{c.id}</span>
                                                <h3 className="text-sm font-bold text-white">{c.title}</h3>
                                            </div>
                                            <ScoreBadge score={c.qualityScore} />
                                        </div>
                                        <p className="text-xs text-neutral-400 mb-2 line-clamp-2">{c.videoPrompt}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full">{c.mood}</span>
                                            <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full">{c.cameraStyle}</span>
                                            <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full">{c.lightingStyle}</span>
                                            <span className="text-[10px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full">{c.suggestedMode}</span>
                                        </div>
                                        <p className="text-[10px] text-neutral-500 mt-2 flex items-center gap-1"><Zap className="w-3 h-3 text-neutral-400" /> {c.impactReason}</p>
                                    </button>
                                ))}
                            </div>
                            {selectedConcept && (
                                <button onClick={() => setStep(2)}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-neutral-200 transition-all text-sm">
                                    Continue with &ldquo;{selectedConcept.title}&rdquo; <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════ STEP 2: VISUAL STUDIO ═══════════ */}
            {step === 2 && selectedConcept && (
                <div className="space-y-4">
                    {/* Selected Concept Summary */}
                    <div className="bg-card border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Film className="w-5 h-5 text-neutral-400" /> {selectedConcept.title}
                                </h2>
                                <p className="text-xs text-neutral-400 mt-0.5">{selectedConcept.mood} • {selectedConcept.cameraStyle} • {selectedConcept.lightingStyle}</p>
                            </div>
                            <ScoreBadge score={selectedConcept.qualityScore} />
                        </div>
                    </div>

                    {/* Video Mode Selector */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setVideoMode("text")}
                            className={`p-4 rounded-2xl border text-left transition-all ${videoMode === "text" ? "border-white/30 bg-white/5 ring-1 ring-white/10" : "border-neutral-800 bg-card hover:border-neutral-700"}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Type className="w-5 h-5 text-neutral-300" />
                                <span className="text-sm font-bold text-white">Text → Video</span>
                            </div>
                            <p className="text-[10px] text-neutral-500">Fast generation from text prompt. AI creates everything from scratch.</p>
                            <p className="text-[10px] text-neutral-400 mt-1">⚡ ~2 min • $0.25</p>
                        </button>
                        <button onClick={() => setVideoMode("image")}
                            className={`p-4 rounded-2xl border text-left transition-all ${videoMode === "image" ? "border-white/30 bg-white/5 ring-1 ring-white/10" : "border-neutral-800 bg-card hover:border-neutral-700"}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <ImagePlus className="w-5 h-5 text-neutral-300" />
                                <span className="text-sm font-bold text-white">Image → Video</span>
                                <span className="text-[9px] bg-white/10 text-neutral-300 px-1.5 py-0.5 rounded-full">PRO</span>
                            </div>
                            <p className="text-[10px] text-neutral-500">Generate AI image first, then animate it. More control, higher quality.</p>
                            <p className="text-[10px] text-neutral-400 mt-1">⏱️ ~3 min • $0.30</p>
                        </button>
                    </div>

                    {/* AI Engine Selector */}
                    <div className="bg-card border border-border rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-bold text-white">AI Engine</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "kling-v3", name: "Kling V3", tier: "🏆 Best", desc: "Cinematic 4K, realistic physics", speed: "~3 min", badge: "bg-white/10 text-neutral-200 border-white/20" },
                                { id: "wan-2.1", name: "Wan 2.1", tier: "⚡ Fast", desc: "Open-source powerhouse, great quality", speed: "~2 min", badge: "bg-white/5 text-neutral-300 border-white/15" },
                                { id: "minimax", name: "Minimax", tier: "💰 Budget", desc: "Decent quality, most affordable", speed: "~2 min", badge: "bg-white/5 text-neutral-400 border-white/10" },
                            ].map(m => (
                                <button key={m.id} onClick={() => setSelectedModel(m.id)}
                                    className={`p-3 rounded-xl border text-left transition-all ${selectedModel === m.id ? `${m.badge} border-2 ring-1 ring-current/20` : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"}`}>
                                    <p className="text-xs font-bold text-white">{m.name}</p>
                                    <p className="text-[9px] text-neutral-500 mt-0.5">{m.desc}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[9px] font-semibold">{m.tier}</span>
                                        <span className="text-[9px] text-neutral-600">{m.speed}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Generation (Image Mode) */}
                    {videoMode === "image" && (
                        <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <ImagePlus className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm font-bold text-white">First Frame Image</span>
                                <span className="text-[10px] text-neutral-500">This image will be the starting frame of your video</span>
                            </div>
                            <p className="text-xs text-neutral-400 bg-neutral-900/80 p-3 rounded-lg">{selectedConcept.imagePrompt}</p>

                            {!generatedImage && (
                                <button onClick={() => generateImage()} disabled={imageLoading}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 transition-all">
                                    {imageLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                    {imageLoading ? "Generating image (~10s)..." : "Generate First Frame"}
                                </button>
                            )}

                            {generatedImage && (
                                <div className="space-y-2">
                                    <div className="flex justify-center bg-black rounded-xl overflow-hidden">
                                        <img src={generatedImage} alt="First frame"
                                            className={`max-h-[350px] rounded-xl ${platform === "youtube" ? "w-full aspect-video object-cover" : "aspect-[9/16] max-w-[200px] object-cover"}`} />
                                    </div>
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={() => generateImage()} disabled={imageLoading}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 text-white rounded-lg text-xs hover:bg-neutral-700 border border-neutral-700">
                                            <RefreshCw className="w-3 h-3" /> Regenerate
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Video Prompt Editor */}
                    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-bold text-white">Video Prompt</span>
                            <span className="text-[10px] text-neutral-500">Edit or use as-is</span>
                        </div>
                        <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={4}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button onClick={() => setStep(1)} className="px-4 py-3 bg-neutral-800 text-neutral-400 rounded-xl text-sm hover:bg-neutral-700 transition-all border border-neutral-700">← Back</button>
                        <button onClick={() => { setStep(3); generateVideo(); }}
                            disabled={videoMode === "image" && !generatedImage}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-all shadow-lg shadow-white/10 text-sm">
                            <Video className="w-5 h-5" /> Generate Video <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════ STEP 3: GENERATE & REVIEW ═══════════ */}
            {step === 3 && (
                <div className="space-y-4">
                    {/* Selected concept info */}
                    {selectedConcept && (
                        <div className="bg-card border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                    <Film className="w-4 h-4 text-neutral-400" /> {selectedConcept.title}
                                </h2>
                                <p className="text-[10px] text-neutral-500 mt-0.5">
                                    {videoMode === "image" ? "🖼️ Image → Video" : "📝 Text → Video"} • {platform.toUpperCase()} • {selectedConcept.mood}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <ScoreBadge score={selectedConcept.qualityScore} />
                                <button onClick={saveToLibrary} className="flex items-center gap-1 px-3 py-1.5 bg-white text-black rounded-lg text-xs hover:bg-neutral-200">
                                    {copied === "saved" ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />} Save
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {videoLoading && (
                        <div className="bg-card border border-white/5 rounded-2xl p-10 text-center">
                            <div className="relative w-20 h-20 mx-auto mb-5">
                                <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                                <div className="absolute inset-2 rounded-full border-2 border-white/5 border-b-white/30 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                                <Video className="w-7 h-7 text-neutral-300 absolute inset-0 m-auto" />
                            </div>
                            <p className="text-white font-semibold text-lg">Creating your video...</p>
                            <p className="text-sm text-neutral-400 mt-2">{videoProgress}</p>
                            {generatedImage && videoMode === "image" && (
                                <div className="mt-4 mx-auto max-w-[120px]">
                                    <img src={generatedImage} alt="" className="rounded-lg opacity-50 aspect-[9/16] w-full object-cover" />
                                    <p className="text-[10px] text-neutral-600 mt-1">Using this as first frame</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Video Error */}
                    {videoError && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <p className="text-red-400 font-medium text-sm mb-1">⚠️ Video Generation</p>
                            <p className="text-red-300/70 text-xs">{videoError}</p>
                            <button onClick={generateVideo} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-500">
                                <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                        </div>
                    )}

                    {/* Video Preview */}
                    {videoUrl && (
                        <div className="bg-card border border-white/10 rounded-2xl p-5 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Play className="w-5 h-5 text-neutral-300" /> Your Video is Ready!
                                </h3>
                                <div className="flex gap-2">
                                    <a href={videoUrl} download target="_blank"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200">
                                        <Download className="w-4 h-4" /> Download MP4
                                    </a>
                                    <button onClick={generateVideo}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 text-white rounded-lg text-sm hover:bg-neutral-700 border border-neutral-700">
                                        <RefreshCw className="w-4 h-4" /> Regenerate
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-center bg-black rounded-xl overflow-hidden">
                                <video src={videoUrl} controls autoPlay loop
                                    className={`rounded-xl max-h-[500px] ${platform === "youtube" ? "w-full aspect-video" : "aspect-[9/16] max-w-[280px]"}`} />
                            </div>

                            {selectedConcept && (
                                <div className="mt-4 grid grid-cols-3 gap-3">
                                    <div className="bg-neutral-900 rounded-lg p-3 text-center">
                                        <TrendingUp className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-white">{selectedConcept.qualityScore}</p>
                                        <p className="text-[10px] text-neutral-500">Impact Score</p>
                                    </div>
                                    <div className="bg-neutral-900 rounded-lg p-3 text-center">
                                        <Clock className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-white">{selectedConcept.bestPostingTime}</p>
                                        <p className="text-[10px] text-neutral-500">Best Time</p>
                                    </div>
                                    <div className="bg-neutral-900 rounded-lg p-3 text-center">
                                        <Star className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-white capitalize">{selectedConcept.mood}</p>
                                        <p className="text-[10px] text-neutral-500">Mood</p>
                                    </div>
                                </div>
                            )}

                            {selectedConcept?.hashtags && (
                                <div className="flex flex-wrap gap-1 mt-3">
                                    {selectedConcept.hashtags.map((h, i) => (
                                        <span key={i} className="text-[10px] text-neutral-400 bg-white/5 px-1.5 py-0.5 rounded">#{h.replace("#", "")}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    {!videoLoading && (
                        <div className="flex gap-3">
                            <button onClick={() => setStep(2)} className="px-4 py-2.5 bg-neutral-800 text-neutral-400 rounded-xl text-sm hover:bg-neutral-700 border border-neutral-700">← Back to Studio</button>
                            <button onClick={() => { setStep(1); setConcepts([]); setSelectedConcept(null); setVideoUrl(null); setGeneratedImage(null); setVideoError(""); }}
                                className="px-4 py-2.5 bg-white text-black rounded-xl text-sm hover:bg-neutral-200">🎬 New Video</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
