"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/store/useStore";
import {
    Bell, Loader2, Check, Zap, TrendingUp, TrendingDown,
    AlertTriangle, Eye, Sparkles, X
} from "lucide-react";

interface Alert {
    id: string;
    alert_type: string;
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

const alertIcons: Record<string, any> = {
    competitor_viral: Zap,
    trend_rising: TrendingUp,
    engagement_drop: TrendingDown,
    new_trend: Sparkles,
};

const alertColors: Record<string, string> = {
    competitor_viral: "text-red-400 bg-red-500/10 border-red-500/20",
    trend_rising: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    engagement_drop: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    new_trend: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export default function AlertsPage() {
    const user = useStore((s) => s.user);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAlerts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await fetch(`/api/alerts?accountId=${user.id}`);
            const json = await res.json();
            setAlerts(json.alerts || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user?.id]);

    useEffect(() => { loadAlerts(); }, [loadAlerts]);

    const markAllRead = async () => {
        if (!user?.id) return;
        await fetch("/api/alerts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAllRead: true, accountId: user.id }),
        });
        setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    };

    const markRead = async (id: string) => {
        await fetch("/api/alerts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
        });
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    };

    const unreadCount = alerts.filter(a => !a.is_read).length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                        <Bell className="w-7 h-7 text-amber-400" />
                        Smart Alerts
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                        )}
                    </h1>
                    <p className="text-neutral-400 text-sm">AI-detected changes in your niche, competitors, and engagement.</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllRead}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-xl text-sm hover:bg-neutral-700 border border-neutral-700">
                        <Check className="w-4 h-4" /> Mark all read
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                </div>
            ) : alerts.length === 0 ? (
                <div className="text-center py-16">
                    <Bell className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500">No alerts yet.</p>
                    <p className="text-neutral-600 text-sm mt-1">Alerts appear when the AI detects important changes in your niche.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {alerts.map(alert => {
                        const Icon = alertIcons[alert.alert_type] || AlertTriangle;
                        const colors = alertColors[alert.alert_type] || "text-neutral-400 bg-neutral-500/10 border-neutral-500/20";
                        return (
                            <div key={alert.id}
                                className={`border rounded-xl p-4 transition-all ${alert.is_read ? "bg-card border-border opacity-60" : `${colors}`}`}
                                onClick={() => !alert.is_read && markRead(alert.id)}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${alert.is_read ? "bg-neutral-800" : colors.split(" ")[1]}`}>
                                        <Icon className={`w-4 h-4 ${alert.is_read ? "text-neutral-500" : colors.split(" ")[0]}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`text-sm font-semibold ${alert.is_read ? "text-neutral-400" : "text-white"}`}>{alert.title}</p>
                                            {!alert.is_read && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                        </div>
                                        <p className={`text-xs ${alert.is_read ? "text-neutral-600" : "text-neutral-300"}`}>{alert.message}</p>
                                        <p className="text-[10px] text-neutral-600 mt-1">
                                            {new Date(alert.created_at).toLocaleDateString("es-LA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
