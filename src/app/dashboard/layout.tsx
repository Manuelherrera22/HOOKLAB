"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const user = useStore((state) => state.user);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!user) {
            router.replace("/login");
        }
    }, [user, router]);

    if (!mounted || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
