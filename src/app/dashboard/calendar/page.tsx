"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import {
    Calendar as CalendarIcon, Clock, Send, Plus, Trash2,
    Instagram, Youtube, Check, Loader2, Link2,
    ExternalLink, Settings, Zap, ChevronLeft, ChevronRight,
    Video, Image as ImageIcon, FileText, AlertCircle, Globe
} from "lucide-react";

interface ScheduledPost {
    id: string;
    caption: string;
    platforms: string[];
    media_urls: string[];
    video_url: string | null;
    scheduled_date: string;
    status: string;
    concept_title: string | null;
    quality_score: number | null;
    hashtags: string[];
}

const platformIcons: Record<string, { icon: string; color: string }> = {
    instagram: { icon: "📸", color: "bg-pink-500/10 text-pink-400 border-pink-500/30" },
    tiktok: { icon: "📱", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
    youtube: { icon: "🎬", color: "bg-red-500/10 text-red-400 border-red-500/30" },
    facebook: { icon: "📘", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    twitter: { icon: "🐦", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
    linkedin: { icon: "💼", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" },
};

const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function CalendarPage() {
    const user = useStore((s) => s.user);
    const [posts, setPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // New Post
    const [showNewPost, setShowNewPost] = useState(false);
    const [newCaption, setNewCaption] = useState("");
    const [newPlatforms, setNewPlatforms] = useState<string[]>(["instagram", "tiktok"]);
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("09:00");
    const [newHashtags, setNewHashtags] = useState("");
    const [newVideoUrl, setNewVideoUrl] = useState("");
    const [publishing, setPublishing] = useState(false);
    const [publishResult, setPublishResult] = useState("");

    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [ayrshareKey, setAyrshareKey] = useState("");
    const [profiles, setProfiles] = useState<any>(null);
    const [profilesLoading, setProfilesLoading] = useState(false);

    useEffect(() => {
        if (user?.id) loadPosts();
    }, [user?.id]);

    const loadPosts = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/scheduled-posts?accountId=${user.id}&status=all`);
            const json = await res.json();
            if (json.posts) setPosts(json.posts);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createPost = async (publishNow = false) => {
        if (!newCaption.trim() || !user?.id) return;
        setPublishing(true); setPublishResult("");

        const scheduledDate = publishNow
            ? new Date().toISOString()
            : new Date(`${newDate}T${newTime}`).toISOString();

        try {
            if (publishNow && ayrshareKey) {
                // Publish immediately via Ayrshare
                const res = await fetch("/api/publish", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        caption: `${newCaption}\n\n${newHashtags}`,
                        platforms: newPlatforms,
                        mediaUrls: newVideoUrl ? [newVideoUrl] : [],
                        apiKey: ayrshareKey,
                    }),
                });
                const json = await res.json();
                if (json.success) {
                    setPublishResult("✅ Published successfully!");
                } else {
                    setPublishResult(`❌ ${json.error || "Publishing failed"}`);
                }
            }

            // Save to scheduled_posts
            await fetch("/api/scheduled-posts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    accountId: user.id,
                    caption: newCaption,
                    platforms: newPlatforms,
                    hashtags: newHashtags.split(" ").filter(Boolean),
                    videoUrl: newVideoUrl || null,
                    scheduledDate,
                }),
            });

            await loadPosts();
            if (!publishNow) setPublishResult("✅ Scheduled!");
            setTimeout(() => {
                setShowNewPost(false); setNewCaption(""); setNewHashtags("");
                setNewVideoUrl(""); setPublishResult("");
            }, 2000);
        } catch (e: any) { setPublishResult(`❌ ${e.message}`); }
        finally { setPublishing(false); }
    };

    const deletePost = async (id: string) => {
        await fetch("/api/scheduled-posts", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        loadPosts();
    };

    const connectProfiles = async () => {
        if (!ayrshareKey) return;
        setProfilesLoading(true);
        try {
            const res = await fetch(`/api/publish?apiKey=${ayrshareKey}`);
            const json = await res.json();
            if (json.profiles) setProfiles(json.profiles);
        } catch (e) { console.error(e); }
        finally { setProfilesLoading(false); }
    };

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const getPostsForDay = (day: number) => {
        return posts.filter(p => {
            const d = new Date(p.scheduled_date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                        <CalendarIcon className="w-7 h-7 text-violet-400" /> Content Calendar
                    </h1>
                    <p className="text-neutral-400 text-sm">Schedule, publish & automate your content across all platforms.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-sm hover:bg-neutral-700 border border-neutral-700">
                        <Settings className="w-4 h-4" /> Connect Accounts
                    </button>
                    <button onClick={() => { setShowNewPost(true); setNewDate(new Date().toISOString().split("T")[0]); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-500">
                        <Plus className="w-4 h-4" /> New Post
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="bg-card border border-amber-500/20 rounded-2xl p-5 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 mb-2">
                        <Link2 className="w-5 h-5 text-amber-400" />
                        <h2 className="text-base font-bold text-white">Connect Social Accounts</h2>
                    </div>
                    <p className="text-xs text-neutral-400">
                        Use <a href="https://app.ayrshare.com" target="_blank" className="text-amber-400 underline">Ayrshare</a> to connect your social accounts.
                        Sign up free → Connect IG, TikTok, YouTube → Copy your API key below.
                    </p>
                    <div className="flex gap-2">
                        <input value={ayrshareKey} onChange={e => setAyrshareKey(e.target.value)}
                            placeholder="Paste your Ayrshare API Key"
                            type="password"
                            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
                        <button onClick={connectProfiles} disabled={!ayrshareKey || profilesLoading}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-50">
                            {profilesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                        </button>
                    </div>
                    {profiles && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-400">
                            ✅ Connected! Profiles: {JSON.stringify(profiles).slice(0, 200)}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(platformIcons).map(([id, p]) => (
                            <div key={id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs ${p.color}`}>
                                <span>{p.icon}</span> {id}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Calendar */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={prevMonth} className="p-2 hover:bg-neutral-800 rounded-lg"><ChevronLeft className="w-5 h-5 text-neutral-400" /></button>
                    <h2 className="text-lg font-bold text-white">{months[month]} {year}</h2>
                    <button onClick={nextMonth} className="p-2 hover:bg-neutral-800 rounded-lg"><ChevronRight className="w-5 h-5 text-neutral-400" /></button>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {daysOfWeek.map(d => (
                        <div key={d} className="text-center text-[10px] text-neutral-500 font-medium py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dayPosts = getPostsForDay(day);
                        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                        const isSelected = selectedDate?.getFullYear() === year && selectedDate?.getMonth() === month && selectedDate?.getDate() === day;

                        return (
                            <button key={day} onClick={() => setSelectedDate(new Date(year, month, day))}
                                className={`relative p-1 min-h-[60px] rounded-lg border text-left transition-all hover:border-violet-500/30
                                    ${isToday ? "border-violet-500/50 bg-violet-500/5" : isSelected ? "border-fuchsia-500/50 bg-fuchsia-500/5" : "border-neutral-800/50 bg-neutral-900/30"}`}>
                                <span className={`text-xs font-medium ${isToday ? "text-violet-400" : "text-neutral-500"}`}>{day}</span>
                                {dayPosts.length > 0 && (
                                    <div className="mt-0.5 space-y-0.5">
                                        {dayPosts.slice(0, 2).map(p => (
                                            <div key={p.id} className={`text-[8px] px-1 py-0.5 rounded truncate ${p.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                {p.platforms.map(pp => platformIcons[pp]?.icon || "📦").join("")} {p.concept_title || p.caption.slice(0, 15)}
                                            </div>
                                        ))}
                                        {dayPosts.length > 2 && <span className="text-[8px] text-neutral-500">+{dayPosts.length - 2}</span>}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day Posts */}
            {selectedDate && (
                <div className="bg-card border border-border rounded-2xl p-5 animate-in fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-white">
                            {selectedDate.getDate()} {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                        </h3>
                        <button onClick={() => { setShowNewPost(true); setNewDate(selectedDate.toISOString().split("T")[0]); }}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Post</button>
                    </div>
                    {getPostsForDay(selectedDate.getDate()).length === 0 ? (
                        <p className="text-xs text-neutral-500 py-4 text-center">No posts scheduled for this day</p>
                    ) : (
                        <div className="space-y-2">
                            {getPostsForDay(selectedDate.getDate()).map(p => (
                                <div key={p.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            {p.platforms.map(pp => (
                                                <span key={pp} className={`text-[10px] px-1.5 py-0.5 rounded border ${platformIcons[pp]?.color || "bg-neutral-500/10 text-neutral-400"}`}>
                                                    {platformIcons[pp]?.icon} {pp}
                                                </span>
                                            ))}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === "published" ? "bg-emerald-500/10 text-emerald-400" : p.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-neutral-500">
                                                {new Date(p.scheduled_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                            {p.status === "scheduled" && (
                                                <button onClick={() => deletePost(p.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                    </div>
                                    {p.concept_title && <p className="text-xs font-medium text-white mb-1">🎬 {p.concept_title}</p>}
                                    <p className="text-xs text-neutral-400 line-clamp-2">{p.caption}</p>
                                    {p.video_url && <p className="text-[10px] text-violet-400 mt-1 flex items-center gap-1"><Video className="w-3 h-3" /> Video attached</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Upcoming Posts */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Upcoming Posts</h3>
                {loading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
                ) : posts.filter(p => p.status === "scheduled").length === 0 ? (
                    <p className="text-xs text-neutral-500 py-4 text-center">No scheduled posts. Click &quot;New Post&quot; to create one.</p>
                ) : (
                    <div className="space-y-2">
                        {posts.filter(p => p.status === "scheduled").slice(0, 10).map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 mb-1">
                                        {p.platforms.map(pp => <span key={pp} className="text-xs">{platformIcons[pp]?.icon}</span>)}
                                        {p.quality_score && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full">{p.quality_score}/100</span>}
                                    </div>
                                    <p className="text-xs text-neutral-300 truncate">{p.concept_title || p.caption.slice(0, 60)}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                    <span className="text-[10px] text-neutral-500 whitespace-nowrap">
                                        {new Date(p.scheduled_date).toLocaleDateString("es", { month: "short", day: "numeric" })} {new Date(p.scheduled_date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                    <button onClick={() => deletePost(p.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Post Modal */}
            {showNewPost && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewPost(false)}>
                    <div className="bg-card border border-violet-500/20 rounded-2xl p-6 w-full max-w-lg space-y-4 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2"><Send className="w-5 h-5 text-violet-400" /> New Post</h2>

                        {/* Platforms */}
                        <div>
                            <label className="text-[10px] text-neutral-500 uppercase mb-1.5 block">Platforms</label>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(platformIcons).map(([id, p]) => (
                                    <button key={id} onClick={() => setNewPlatforms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-all ${newPlatforms.includes(id) ? p.color + " border-2" : "bg-neutral-900 text-neutral-500 border-neutral-800"}`}>
                                        {p.icon} {id}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Caption */}
                        <div>
                            <label className="text-[10px] text-neutral-500 uppercase mb-1 block">Caption</label>
                            <textarea value={newCaption} onChange={e => setNewCaption(e.target.value)} rows={4}
                                placeholder="Write your post caption..."
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none" />
                        </div>

                        {/* Hashtags */}
                        <input value={newHashtags} onChange={e => setNewHashtags(e.target.value)}
                            placeholder="#hashtag1 #hashtag2 #hashtag3"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />

                        {/* Video URL */}
                        <input value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)}
                            placeholder="Video URL (optional — paste from Video Studio)"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50" />

                        {/* Date/Time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-neutral-500 uppercase mb-1 block">Date</label>
                                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                            </div>
                            <div>
                                <label className="text-[10px] text-neutral-500 uppercase mb-1 block">Time</label>
                                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50" />
                            </div>
                        </div>

                        {publishResult && (
                            <div className={`text-sm p-2 rounded-lg ${publishResult.startsWith("✅") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                {publishResult}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button onClick={() => setShowNewPost(false)} className="px-4 py-2 bg-neutral-800 text-neutral-400 rounded-lg text-sm hover:bg-neutral-700 border border-neutral-700">Cancel</button>
                            <button onClick={() => createPost(false)} disabled={publishing || !newCaption.trim() || !newDate}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-50">
                                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} Schedule
                            </button>
                            {ayrshareKey && (
                                <button onClick={() => createPost(true)} disabled={publishing || !newCaption.trim()}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
                                    {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
