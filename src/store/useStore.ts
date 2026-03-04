import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { calculateHookScore } from '@/lib/hookScoring';

export interface User {
    id: string;
    name: string;
    niche: string;
}

export interface Reference {
    id: string;
    url: string;
    name: string;
    platform: 'youtube' | 'tiktok' | 'instagram' | 'other';
    views: number;
    thumbnail?: string;
    author?: string;
    followers?: number;
    likes?: number;
    videoCount?: number;
    isProfile?: boolean;
}

export interface Hook {
    id: string;
    title: string;
    content: string;
    category: string;
    matchScore: number;
}

export interface ViewSnapshot {
    id: string;
    reference_id: string;
    views: number;
    captured_at: string;
}

interface StoreState {
    user: User | null;
    references: Reference[];
    hooks: Hook[];
    viewSnapshots: ViewSnapshot[];
    login: (name: string) => Promise<void>;
    logout: () => void;
    addReference: (ref: Omit<Reference, 'id'>) => Promise<void>;
    addReferenceFromUrl: (url: string) => Promise<void>;
    removeReference: (id: string) => Promise<void>;
    refreshReferenceViews: (id: string) => Promise<void>;
    addHook: (hook: Omit<Hook, 'id' | 'matchScore'> & { matchScore?: number }) => Promise<void>;
    removeHook: (id: string) => Promise<void>;
    captureViewSnapshots: () => Promise<void>;
    fetchViewSnapshots: () => Promise<void>;
}

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            user: null,
            references: [],
            hooks: [],
            viewSnapshots: [],

            login: async (name) => {
                let { data: account, error } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('name', name)
                    .maybeSingle();

                if (error || !account) {
                    const { data: newAccount } = await supabase
                        .from('accounts')
                        .insert([{ name, niche: 'Trading' }])
                        .select('*')
                        .single();
                    account = newAccount;
                }

                if (account) {
                    const { data: refsData } = await supabase
                        .from('market_references')
                        .select('*')
                        .eq('account_id', account.id);

                    const { data: hooksData } = await supabase
                        .from('hooks')
                        .select('*')
                        .eq('account_id', account.id);

                    set({
                        user: { id: account.id, name: account.name, niche: account.niche },
                        references: refsData?.map(r => ({
                            id: r.id, name: r.name, url: r.url, platform: r.platform, views: r.views,
                            thumbnail: r.thumbnail, author: r.author,
                            followers: r.followers, likes: r.likes, videoCount: r.video_count, isProfile: r.is_profile
                        })) || [],
                        hooks: hooksData?.map(h => ({
                            id: h.id, title: h.title, content: h.content, category: h.category, matchScore: h.match_score
                        })) || []
                    });
                }
            },

            logout: () => set({ user: null, references: [], hooks: [], viewSnapshots: [] }),

            addReference: async (ref) => {
                const userId = get().user?.id;
                if (!userId) return;
                const { data, error } = await supabase
                    .from('market_references')
                    .insert([{
                        account_id: userId, name: ref.name, url: ref.url,
                        platform: ref.platform, views: ref.views,
                        thumbnail: ref.thumbnail, author: ref.author,
                        followers: ref.followers || 0, likes: ref.likes || 0,
                        video_count: ref.videoCount || 0, is_profile: ref.isProfile || false
                    }])
                    .select('*')
                    .single();
                if (data) {
                    set((state) => ({
                        references: [...state.references, {
                            id: data.id, name: data.name, url: data.url,
                            platform: data.platform, views: data.views,
                            thumbnail: data.thumbnail, author: data.author,
                            followers: data.followers, likes: data.likes,
                            videoCount: data.video_count, isProfile: data.is_profile
                        }]
                    }));
                }
            },

            addReferenceFromUrl: async (url: string) => {
                try {
                    const response = await fetch('/api/extract-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);

                    await get().addReference({
                        url,
                        name: data.title,
                        platform: data.platform,
                        views: data.views,
                        thumbnail: data.thumbnail,
                        author: data.author,
                    });
                } catch (error) {
                    console.error('Failed to extract URL:', error);
                    // Fallback: add with basic info
                    const platform = url.includes('youtube') || url.includes('youtu.be') ? 'youtube' as const
                        : url.includes('tiktok') ? 'tiktok' as const
                            : url.includes('instagram') ? 'instagram' as const
                                : 'other' as const;
                    await get().addReference({
                        url,
                        name: new URL(url).hostname,
                        platform,
                        views: 0,
                    });
                }
            },

            removeReference: async (id) => {
                const { error } = await supabase.from('market_references').delete().eq('id', id);
                if (!error) {
                    set((state) => ({ references: state.references.filter((r) => r.id !== id) }));
                }
            },

            refreshReferenceViews: async (id: string) => {
                const ref = get().references.find(r => r.id === id);
                if (!ref) return;
                try {
                    const response = await fetch('/api/extract-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: ref.url }),
                    });
                    const data = await response.json();
                    if (data.error) return;

                    await supabase
                        .from('market_references')
                        .update({ views: data.views, name: data.title })
                        .eq('id', id);

                    set((state) => ({
                        references: state.references.map(r =>
                            r.id === id ? { ...r, views: data.views, name: data.title } : r
                        )
                    }));
                } catch (error) {
                    console.error('Failed to refresh views:', error);
                }
            },

            addHook: async (hook) => {
                const userId = get().user?.id;
                if (!userId) return;

                // Calculate real score
                const scoreResult = calculateHookScore(hook.title, hook.content);
                const matchScore = hook.matchScore ?? scoreResult.total;

                const { data, error } = await supabase
                    .from('hooks')
                    .insert([{ account_id: userId, title: hook.title, content: hook.content, category: hook.category, match_score: matchScore }])
                    .select('*')
                    .single();
                if (data) {
                    set((state) => ({
                        hooks: [...state.hooks, { id: data.id, title: data.title, content: data.content, category: data.category, matchScore: data.match_score }]
                    }));
                }
            },

            removeHook: async (id) => {
                const { error } = await supabase.from('hooks').delete().eq('id', id);
                if (!error) {
                    set((state) => ({ hooks: state.hooks.filter((h) => h.id !== id) }));
                }
            },

            captureViewSnapshots: async () => {
                const refs = get().references;
                const snapshots = refs.map(ref => ({
                    reference_id: ref.id,
                    views: ref.views,
                    captured_at: new Date().toISOString(),
                }));
                if (snapshots.length > 0) {
                    await supabase.from('view_snapshots').insert(snapshots);
                }
            },

            fetchViewSnapshots: async () => {
                const refIds = get().references.map(r => r.id);
                if (refIds.length === 0) return;
                const { data } = await supabase
                    .from('view_snapshots')
                    .select('*')
                    .in('reference_id', refIds)
                    .order('captured_at', { ascending: true });
                if (data) {
                    set({ viewSnapshots: data });
                }
            },
        }),
        {
            name: 'hooklab-storage',
        }
    )
);
