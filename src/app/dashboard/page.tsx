"use client";

import { useStore } from "@/store/useStore";
import { Video, LineChart, Library, TrendingUp } from "lucide-react";

export default function DashboardOverview() {
    const user = useStore(state => state.user);
    const references = useStore(state => state.references);
    const hooks = useStore(state => state.hooks);

    const totalViews = references.reduce((acc, ref) => acc + ref.views, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back, {user?.name}</h1>
                <p className="text-neutral-400">Here is an overview of your trading content performance and reference metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Tracked Views"
                    value={new Intl.NumberFormat('en-US', { notation: "compact" }).format(totalViews)}
                    description="From market references"
                    icon={<LineChart className="w-5 h-5 text-emerald-400" />}
                />
                <StatCard
                    title="Active References"
                    value={references.length.toString()}
                    description="Monitored channels/videos"
                    icon={<Video className="w-5 h-5 text-blue-400" />}
                />
                <StatCard
                    title="Saved Hooks"
                    value={hooks.length.toString()}
                    description="In your library"
                    icon={<Library className="w-5 h-5 text-purple-400" />}
                />
                <StatCard
                    title="Avg Retention Match"
                    value="98%"
                    description="Compared to market top"
                    icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Top Performing References</h2>
                    <div className="space-y-4">
                        {references.sort((a, b) => b.views - a.views).slice(0, 3).map(ref => (
                            <div key={ref.id} className="flex items-center justify-between p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                                <div>
                                    <p className="font-medium text-white">{ref.name}</p>
                                    <p className="text-sm text-neutral-400 capitalize">{ref.platform}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-white">{new Intl.NumberFormat('en-US').format(ref.views)}</p>
                                    <p className="text-xs text-neutral-500">views</p>
                                </div>
                            </div>
                        ))}
                        {references.length === 0 && (
                            <p className="text-neutral-500 text-sm text-center py-4">No references tracked yet.</p>
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Recent Best Hooks</h2>
                    <div className="space-y-4">
                        {hooks.slice(0, 3).map(hook => (
                            <div key={hook.id} className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-white">{hook.category}</p>
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-md">
                                        {hook.matchScore}% Match
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-300 italic">"{hook.title}"</p>
                            </div>
                        ))}
                        {hooks.length === 0 && (
                            <p className="text-neutral-500 text-sm text-center py-4">No hooks saved yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, description, icon }: { title: string, value: string, description: string, icon: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
                <div className="p-2 bg-neutral-900 rounded-lg">{icon}</div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-xs text-neutral-500">{description}</p>
        </div>
    );
}
