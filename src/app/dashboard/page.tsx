"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import {
    Instagram, Plus, Trash2, ExternalLink, RefreshCw, Loader2,
    Users, Heart, Film, BookOpen, Save, Link2, X
} from "lucide-react";

export default function DashboardOverview() {
    const user = useStore(state => state.user);
    const references = useStore(state => state.references);
    const knowledge = useStore(state => state.knowledge);
    const updateOwnSocials = useStore(state => state.updateOwnSocials);
    const addReferenceFromUrl = useStore(state => state.addReferenceFromUrl);
    const removeReference = useStore(state => state.removeReference);
    const refreshReferenceViews = useStore(state => state.refreshReferenceViews);
    const addKnowledge = useStore(state => state.addKnowledge);
    const removeKnowledge = useStore(state => state.removeKnowledge);

    // Own socials state
    const [ownTiktok, setOwnTiktok] = useState(user?.ownTiktok || '');
    const [ownInstagram, setOwnInstagram] = useState(user?.ownInstagram || '');
    const [savingSocials, setSavingSocials] = useState(false);

    // Reference form state
    const [showRefForm, setShowRefForm] = useState(false);
    const [refName, setRefName] = useState('');
    const [refUrls, setRefUrls] = useState<string[]>(['']);
    const [addingRef, setAddingRef] = useState(false);

    // Knowledge form state
    const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
    const [knowledgeTitle, setKnowledgeTitle] = useState('');
    const [knowledgeContent, setKnowledgeContent] = useState('');
    const [addingKnowledge, setAddingKnowledge] = useState(false);

    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    const handleSaveSocials = async () => {
        setSavingSocials(true);
        await updateOwnSocials(ownTiktok, ownInstagram);
        setSavingSocials(false);
    };

    const ownData = user?.ownSocialData;

    const handleAddReference = async () => {
        if (!refName.trim() || refUrls.every(u => !u.trim()) || addingRef) return;
        setAddingRef(true);
        try {
            for (const url of refUrls.filter(u => u.trim())) {
                await addReferenceFromUrl(url.trim(), refName.trim());
            }
            setRefName('');
            setRefUrls(['']);
            setShowRefForm(false);
        } finally {
            setAddingRef(false);
        }
    };

    const handleAddKnowledge = async () => {
        if (!knowledgeTitle.trim() || !knowledgeContent.trim() || addingKnowledge) return;
        setAddingKnowledge(true);
        try {
            await addKnowledge({ title: knowledgeTitle.trim(), content: knowledgeContent.trim() });
            setKnowledgeTitle('');
            setKnowledgeContent('');
            setShowKnowledgeForm(false);
        } finally {
            setAddingKnowledge(false);
        }
    };

    const handleRefresh = async (id: string) => {
        setRefreshingId(id);
        try { await refreshReferenceViews(id); } finally { setRefreshingId(null); }
    };

    const formatNumber = (n: number) => {
        if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return n.toString();
    };

    // Group references by refName
    const groupedRefs = references.reduce((acc, ref) => {
        const key = ref.refName || 'Sin nombre';
        if (!acc[key]) acc[key] = [];
        acc[key].push(ref);
        return acc;
    }, {} as Record<string, typeof references>);

    const platformColors: Record<string, string> = {
        youtube: 'text-red-400 bg-red-500/10 border-red-500/20',
        tiktok: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
        instagram: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
        other: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">Welcome, {user?.name}</h1>
                <p className="text-neutral-400 text-sm">Manage your social accounts, track references, and build your knowledge base.</p>
            </div>

            {/* ===== SECTION 1: MIS REDES SOCIALES ===== */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-white mb-1 flex items-center space-x-2">
                    <Instagram className="w-5 h-5 text-pink-400" />
                    <span>My Social Networks</span>
                </h2>
                <p className="text-sm text-neutral-500 mb-5">Your own Instagram and TikTok accounts for content analysis.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">TikTok</label>
                        <input
                            value={ownTiktok}
                            onChange={(e) => setOwnTiktok(e.target.value)}
                            placeholder="@your_tiktok_username"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Instagram</label>
                        <input
                            value={ownInstagram}
                            onChange={(e) => setOwnInstagram(e.target.value)}
                            placeholder="@your_instagram_username"
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSaveSocials}
                    disabled={savingSocials}
                    className="mt-4 flex items-center space-x-2 px-4 py-2.5 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                    {savingSocials ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{savingSocials ? 'Connecting accounts...' : 'Save & Connect'}</span>
                </button>

                {/* Show fetched profile stats */}
                {ownData && (ownData.tiktokFollowers || ownData.instagramFollowers) && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ownData.tiktokFollowers !== undefined && ownData.tiktokFollowers > 0 && (
                            <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-3">
                                <p className="text-xs text-fuchsia-400 font-semibold mb-1">♪ TikTok — {ownData.tiktokNickname || user?.ownTiktok}</p>
                                <div className="flex items-center space-x-3 text-xs text-neutral-300">
                                    <span className="flex items-center space-x-1"><Users className="w-3 h-3 text-blue-400" /><span>{formatNumber(ownData.tiktokFollowers)}</span></span>
                                    {ownData.tiktokLikes !== undefined && <span className="flex items-center space-x-1"><Heart className="w-3 h-3 text-red-400" /><span>{formatNumber(ownData.tiktokLikes)}</span></span>}
                                    {ownData.tiktokVideos !== undefined && <span className="flex items-center space-x-1"><Film className="w-3 h-3 text-purple-400" /><span>{ownData.tiktokVideos} videos</span></span>}
                                </div>
                            </div>
                        )}
                        {ownData.instagramFollowers !== undefined && ownData.instagramFollowers > 0 && (
                            <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-3">
                                <p className="text-xs text-pink-400 font-semibold mb-1">◎ Instagram — @{user?.ownInstagram?.replace('@', '')}</p>
                                <div className="flex items-center space-x-3 text-xs text-neutral-300">
                                    <span className="flex items-center space-x-1"><Users className="w-3 h-3 text-blue-400" /><span>{formatNumber(ownData.instagramFollowers)}</span></span>
                                    {ownData.instagramPosts !== undefined && <span className="flex items-center space-x-1"><Film className="w-3 h-3 text-purple-400" /><span>{ownData.instagramPosts} posts</span></span>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ===== SECTION 2: REFERENCIAS ===== */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span>References</span>
                    </h2>
                    <button
                        onClick={() => setShowRefForm(!showRefForm)}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Reference</span>
                    </button>
                </div>
                <p className="text-sm text-neutral-500 mb-5">Name each reference and add their social networks to track performance.</p>

                {/* Add Reference Form */}
                {showRefForm && (
                    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 mb-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Reference Name</label>
                            <input
                                value={refName}
                                onChange={(e) => setRefName(e.target.value)}
                                placeholder='e.g. "ELSENSEI", "Crypto Guru"'
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/30"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Social URLs</label>
                            {refUrls.map((url, i) => (
                                <div key={i} className="flex items-center space-x-2 mb-2">
                                    <div className="flex-1 relative">
                                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                        <input
                                            value={url}
                                            onChange={(e) => {
                                                const updated = [...refUrls];
                                                updated[i] = e.target.value;
                                                setRefUrls(updated);
                                            }}
                                            placeholder="TikTok, Instagram, or YouTube URL"
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/30"
                                        />
                                    </div>
                                    {refUrls.length > 1 && (
                                        <button onClick={() => setRefUrls(refUrls.filter((_, idx) => idx !== i))} className="p-2 text-neutral-500 hover:text-red-400">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => setRefUrls([...refUrls, ''])}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1 mt-1"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Add another URL</span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleAddReference}
                                disabled={addingRef || !refName.trim()}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
                            >
                                {addingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                <span>{addingRef ? 'Extracting...' : 'Save Reference'}</span>
                            </button>
                            <button onClick={() => { setShowRefForm(false); setRefName(''); setRefUrls(['']); }} className="text-sm text-neutral-500 hover:text-white">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Grouped References */}
                <div className="space-y-5">
                    {Object.entries(groupedRefs).map(([groupName, refs]) => (
                        <div key={groupName} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
                            <h3 className="text-white font-bold text-base mb-3 tracking-wide uppercase">{groupName}</h3>
                            <div className="space-y-3">
                                {refs.map(ref => (
                                    <div key={ref.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm border ${platformColors[ref.platform] || platformColors.other}`}>
                                                {ref.platform === 'tiktok' ? '♪' : ref.platform === 'instagram' ? '◎' : ref.platform === 'youtube' ? '▶' : '●'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{ref.name}</p>
                                                <div className="flex items-center space-x-2 text-xs text-neutral-500">
                                                    <span className="capitalize">{ref.platform}</span>
                                                    {ref.author && <span>• {ref.author}</span>}
                                                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center space-x-0.5">
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3 text-xs shrink-0">
                                            {ref.followers !== undefined && ref.followers > 0 && (
                                                <span className="flex items-center space-x-1 text-blue-400">
                                                    <Users className="w-3 h-3" /><span>{formatNumber(ref.followers)}</span>
                                                </span>
                                            )}
                                            {ref.likes !== undefined && ref.likes > 0 && (
                                                <span className="flex items-center space-x-1 text-red-400">
                                                    <Heart className="w-3 h-3" /><span>{formatNumber(ref.likes)}</span>
                                                </span>
                                            )}
                                            {ref.videoCount !== undefined && ref.videoCount > 0 && (
                                                <span className="flex items-center space-x-1 text-purple-400">
                                                    <Film className="w-3 h-3" /><span>{ref.videoCount}</span>
                                                </span>
                                            )}
                                            <span className="font-bold text-white text-sm">{formatNumber(ref.views)}</span>
                                            <button onClick={() => handleRefresh(ref.id)} disabled={refreshingId === ref.id} className="p-1 text-neutral-500 hover:text-blue-400">
                                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === ref.id ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button onClick={() => removeReference(ref.id)} className="p-1 text-neutral-500 hover:text-red-400">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {references.length === 0 && (
                        <p className="text-neutral-500 text-sm text-center py-6">No references yet. Click &quot;Add Reference&quot; to start tracking competitors.</p>
                    )}
                </div>
            </section>

            {/* ===== SECTION 3: CONOCIMIENTO / KNOWLEDGE BASE ===== */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        <span>Knowledge Base</span>
                    </h2>
                    <button
                        onClick={() => setShowKnowledgeForm(!showKnowledgeForm)}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Knowledge</span>
                    </button>
                </div>
                <p className="text-sm text-neutral-500 mb-5">Add business context, structure details, and market data so the AI has deeper understanding of your business.</p>

                {/* Add Knowledge Form */}
                {showKnowledgeForm && (
                    <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 mb-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Title</label>
                            <input
                                value={knowledgeTitle}
                                onChange={(e) => setKnowledgeTitle(e.target.value)}
                                placeholder='e.g. "Brand Voice", "Target Audience", "Product Offerings"'
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/30"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">Content</label>
                            <textarea
                                value={knowledgeContent}
                                onChange={(e) => setKnowledgeContent(e.target.value)}
                                rows={6}
                                placeholder="Describe your business, audience, tone of voice, unique selling points, brand guidelines, product details, etc."
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                            />
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleAddKnowledge}
                                disabled={addingKnowledge || !knowledgeTitle.trim() || !knowledgeContent.trim()}
                                className="flex items-center space-x-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium text-sm disabled:opacity-50"
                            >
                                {addingKnowledge ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>{addingKnowledge ? 'Saving...' : 'Save Knowledge'}</span>
                            </button>
                            <button onClick={() => { setShowKnowledgeForm(false); setKnowledgeTitle(''); setKnowledgeContent(''); }} className="text-sm text-neutral-500 hover:text-white">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Knowledge Entries */}
                <div className="space-y-3">
                    {knowledge.map(entry => (
                        <div key={entry.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 group">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-semibold text-sm">{entry.title}</h4>
                                    <p className="text-neutral-400 text-sm mt-1 whitespace-pre-wrap line-clamp-4">{entry.content}</p>
                                    <p className="text-xs text-neutral-600 mt-2">{new Date(entry.createdAt).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => removeKnowledge(entry.id)} className="p-1.5 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {knowledge.length === 0 && (
                        <p className="text-neutral-500 text-sm text-center py-6">No knowledge entries yet. Add business context to make the AI generate better content.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
