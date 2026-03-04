"use client";

import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Mail } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const login = useStore((state) => state.login);
    const router = useRouter();

    const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!email.trim()) return;
        if (!isValidEmail(email.trim())) {
            setError("Please enter a valid email address");
            return;
        }
        if (!isLoading) {
            setIsLoading(true);
            try {
                await login(email);
                router.push("/dashboard");
            } catch (error) {
                console.error("Login failed:", error);
                setError("Login failed. Please try again.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-background to-background"></div>

            <main className="z-10 w-full max-w-md">
                <div className="flex flex-col items-center text-center space-y-6 mb-8">
                    <div className="inline-flex items-center justify-center p-4 rounded-full bg-neutral-900 border border-neutral-800 shadow-2xl">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Access HOOKLAB</h1>
                        <p className="text-neutral-400">Enter your email to access your workspace</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-neutral-300 flex items-center space-x-2">
                            <Mail className="w-4 h-4" />
                            <span>Email Address</span>
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                            placeholder="your@email.com"
                            required
                            autoComplete="email"
                        />
                        {error && (
                            <p className="text-red-400 text-xs mt-1">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.05)] disabled:opacity-50 flex justify-center items-center"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            "Enter Workspace"
                        )}
                    </button>

                    <p className="text-center text-xs text-neutral-600">
                        Your data is saved and linked to your email. You can access your workspace from any device.
                    </p>
                </form>
            </main>
        </div>
    );
}
