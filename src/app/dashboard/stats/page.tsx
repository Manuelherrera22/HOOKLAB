"use client";

import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/store/useStore";
import {
    BarChart3, TrendingUp, Eye, Heart, MessageSquare, Bookmark,
    Filter, ArrowUpDown, ExternalLink, Calendar, Loader2, Search
} from "lucide-react";

interface ContentPost {
    id: string;
    caption: string;
    likes: number;
    comments: number;
    views: number;
    saves: number;
    shares: number;
    url: string;
    thumbnail: string;
    platform: string;
    timestamp: string;
}

interface ContentSummary {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalSaves: number;
    bestPost: ContentPost | null;
}

const formatNumber = (n: number) => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
};

type SortKey = 'views' | 'likes' | 'comments' | 'saves' | 'timestamp';

export default function ContentStatsPage() {
    const activeWorkspace = useStore(state => state.activeWorkspace);
    const user = useStore(state => state.user);

    const [posts, setPosts] = useState<ContentPost[]>([]);
    const [summary, setSummary] = useState<ContentSummary | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [platformFilter, setPlatformFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('views');
    const [sortAsc, setSortAsc] = useState(false);

    // Also include client-side Instagram data
    const instagramPosts = user?.ownSocialData?.instagramPostsList || [];

    useEffect(() => {
        if (!activeWorkspace?.id) return;
        setLoading(true);

        const params = new URLSearchParams({ workspaceId: activeWorkspace.id });
        if (platformFilter !== 'all') params.append('platform', platformFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        fetch(`/api/content-stats?${params}`)
            .then(r => r.json())
            .then(data => {
                let allPosts = data.posts || [];

                // Merge Instagram posts from client store if platform filter allows
                if (platformFilter === 'all' || platformFilter === 'instagram') {
                    const igPosts: ContentPost[] = instagramPosts.map((p: any) => ({
                        id: p.id || p.url || String(Math.random()),
                        caption: p.caption || '',
                        likes: p.likes || 0,
                        comments: p.comments || 0,
                        views: p.views || 0,
                        saves: 0,
                        shares: 0,
                        url: p.url || '',
                        thumbnail: '',
                        platform: 'instagram',
                        timestamp: p.timestamp || '',
                    }));
                    // Only add IG posts not already in the server data
                    const existingIds = new Set(allPosts.map((p: any) => p.id));
                    igPosts.forEach(p => { if (!existingIds.has(p.id)) allPosts.push(p); });
                }

                setPosts(allPosts);

                // Recompute summary including IG data
                const totalViews = allPosts.reduce((s: number, p: any) => s + p.views, 0);
                const totalLikes = allPosts.reduce((s: number, p: any) => s + p.likes, 0);
                const totalComments = allPosts.reduce((s: number, p: any) => s + p.comments, 0);
                const totalSaves = allPosts.reduce((s: number, p: any) => s + p.saves, 0);
                const bestPost = allPosts.length > 0 ? [...allPosts].sort((a: any, b: any) => b.views - a.views)[0] : null;

                setSummary({
                    totalPosts: allPosts.length,
                    totalViews,
                    totalLikes,
                    totalComments,
                    totalSaves,
                    bestPost,
                });
            })
            .catch(err => console.error('Content stats error:', err))
            .finally(() => setLoading(false));
    }, [activeWorkspace?.id, platformFilter, startDate, endDate]);

    // Sorted + filtered posts
    const displayPosts = useMemo(() => {
        let filtered = [...posts];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.caption.toLowerCase().includes(q));
        }

        filtered.sort((a, b) => {
            const aVal = a[sortKey] || '';
            const bVal = b[sortKey] || '';
            if (sortKey === 'timestamp') {
                return sortAsc
                    ? new Date(aVal).getTime() - new Date(bVal).getTime()
                    : new Date(bVal).getTime() - new Date(aVal).getTime();
            }
            return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
        });

        return filtered;
    }, [posts, searchQuery, sortKey, sortAsc]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(false); }
    };

    const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
        <button
            onClick={() => handleSort(k)}
            className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${sortKey === k ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
            {label}
            <ArrowUpDown className="w-3 h-3" />
        </button>
    );

    const platformEmoji: Record<string, string> = {
        tiktok: '♪',
        instagram: '◎',
        youtube: '▶',
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <BarChart3 className="w-7 h-7 text-neutral-400" />
                    Content Statistics
                </h1>
                <p className="text-neutral-400 text-sm">Performance overview of all your published content across platforms.</p>
            </div>

            {/* Summary Cards */}
            {summary && !loading && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: "Total Posts", value: summary.totalPosts, icon: <BarChart3 className="w-5 h-5" /> },
                        { label: "Total Views", value: formatNumber(summary.totalViews), icon: <Eye className="w-5 h-5" /> },
                        { label: "Total Likes", value: formatNumber(summary.totalLikes), icon: <Heart className="w-5 h-5" /> },
                        { label: "Comments", value: formatNumber(summary.totalComments), icon: <MessageSquare className="w-5 h-5" /> },
                        { label: "Saves", value: formatNumber(summary.totalSaves), icon: <Bookmark className="w-5 h-5" /> },
                    ].map(s => (
                        <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                            <div className="text-neutral-400">{s.icon}</div>
                            <div>
                                <p className="text-xl font-bold text-white">{s.value}</p>
                                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-neutral-500" />
                    <select
                        value={platformFilter}
                        onChange={e => setPlatformFilter(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                        <option value="all">All Platforms</option>
                        <option value="tiktok">♪ TikTok</option>
                        <option value="instagram">◎ Instagram</option>
                        <option value="youtube">▶ YouTube</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        placeholder="Start date"
                    />
                    <span className="text-neutral-600 text-xs">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                        placeholder="End date"
                    />
                </div>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by caption..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                    />
                </div>
            </div>

            {/* Content Table */}
            <section className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                        <span className="ml-3 text-neutral-500 text-sm">Loading content data...</span>
                    </div>
                ) : displayPosts.length === 0 ? (
                    <div className="text-center py-20">
                        <BarChart3 className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                        <p className="text-neutral-500 text-sm">No content data available yet.</p>
                        <p className="text-neutral-600 text-xs mt-1">Connect your social accounts and scrape data to see statistics here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-800">
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-8">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Platform</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 min-w-[200px]">Caption</th>
                                    <th className="text-right px-4 py-3"><SortHeader label="Views" k="views" /></th>
                                    <th className="text-right px-4 py-3"><SortHeader label="Likes" k="likes" /></th>
                                    <th className="text-right px-4 py-3"><SortHeader label="Comments" k="comments" /></th>
                                    <th className="text-right px-4 py-3"><SortHeader label="Saves" k="saves" /></th>
                                    <th className="text-right px-4 py-3"><SortHeader label="Date" k="timestamp" /></th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayPosts.map((post, i) => (
                                    <tr key={post.id || i} className="border-b border-neutral-800/50 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3 text-xs text-neutral-600 font-mono">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                                                {platformEmoji[post.platform] || '●'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm text-white truncate max-w-[300px]" title={post.caption}>
                                                {post.caption || '(Sin caption)'}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-white">{formatNumber(post.views)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-neutral-300">{formatNumber(post.likes)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-neutral-300">{formatNumber(post.comments)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-neutral-400">{formatNumber(post.saves)}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs text-neutral-500">
                                                {post.timestamp ? new Date(post.timestamp).toLocaleDateString('es-LA') : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {post.url ? (
                                                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors">
                                                    <ExternalLink className="w-4 h-4 mx-auto" />
                                                </a>
                                            ) : (
                                                <span className="text-neutral-700">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Footer note */}
            {!loading && displayPosts.length > 0 && (
                <p className="text-center text-xs text-neutral-600">
                    Showing {displayPosts.length} of {posts.length} posts · Data from scraped videos + connected accounts
                </p>
            )}
        </div>
    );
}
