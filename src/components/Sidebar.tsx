"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, Menu, X, Brain, CalendarDays, FlaskConical, Bell, Palette, MessageSquare, Hexagon, BookOpen, ChevronDown, Plus, Check, Layers, Settings, BarChart3, Table2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useState, useEffect, useRef } from "react";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Intelligence", href: "/dashboard/intel", icon: Brain, beta: true },
    { name: "Studio", href: "/dashboard/studio", icon: Palette, beta: true },
    { name: "Tools", href: "/dashboard/tools", icon: FlaskConical, beta: true },
    { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays, beta: true },
    { name: "Content Stats", href: "/dashboard/stats", icon: BarChart3 },
    { name: "Content Tracker", href: "/dashboard/tracker", icon: Table2 },
    { name: "AI Script Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Guide", href: "/dashboard/guide", icon: BookOpen },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useStore((state) => state.logout);
    const user = useStore((state) => state.user);
    const workspaces = useStore((state) => state.workspaces);
    const activeWorkspace = useStore((state) => state.activeWorkspace);
    const switchWorkspace = useStore((state) => state.switchWorkspace);
    const createWorkspace = useStore((state) => state.createWorkspace);
    const [isOpen, setIsOpen] = useState(false);
    const [alertCount, setAlertCount] = useState(0);

    // Workspace switcher state
    const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
    const [showCreateWs, setShowCreateWs] = useState(false);
    const [newWsName, setNewWsName] = useState("");
    const [creatingWs, setCreatingWs] = useState(false);
    const wsDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setIsOpen(false); }, [pathname]);
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsOpen(false); setWsDropdownOpen(false); } };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Close workspace dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
                setWsDropdownOpen(false);
                setShowCreateWs(false);
            }
        };
        if (wsDropdownOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [wsDropdownOpen]);

    useEffect(() => {
        if (!user?.id) return;
        const fetchAlerts = async () => {
            try {
                const res = await fetch(`/api/alerts?accountId=${user.id}`);
                const json = await res.json();
                setAlertCount(json.unreadCount || 0);
            } catch { /* ignore */ }
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleLogout = () => { logout(); router.push("/"); };

    const handleCreateWorkspace = async () => {
        if (!newWsName.trim()) return;
        setCreatingWs(true);
        const ws = await createWorkspace(newWsName.trim());
        if (ws) {
            await switchWorkspace(ws.id);
            setNewWsName("");
            setShowCreateWs(false);
            setWsDropdownOpen(false);
        }
        setCreatingWs(false);
    };

    const handleSwitchWorkspace = async (id: string) => {
        if (id === activeWorkspace?.id) {
            setWsDropdownOpen(false);
            return;
        }
        await switchWorkspace(id);
        setWsDropdownOpen(false);
    };

    const planColors: Record<string, string> = {
        free: "text-neutral-500 bg-white/5 border-white/10",
        pro: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        agency: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    };

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                        <Hexagon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">HOOKLAB</span>
                </div>
                <div className="flex items-center gap-1">
                    <button className="relative p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                        onClick={() => router.push("/dashboard/alerts")}>
                        <Bell className="w-5 h-5" />
                        {alertCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-white text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {alertCount > 9 ? "9+" : alertCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ─── Workspace Switcher ─── */}
            <div className="mt-4 px-1 relative" ref={wsDropdownRef}>
                <button
                    onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-neutral-700 to-neutral-800 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {activeWorkspace?.name?.charAt(0)?.toUpperCase() || "W"}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white truncate">{activeWorkspace?.name || "Workspace"}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{activeWorkspace?.role || "owner"}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${wsDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {wsDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-1.5 max-h-[240px] overflow-y-auto">
                            {workspaces.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => handleSwitchWorkspace(ws.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${ws.id === activeWorkspace?.id ? "bg-white/10" : "hover:bg-white/5"}`}
                                >
                                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-neutral-700 to-neutral-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="text-xs font-medium text-white truncate">{ws.name}</p>
                                        <span className={`text-[9px] uppercase font-bold tracking-wider px-1 py-0.5 rounded border ${planColors[ws.plan] || planColors.free}`}>
                                            {ws.plan}
                                        </span>
                                    </div>
                                    {ws.id === activeWorkspace?.id && (
                                        <Check className="w-3.5 h-3.5 text-white shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-white/10 p-1.5">
                            {showCreateWs ? (
                                <div className="flex gap-1.5 px-1">
                                    <input
                                        autoFocus
                                        value={newWsName}
                                        onChange={(e) => setNewWsName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateWorkspace(); if (e.key === "Escape") setShowCreateWs(false); }}
                                        placeholder="Nombre del workspace"
                                        className="flex-1 bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-0"
                                    />
                                    <button
                                        onClick={handleCreateWorkspace}
                                        disabled={!newWsName.trim() || creatingWs}
                                        className="px-2.5 py-1.5 bg-white text-black rounded-md text-xs font-medium hover:bg-neutral-200 disabled:opacity-50 shrink-0"
                                    >
                                        {creatingWs ? "..." : "Crear"}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowCreateWs(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-400 hover:bg-white/5 hover:text-neutral-300 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-xs font-medium">Nuevo Workspace</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-1 mt-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"}`}>
                            <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-neutral-600"}`} />
                            <span className="font-medium">{item.name}</span>
                            {item.beta && (
                                <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-neutral-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                                    beta
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto border-t border-neutral-800 pt-4">
                {user && (
                    <div className="px-3 py-3 mb-2">
                        <p className="text-sm font-medium text-white line-clamp-1">{user.name}</p>
                        <p className="text-xs text-neutral-600 truncate">{user.email}</p>
                        {workspaces.length > 1 && (
                            <p className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
                                <Layers className="w-3 h-3" /> {workspaces.length} workspaces
                            </p>
                        )}
                    </div>
                )}
                <button onClick={handleLogout} className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-neutral-500 hover:bg-white/5 hover:text-neutral-300 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
                        <Hexagon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">HOOKLAB</span>
                    {activeWorkspace && (
                        <span className="text-xs text-neutral-500 border-l border-neutral-700 pl-3 truncate max-w-[120px]">
                            {activeWorkspace.name}
                        </span>
                    )}
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {isOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}

            <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-neutral-800 p-4 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </div>

            <div className="hidden lg:flex flex-col w-64 bg-card border-r border-neutral-800 min-h-screen p-4 shrink-0">
                {sidebarContent}
            </div>
        </>
    );
}
