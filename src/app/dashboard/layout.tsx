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
    const [hydrated, setHydrated] = useState(false);

    // Wait for Zustand to hydrate from localStorage before checking auth
    useEffect(() => {
        // Zustand persist rehydrates synchronously after first render
        // We use a small delay to ensure the store is fully hydrated
        const timer = setTimeout(() => setHydrated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Only redirect after hydration is complete and user is confirmed null
    useEffect(() => {
        if (hydrated && !user) {
            router.replace("/login");
        }
    }, [hydrated, user, router]);

    // Show loading spinner while hydrating or if user not yet confirmed
    if (!hydrated || !user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                    <p className="text-neutral-500 text-sm animate-pulse">Loading workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto pt-16 lg:pt-4 md:pt-16">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
