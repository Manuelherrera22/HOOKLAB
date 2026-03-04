"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Home, LogOut, Menu, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { useState, useEffect } from "react";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "AI Script Chat", href: "/dashboard/chat", icon: Bot },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useStore((state) => state.logout);
    const user = useStore((state) => state.user);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { setIsOpen(false); }, [pathname]);
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const handleLogout = () => { logout(); router.push("/"); };

    const sidebarContent = (
        <>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white">HOOKLAB</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 space-y-1 mt-8">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.name} href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"}`}>
                            <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-neutral-500"}`} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>

            <div className="mt-auto border-t border-border pt-4">
                {user && (
                    <div className="px-3 py-3 mb-2">
                        <p className="text-sm font-medium text-white line-clamp-1">{user.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                    </div>
                )}
                <button onClick={handleLogout} className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-900 hover:text-red-400 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-neutral-900 rounded-lg border border-neutral-800">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white">HOOKLAB</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {isOpen && <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}

            <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border p-4 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </div>

            <div className="hidden lg:flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 shrink-0">
                {sidebarContent}
            </div>
        </>
    );
}
