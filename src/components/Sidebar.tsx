"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Home, Video, LineChart, Library, LogOut } from "lucide-react";
import { useStore } from "@/store/useStore";

const navigation = [
    { name: "Overview", href: "/dashboard", icon: Home },
    { name: "References", href: "/dashboard/references", icon: Video },
    { name: "Metrics", href: "/dashboard/metrics", icon: LineChart },
    { name: "Hooks Library", href: "/dashboard/hooks", icon: Library },
    { name: "AI Script Chat", href: "/dashboard/chat", icon: Bot },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const logout = useStore((state) => state.logout);
    const user = useStore((state) => state.user);

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    return (
        <div className="flex flex-col w-64 bg-card border-r border-border min-h-screen p-4 space-y-8">
            <div className="flex items-center space-x-3 px-2">
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800">
                    <Bot className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">HOOKLAB</span>
            </div>

            <div className="flex-1 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                ? "bg-white/10 text-white"
                                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                                }`}
                        >
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
                        <p className="text-xs text-neutral-500">Niche: {user.niche}</p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center space-x-3 px-3 py-2.5 rounded-lg text-neutral-400 hover:bg-neutral-900 hover:text-red-400 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
}
