"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Link2, Plus, Trash2, ExternalLink, RefreshCw, Youtube, Loader2, Users, Heart, Film } from "lucide-react";

export default function ReferencesPage() {
    const references = useStore(state => state.references);
    const addReferenceFromUrl = useStore(state => state.addReferenceFromUrl);
    const removeReference = useStore(state => state.removeReference);
    const refreshReferenceViews = useStore(state => state.refreshReferenceViews);

    const [url, setUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    const handleAddRef = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim() || isAdding) return;
        setIsAdding(true);
        try {
            await addReferenceFromUrl(url);
            setUrl("");
        } catch (err) {
            console.error("Failed to add reference:", err);
        } finally {
            setIsAdding(false);
        }
    };

    const handleRefresh = async (id: string) => {
        setRefreshingId(id);
        try {
            await refreshReferenceViews(id);
        } finally {
            setRefreshingId(null);
        }
    };

    const platformIcons: Record<string, { icon: string; color: string }> = {
        youtube: { icon: '▶', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
        tiktok: { icon: '♪', color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
        instagram: { icon: '◎', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
        other: { icon: '●', color: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20' },
    };

    const formatNumber = (n: number) => {
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toString();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Market References</h1>
                <p className="text-neutral-400 text-sm md:text-base">Paste any YouTube, TikTok, or Instagram URL — we&apos;ll extract stats automatically via API.</p>
            </div>

            {/* URL Input */}
            <form onSubmit={handleAddRef} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 relative">
                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste a YouTube, TikTok, or Instagram URL..."
                        disabled={isAdding}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-12 pr-4 py-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                    />
                </div>
                <button
                    type="submit"
                    disabled={!url.trim() || isAdding}
                    className="flex items-center justify-center space-x-2 bg-white text-black px-5 py-4 rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 shrink-0"
                >
                    {isAdding ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Extracting...</span>
                        </>
                    ) : (
                        <>
                            <Plus className="w-4 h-4" />
                            <span>Add Reference</span>
                        </>
                    )}
                </button>
            </form>

            {/* References Grid */}
            <div className="space-y-4">
                {references.map(ref => {
                    const p = platformIcons[ref.platform] || platformIcons.other;
                    const hasProfileStats = ref.followers || ref.likes || ref.videoCount;
                    return (
                        <div key={ref.id} className="bg-card border border-border rounded-2xl p-4 md:p-5 group hover:border-neutral-600 transition-colors">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center space-x-4 flex-1 min-w-0">
                                    {/* Platform Badge */}
                                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl border ${p.color}`}>
                                        {p.icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-semibold truncate">{ref.name}</h3>
                                        <div className="flex items-center space-x-3 mt-1 flex-wrap gap-1">
                                            <span className="text-xs text-neutral-500 capitalize font-medium">{ref.platform}</span>
                                            {ref.author && (
                                                <span className="text-xs text-neutral-500">• {ref.author}</span>
                                            )}
                                            <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                                                <ExternalLink className="w-3 h-3" />
                                                <span>Open</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats + Actions */}
                                <div className="flex items-center space-x-4 sm:space-x-6 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                                    {/* Profile Stats */}
                                    {hasProfileStats && (
                                        <div className="flex items-center space-x-4">
                                            {ref.followers !== undefined && ref.followers > 0 && (
                                                <div className="flex items-center space-x-1.5">
                                                    <Users className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="text-sm font-semibold text-white">{formatNumber(ref.followers)}</span>
                                                </div>
                                            )}
                                            {ref.likes !== undefined && ref.likes > 0 && (
                                                <div className="flex items-center space-x-1.5">
                                                    <Heart className="w-3.5 h-3.5 text-red-400" />
                                                    <span className="text-sm font-semibold text-white">{formatNumber(ref.likes)}</span>
                                                </div>
                                            )}
                                            {ref.videoCount !== undefined && ref.videoCount > 0 && (
                                                <div className="flex items-center space-x-1.5">
                                                    <Film className="w-3.5 h-3.5 text-purple-400" />
                                                    <span className="text-sm font-semibold text-white">{ref.videoCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Views */}
                                    <div className="text-right">
                                        <p className="text-xl md:text-2xl font-bold text-white">{formatNumber(ref.views)}</p>
                                        <p className="text-xs text-neutral-500">{ref.isProfile ? 'total engagement' : 'views'}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => handleRefresh(ref.id)}
                                            disabled={refreshingId === ref.id}
                                            className="p-2 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50"
                                            title="Refresh stats"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${refreshingId === ref.id ? 'animate-spin' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => removeReference(ref.id)}
                                            className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {references.length === 0 && (
                    <div className="border-2 border-dashed border-neutral-800 rounded-2xl py-16 text-center">
                        <Youtube className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No references yet</h3>
                        <p className="text-neutral-500 text-sm max-w-md mx-auto">
                            Paste a YouTube, TikTok profile, or Instagram URL above. We&apos;ll auto-extract followers, likes, views, and more via RapidAPI.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
