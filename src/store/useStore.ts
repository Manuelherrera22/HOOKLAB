import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface User {
    id: string;
    name: string;
    niche: string;
    ownTiktok?: string;
    ownInstagram?: string;
}

export interface Reference {
    id: string;
    refName: string;
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

export interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    createdAt: string;
}

interface StoreState {
    user: User | null;
    references: Reference[];
    knowledge: KnowledgeEntry[];
    login: (name: string) => Promise<void>;
    logout: () => void;
    updateOwnSocials: (tiktok: string, instagram: string) => Promise<void>;
    addReference: (ref: Omit<Reference, 'id'>) => Promise<void>;
    addReferenceFromUrl: (url: string, refName: string) => Promise<void>;
    removeReference: (id: string) => Promise<void>;
    refreshReferenceViews: (id: string) => Promise<void>;
    addKnowledge: (entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>) => Promise<void>;
    removeKnowledge: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            user: null,
            references: [],
            knowledge: [],

            login: async (name) => {
                let { data: account } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('name', name)
                    .maybeSingle();

                if (!account) {
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

                    const { data: knowledgeData } = await supabase
                        .from('knowledge_entries')
                        .select('*')
                        .eq('account_id', account.id)
                        .order('created_at', { ascending: false });

                    set({
                        user: {
                            id: account.id, name: account.name, niche: account.niche,
                            ownTiktok: account.own_tiktok || '', ownInstagram: account.own_instagram || ''
                        },
                        references: refsData?.map(r => ({
                            id: r.id, refName: r.ref_name || '', name: r.name, url: r.url,
                            platform: r.platform, views: r.views,
                            thumbnail: r.thumbnail, author: r.author,
                            followers: r.followers, likes: r.likes,
                            videoCount: r.video_count, isProfile: r.is_profile
                        })) || [],
                        knowledge: knowledgeData?.map(k => ({
                            id: k.id, title: k.title, content: k.content, createdAt: k.created_at
                        })) || []
                    });
                }
            },

            logout: () => set({ user: null, references: [], knowledge: [] }),

            updateOwnSocials: async (tiktok, instagram) => {
                const userId = get().user?.id;
                if (!userId) return;
                await supabase
                    .from('accounts')
                    .update({ own_tiktok: tiktok, own_instagram: instagram })
                    .eq('id', userId);
                set((state) => ({
                    user: state.user ? { ...state.user, ownTiktok: tiktok, ownInstagram: instagram } : null
                }));
            },

            addReference: async (ref) => {
                const userId = get().user?.id;
                if (!userId) return;
                const { data } = await supabase
                    .from('market_references')
                    .insert([{
                        account_id: userId, ref_name: ref.refName, name: ref.name, url: ref.url,
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
                            id: data.id, refName: data.ref_name || '', name: data.name, url: data.url,
                            platform: data.platform, views: data.views,
                            thumbnail: data.thumbnail, author: data.author,
                            followers: data.followers, likes: data.likes,
                            videoCount: data.video_count, isProfile: data.is_profile
                        }]
                    }));
                }
            },

            addReferenceFromUrl: async (url: string, refName: string) => {
                try {
                    const response = await fetch('/api/extract-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);

                    await get().addReference({
                        refName,
                        url,
                        name: data.title,
                        platform: data.platform,
                        views: data.views,
                        thumbnail: data.thumbnail,
                        author: data.author,
                        followers: data.followers,
                        likes: data.likes,
                        videoCount: data.videoCount,
                        isProfile: data.isProfile,
                    });
                } catch (error) {
                    console.error('Failed to extract URL:', error);
                    const platform = url.includes('youtube') || url.includes('youtu.be') ? 'youtube' as const
                        : url.includes('tiktok') ? 'tiktok' as const
                            : url.includes('instagram') ? 'instagram' as const
                                : 'other' as const;
                    await get().addReference({ refName, url, name: new URL(url).hostname, platform, views: 0 });
                }
            },

            removeReference: async (id) => {
                await supabase.from('market_references').delete().eq('id', id);
                set((state) => ({ references: state.references.filter((r) => r.id !== id) }));
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
                        .update({ views: data.views, name: data.title, followers: data.followers || 0, likes: data.likes || 0 })
                        .eq('id', id);

                    set((state) => ({
                        references: state.references.map(r =>
                            r.id === id ? { ...r, views: data.views, name: data.title, followers: data.followers, likes: data.likes } : r
                        )
                    }));
                } catch (error) {
                    console.error('Failed to refresh views:', error);
                }
            },

            addKnowledge: async (entry) => {
                const userId = get().user?.id;
                if (!userId) return;
                const { data } = await supabase
                    .from('knowledge_entries')
                    .insert([{ account_id: userId, title: entry.title, content: entry.content }])
                    .select('*')
                    .single();
                if (data) {
                    set((state) => ({
                        knowledge: [{ id: data.id, title: data.title, content: data.content, createdAt: data.created_at }, ...state.knowledge]
                    }));
                }
            },

            removeKnowledge: async (id) => {
                await supabase.from('knowledge_entries').delete().eq('id', id);
                set((state) => ({ knowledge: state.knowledge.filter((k) => k.id !== id) }));
            },
        }),
        { name: 'hooklab-storage' }
    )
);
