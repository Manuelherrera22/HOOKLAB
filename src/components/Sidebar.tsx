"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, Menu, X, Brain, CalendarDays, FlaskConical, Bell, Clapperboard, MessageSquare, Hexagon } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useState, useEffect } from "react";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "Intelligence", href: "/dashboard/intel", icon: Brain },
    { name: "Studio", href: "/dashboard/studio", icon: Clapperboard },
    { name: "Tools", href: "/dashboard/tools", icon: FlaskConical },
    { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    { name: "AI Script Chat", href: "/dashboard/chat", icon: MessageSquare },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useStore((state) => state.logout);
    const user = useStore((state) => state.user);
    const [isOpen, setIsOpen] = useState(false);
    const [alertCount, setAlertCount] = useState(0);

    useEffect(() => { setIsOpen(false); }, [pathname]);
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);
    // Fetch alert count
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
        const interval = setInterval(fetchAlerts, 60000); // every minute
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleLogout = () => { logout(); router.push("/"); };

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

            <div className="flex-1 space-y-1 mt-8">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"}`}>
                            <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-neutral-600"}`} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto border-t border-neutral-800 pt-4">
                {user && (
                    <div className="px-3 py-3 mb-2">
                        <p className="text-sm font-medium text-white line-clamp-1">{user.name}</p>
                        <p className="text-xs text-neutral-600 truncate">{user.email}</p>
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
