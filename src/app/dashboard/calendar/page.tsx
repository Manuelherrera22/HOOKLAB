"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import {
    CalendarDays, Loader2, Sparkles, Download,
    Zap, HelpCircle, Flame, AlertTriangle, Shield, Eye
} from "lucide-react";

interface CalendarDay {
    day: number;
    weekday: string;
    topic: string;
    hookType: string;
    caption: string;
    hashtags: string[];
    bestTime: string;
    format: string;
}

const hookColors: Record<string, string> = {
    shock: "bg-red-500/20 text-red-400",
    question: "bg-blue-500/20 text-blue-400",
    challenge: "bg-amber-500/20 text-amber-400",
    controversy: "bg-purple-500/20 text-purple-400",
    authority: "bg-emerald-500/20 text-emerald-400",
    curiosity: "bg-cyan-500/20 text-cyan-400",
};

const hookIcons: Record<string, any> = {
    shock: Zap,
    question: HelpCircle,
    challenge: Flame,
    controversy: AlertTriangle,
    authority: Shield,
    curiosity: Eye,
};

export default function CalendarPage() {
    const user = useStore((s) => s.user);
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState<CalendarDay[]>([]);
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

    const username = user?.ownTiktok?.replace("@", "") || "";

    const generateCalendar = async () => {
        if (!username) return;
        setLoading(true);
        try {
            const res = await fetch("/api/content-calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            const json = await res.json();
            if (json.days) {
                setDays(json.days);
                setSelectedDay(json.days[0]);
            }
        } catch (e) {
            console.error("Calendar error:", e);
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        const header = "Day,Weekday,Topic,Hook Type,Caption,Hashtags,Best Time,Format\n";
        const rows = days.map(d =>
            `${d.day},"${d.weekday}","${d.topic}","${d.hookType}","${d.caption.replace(/"/g, '""')}","${d.hashtags.join(' ')}","${d.bestTime}","${d.format}"`
        ).join("\n");
        const blob = new Blob([header + rows], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `content_calendar_${username}.csv`;
        a.click();
    };

    // Group days into weeks of 7
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                        <CalendarDays className="w-7 h-7 text-amber-400" />
                        Content Calendar
                    </h1>
                    <p className="text-neutral-400 text-sm">AI-powered 30-day content plan based on your niche intelligence.</p>
                </div>
                <div className="flex items-center gap-2">
                    {days.length > 0 && (
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 text-white rounded-xl text-sm font-medium hover:bg-neutral-700 transition-colors border border-neutral-700"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    )}
                    <button
                        onClick={generateCalendar}
                        disabled={loading || !username}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{loading ? "Generating..." : days.length > 0 ? "Regenerate" : "Generate Calendar"}</span>
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
                        <p className="text-neutral-500 text-sm animate-pulse">GPT is building your 30-day strategy...</p>
                    </div>
                </div>
            )}

            {!loading && days.length === 0 && (
                <div className="text-center py-20">
                    <CalendarDays className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500">No calendar generated yet.</p>
                    <p className="text-neutral-600 text-sm mt-1">Click <strong>Generate Calendar</strong> to create a 30-day plan.</p>
                </div>
            )}

            {!loading && days.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2 space-y-3">
                        {weeks.map((week, wi) => (
                            <div key={wi} className="grid grid-cols-7 gap-2">
                                {week.map((day) => {
                                    const isSelected = selectedDay?.day === day.day;
                                    const HookIcon = hookIcons[day.hookType] || Zap;
                                    return (
                                        <button
                                            key={day.day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`relative p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${isSelected
                                                    ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/30"
                                                    : "bg-card border-border hover:border-neutral-700"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-neutral-500">{day.weekday}</span>
                                                <span className={`text-lg font-bold ${isSelected ? "text-amber-400" : "text-white"}`}>{day.day}</span>
                                            </div>
                                            <p className="text-[11px] text-neutral-300 leading-tight line-clamp-2 mb-1.5">{day.topic}</p>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${hookColors[day.hookType] || "bg-neutral-500/20 text-neutral-400"}`}>
                                                    {day.hookType}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Day Detail Panel */}
                    {selectedDay && (
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-fit sticky top-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Day {selectedDay.day}</h3>
                                <span className="text-xs text-neutral-500">{selectedDay.weekday} · {selectedDay.bestTime}</span>
                            </div>

                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Topic</p>
                                <p className="text-sm text-white font-medium">{selectedDay.topic}</p>
                            </div>

                            <div className="flex gap-2">
                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-lg ${hookColors[selectedDay.hookType] || "bg-neutral-500/20 text-neutral-400"}`}>
                                    {selectedDay.hookType}
                                </span>
                                <span className="text-xs font-semibold uppercase px-2 py-1 rounded-lg bg-neutral-500/20 text-neutral-400">
                                    {selectedDay.format}
                                </span>
                            </div>

                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Caption</p>
                                <div className="bg-neutral-900/50 rounded-lg p-3 border border-neutral-800/50">
                                    <p className="text-sm text-neutral-200">{selectedDay.caption}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Hashtags</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedDay.hashtags.map((h, i) => (
                                        <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">
                                            {h.startsWith("#") ? h : `#${h}`}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                                <p className="text-xs text-amber-400 font-semibold mb-1">BEST TIME TO POST</p>
                                <p className="text-lg font-bold text-amber-300">{selectedDay.bestTime}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
