"use client";

import { useStore } from "@/store/useStore";
import { TrendingUp, Eye, Video, BarChart3, Target, Zap } from "lucide-react";

export default function MetricsPage() {
    const references = useStore(state => state.references);
    const hooks = useStore(state => state.hooks);

    const totalViews = references.reduce((acc, ref) => acc + ref.views, 0);
    const avgViews = references.length > 0 ? Math.round(totalViews / references.length) : 0;
    const topRef = references.sort((a, b) => b.views - a.views)[0];
    const avgHookScore = hooks.length > 0 ? Math.round(hooks.reduce((acc, h) => acc + h.matchScore, 0) / hooks.length) : 0;

    const platformBreakdown = references.reduce((acc, ref) => {
        acc[ref.platform] = (acc[ref.platform] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const platformColors: Record<string, string> = {
        youtube: 'bg-red-500',
        tiktok: 'bg-fuchsia-500',
        instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
        other: 'bg-neutral-500',
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Performance Metrics</h1>
                <p className="text-neutral-400">Deep analytics of your market references and hook performance.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    title="Total Tracked Views"
                    value={new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totalViews)}
                    change="+12.5%"
                    positive
                    icon={<Eye className="w-5 h-5 text-emerald-400" />}
                />
                <KPICard
                    title="Average Views / Reference"
                    value={new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(avgViews)}
                    change="+8.3%"
                    positive
                    icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
                />
                <KPICard
                    title="Avg Hook Match Score"
                    value={`${avgHookScore}%`}
                    change="+2.1%"
                    positive
                    icon={<Target className="w-5 h-5 text-purple-400" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Platform Distribution */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Platform Distribution</h2>
                    <div className="space-y-4">
                        {Object.entries(platformBreakdown).map(([platform, count]) => {
                            const percentage = references.length > 0 ? Math.round((count / references.length) * 100) : 0;
                            return (
                                <div key={platform} className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-neutral-300 capitalize">{platform}</span>
                                        <span className="text-sm text-neutral-400">{count} refs · {percentage}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${platformColors[platform] || 'bg-neutral-500'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(platformBreakdown).length === 0 && (
                            <p className="text-neutral-500 text-sm text-center py-8">Add references to see platform distribution.</p>
                        )}
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Top Performers Leaderboard</h2>
                    <div className="space-y-3">
                        {references.sort((a, b) => b.views - a.views).slice(0, 5).map((ref, i) => (
                            <div key={ref.id} className="flex items-center space-x-4 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                        i === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                                            i === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-neutral-800 text-neutral-500'
                                    }`}>
                                    #{i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{ref.name}</p>
                                    <p className="text-xs text-neutral-500 capitalize">{ref.platform}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-semibold text-white">{new Intl.NumberFormat('en-US').format(ref.views)}</p>
                                    <p className="text-xs text-neutral-500">views</p>
                                </div>
                            </div>
                        ))}
                        {references.length === 0 && (
                            <p className="text-neutral-500 text-sm text-center py-8">No references to rank yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Hook Performance */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Hook Performance Index</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hooks.map(hook => (
                        <div key={hook.id} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">{hook.category}</span>
                                <div className={`px-2 py-0.5 rounded text-xs font-bold ${hook.matchScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
                                        hook.matchScore >= 70 ? 'bg-amber-500/20 text-amber-400' :
                                            'bg-red-500/20 text-red-400'
                                    }`}>
                                    {hook.matchScore}%
                                </div>
                            </div>
                            <p className="text-sm font-medium text-white line-clamp-2">{hook.title}</p>
                            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${hook.matchScore >= 90 ? 'bg-emerald-500' :
                                            hook.matchScore >= 70 ? 'bg-amber-500' :
                                                'bg-red-500'
                                        }`}
                                    style={{ width: `${hook.matchScore}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {hooks.length === 0 && (
                        <div className="col-span-full py-8 text-center">
                            <p className="text-neutral-500 text-sm">Save hooks from the AI Chat to see their performance scores here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, change, positive, icon }: { title: string, value: string, change: string, positive: boolean, icon: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6 group hover:border-neutral-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
                <div className="p-2 bg-neutral-900 rounded-lg group-hover:bg-neutral-800 transition-colors">{icon}</div>
            </div>
            <p className="text-3xl font-bold text-white mb-2">{value}</p>
            <div className="flex items-center space-x-1">
                <TrendingUp className={`w-4 h-4 ${positive ? 'text-emerald-400' : 'text-red-400'}`} />
                <span className={`text-sm font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{change}</span>
                <span className="text-xs text-neutral-500">vs last period</span>
            </div>
        </div>
    );
}
