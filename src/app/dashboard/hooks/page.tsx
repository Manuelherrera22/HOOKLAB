"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { Library, Plus, Trash2, Search, Edit3, X, Sparkles } from "lucide-react";

export default function HooksLibraryPage() {
    const hooks = useStore(state => state.hooks);
    const removeHook = useStore(state => state.removeHook);
    const addHook = useStore(state => state.addHook);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newHook, setNewHook] = useState({ title: "", content: "", category: "Top Retención" });

    const filteredHooks = hooks.filter(hook =>
        hook.title.toLowerCase().includes(search.toLowerCase()) ||
        hook.category.toLowerCase().includes(search.toLowerCase()) ||
        hook.content.toLowerCase().includes(search.toLowerCase())
    );

    const handleAddHook = async () => {
        if (!newHook.title.trim() || !newHook.content.trim()) return;
        await addHook({
            title: newHook.title,
            content: newHook.content,
            category: newHook.category,
            matchScore: Math.floor(Math.random() * 20) + 80,
        });
        setNewHook({ title: "", content: "", category: "Top Retención" });
        setIsModalOpen(false);
    };

    const categories = ["Top Retención", "Curiosity Gap", "Fear/FOMO", "Authority", "AI Generated", "Contrarian"];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hooks Library</h1>
                    <p className="text-neutral-400">Manage and categorize your top-performing visual and narrative hooks.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-white text-black px-4 py-2 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Hook</span>
                </button>
            </div>

            <div className="flex items-center space-x-4 bg-neutral-900/50 border border-neutral-800 rounded-xl p-2 px-4">
                <Search className="w-5 h-5 text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search hooks by title, content, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none text-white focus:outline-none py-2"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHooks.map(hook => (
                    <div key={hook.id} className="bg-card border border-border rounded-2xl p-6 group hover:border-neutral-600 transition-colors relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 opacity-50"></div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-3 py-1 bg-neutral-800 text-purple-400 text-xs font-semibold rounded-md border border-purple-500/20">
                                {hook.category}
                            </span>
                            <span className="text-xs font-bold text-emerald-400">
                                {hook.matchScore}% Rank
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{hook.title}</h3>
                        <p className="text-neutral-400 text-sm italic mb-6 line-clamp-3">&ldquo;{hook.content}&rdquo;</p>

                        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => removeHook(hook.id)}
                                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredHooks.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-dashed border-neutral-800 rounded-2xl">
                        <Library className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No hooks found</h3>
                        <p className="text-neutral-500 text-sm">Create your first hook or save one from the AI Chat.</p>
                    </div>
                )}
            </div>

            {/* Add Hook Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-purple-400" />
                                </div>
                                <h2 className="text-xl font-bold text-white">New Hook</h2>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Hook Title</label>
                                <input
                                    type="text"
                                    value={newHook.title}
                                    onChange={(e) => setNewHook(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                                    placeholder='e.g. "El 99% de los traders..."'
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Hook Content / Script</label>
                                <textarea
                                    value={newHook.content}
                                    onChange={(e) => setNewHook(prev => ({ ...prev, content: e.target.value }))}
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500/30 resize-none h-32"
                                    placeholder="Full hook text or script body..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-neutral-300">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setNewHook(prev => ({ ...prev, category: cat }))}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newHook.category === cat
                                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                                    : 'bg-neutral-800 text-neutral-400 hover:text-white border border-transparent'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-800">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddHook}
                                disabled={!newHook.title.trim() || !newHook.content.trim()}
                                className="px-4 py-2 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                            >
                                Save Hook
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
