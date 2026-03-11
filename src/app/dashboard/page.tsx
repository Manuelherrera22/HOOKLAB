"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import {
    Instagram, Plus, Trash2, ExternalLink, RefreshCw, Loader2,
    Users, Heart, Film, BookOpen, Save, Link2, X, TrendingUp,
    Video, Calendar, Globe, Check, Sparkles, Target, BarChart3,
    Upload, FileText
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
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [scheduledCount, setScheduledCount] = useState(0);

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
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const knowledgeFileRef = useRef<HTMLInputElement>(null);

    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.id) {
            fetch(`/api/scheduled-posts?accountId=${user.id}&status=scheduled`)
                .then(r => r.json()).then(j => setScheduledCount(j.posts?.length || 0)).catch(() => { });
        }
    }, [user?.id]);

    // ─ Social accounts from workspace_social_accounts table ─
    const [socialAccounts, setSocialAccounts] = useState<{ id: string; platform: string; username: string; is_primary: boolean; profile_data: any }[]>([]);

    useEffect(() => {
        const ws = useStore.getState().activeWorkspace;
        if (ws?.id) {
            fetch(`/api/workspace/social-accounts?workspaceId=${ws.id}`)
                .then(r => r.json())
                .then(j => setSocialAccounts(j.accounts || []))
                .catch(() => { });
        }
    }, []);

    const connectedAccounts = socialAccounts.length;

    const handleSaveSocials = async () => {
        setSavingSocials(true); setSaveSuccess(false);
        await updateOwnSocials(ownTiktok, ownInstagram);
        setSavingSocials(false); setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
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

    // ─── Knowledge document upload ───
    const handleKnowledgeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingDocument(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/knowledge-upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setKnowledgeTitle(data.title || file.name);
                setKnowledgeContent(data.content || '');
                setShowKnowledgeForm(true);
            } else {
                alert('Error processing file: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Knowledge upload error:', err);
            alert('Failed to upload document');
        } finally {
            setUploadingDocument(false);
            if (knowledgeFileRef.current) knowledgeFileRef.current.value = '';
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
        youtube: 'text-neutral-300 bg-white/5 border-white/10',
        tiktok: 'text-neutral-300 bg-white/5 border-white/10',
        instagram: 'text-neutral-300 bg-white/5 border-white/10',
        other: 'text-neutral-400 bg-white/5 border-white/10',
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
                    Welcome, {user?.name} 👋
                </h1>
                <p className="text-neutral-400 text-sm">Your command center for social intelligence, content creation, and publishing.</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "Accounts", value: connectedAccounts, max: 2, icon: <Globe className="w-5 h-5" />, color: "text-neutral-300", bg: "bg-white/5 border-white/10" },
                    { label: "References", value: references.length, icon: <Target className="w-5 h-5" />, color: "text-neutral-300", bg: "bg-white/5 border-white/10" },
                    { label: "Knowledge", value: knowledge.length, icon: <BookOpen className="w-5 h-5" />, color: "text-neutral-300", bg: "bg-white/5 border-white/10" },
                    { label: "Scheduled", value: scheduledCount, icon: <Calendar className="w-5 h-5" />, color: "text-neutral-300", bg: "bg-white/5 border-white/10" },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-2xl p-4 flex items-center gap-3`}>
                        <div className={`${s.color}`}>{s.icon}</div>
                        <div>
                            <p className="text-xl font-bold text-white">{s.value}{s.max ? `/${s.max}` : ''}</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Save Success Toast */}
            {saveSuccess && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-neutral-300 animate-in fade-in">
                    <Check className="w-4 h-4" /> Accounts saved and connected successfully!
                </div>
            )}

            {/* ===== SECTION 1: CONNECTED SOCIAL ACCOUNTS ===== */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Globe className="w-5 h-5 text-neutral-400" />
                        <span>Connected Accounts</span>
                    </h2>
                    <a href="/dashboard/settings" className="text-xs text-neutral-500 hover:text-white transition-colors">
                        Manage →
                    </a>
                </div>
                <p className="text-sm text-neutral-500 mb-4">{connectedAccounts} social account{connectedAccounts !== 1 ? 's' : ''} linked to this workspace.</p>

                {socialAccounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {socialAccounts.map(acc => (
                            <div key={acc.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm shrink-0">
                                    {acc.platform === 'tiktok' ? '♪' : acc.platform === 'instagram' ? '◎' : '▶'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        @{acc.username}
                                        {acc.is_primary && (
                                            <span className="ml-1.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded uppercase">primary</span>
                                        )}
                                    </p>
                                    <p className="text-xs text-neutral-500 capitalize">{acc.platform}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-neutral-500 text-sm text-center py-4">
                        No accounts connected yet. <a href="/dashboard/settings" className="text-white hover:underline">Connect one →</a>
                    </p>
                )}
            </section>

            {/* ===== SECTION 2: REFERENCIAS ===== */}
            <section className="bg-card border border-border rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Users className="w-5 h-5 text-neutral-400" />
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
                                className="text-xs text-neutral-400 hover:text-neutral-300 flex items-center space-x-1 mt-1"
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
                                                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-300 flex items-center space-x-0.5">
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3 text-xs shrink-0">
                                            {ref.followers !== undefined && ref.followers > 0 && (
                                                <span className="flex items-center space-x-1 text-neutral-400">
                                                    <Users className="w-3 h-3" /><span>{formatNumber(ref.followers)}</span>
                                                </span>
                                            )}
                                            {ref.likes !== undefined && ref.likes > 0 && (
                                                <span className="flex items-center space-x-1 text-neutral-400">
                                                    <Heart className="w-3 h-3" /><span>{formatNumber(ref.likes)}</span>
                                                </span>
                                            )}
                                            {ref.videoCount !== undefined && ref.videoCount > 0 && (
                                                <span className="flex items-center space-x-1 text-neutral-400">
                                                    <Film className="w-3 h-3" /><span>{ref.videoCount}</span>
                                                </span>
                                            )}
                                            <span className="font-bold text-white text-sm">{formatNumber(ref.views)}</span>
                                            <button onClick={() => handleRefresh(ref.id)} disabled={refreshingId === ref.id} className="p-1 text-neutral-600 hover:text-neutral-300">
                                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === ref.id ? 'animate-spin' : ''}`} />
                                            </button>
                                            <button onClick={() => removeReference(ref.id)} className="p-1 text-neutral-600 hover:text-neutral-300">
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
                        <BookOpen className="w-5 h-5 text-neutral-400" />
                        <span>Knowledge Base</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        <input
                            ref={knowledgeFileRef}
                            type="file"
                            accept=".txt,.pdf,.csv,.json,.md,.docx"
                            onChange={handleKnowledgeFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => knowledgeFileRef.current?.click()}
                            disabled={uploadingDocument}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-white/5 border border-white/10 text-neutral-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            {uploadingDocument ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>{uploadingDocument ? 'Processing...' : 'Upload Doc'}</span>
                        </button>
                        <button
                            onClick={() => setShowKnowledgeForm(!showKnowledgeForm)}
                            className="flex items-center space-x-1.5 px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Knowledge</span>
                        </button>
                    </div>
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
                                <button onClick={() => removeKnowledge(entry.id)} className="p-1.5 text-neutral-600 hover:text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
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
