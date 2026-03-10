import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export interface PostData {
    id: string;
    caption: string;
    likes: number;
    comments: number;
    views: number;
    url: string;
    platform: 'tiktok' | 'instagram';
    timestamp?: string;
    isVideo?: boolean;
}

export interface OwnSocialData {
    tiktokFollowers?: number;
    tiktokLikes?: number;
    tiktokVideos?: number;
    tiktokNickname?: string;
    instagramFollowers?: number;
    instagramPosts?: number;
    tiktokPostsList?: PostData[];
    instagramPostsList?: PostData[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    niche: string;
    ownTiktok?: string;
    ownInstagram?: string;
    ownSocialData?: OwnSocialData;
}

// ─── NEW: Workspace ───
export interface Workspace {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    plan: 'free' | 'pro' | 'agency';
    ownTiktok: string;
    ownInstagram: string;
    ownSocialData: OwnSocialData;
    niche: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
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

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface StoreState {
    user: User | null;
    // ─── NEW: Workspace state ───
    workspaces: Workspace[];
    activeWorkspace: Workspace | null;
    references: Reference[];
    knowledge: KnowledgeEntry[];
    chatMessages: ChatMessage[];
    setChatMessages: (messages: ChatMessage[]) => void;
    clearChatMessages: () => void;
    login: (email: string) => Promise<void>;
    logout: () => void;
    // ─── NEW: Workspace actions ───
    switchWorkspace: (workspaceId: string) => Promise<void>;
    createWorkspace: (name: string, niche?: string) => Promise<Workspace | null>;
    updateOwnSocials: (tiktok: string, instagram: string) => Promise<void>;
    addReference: (ref: Omit<Reference, 'id'>) => Promise<void>;
    addReferenceFromUrl: (url: string, refName: string) => Promise<void>;
    removeReference: (id: string) => Promise<void>;
    refreshReferenceViews: (id: string) => Promise<void>;
    addKnowledge: (entry: Omit<KnowledgeEntry, 'id' | 'createdAt'>) => Promise<void>;
    removeKnowledge: (id: string) => Promise<void>;
}

// ─── Helper: load workspace data ───
async function loadWorkspaceData(workspaceId: string) {
    const [refsRes, knowledgeRes, videosRes] = await Promise.all([
        supabase.from('market_references').select('*').eq('workspace_id', workspaceId),
        supabase.from('knowledge_entries').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
        supabase.from('scraped_videos').select('*').eq('workspace_id', workspaceId).eq('platform', 'tiktok').order('views', { ascending: false }),
    ]);

    const references = refsRes.data?.map(r => ({
        id: r.id, refName: r.ref_name || '', name: r.name, url: r.url,
        platform: r.platform, views: r.views,
        thumbnail: r.thumbnail, author: r.author,
        followers: r.followers, likes: r.likes,
        videoCount: r.video_count, isProfile: r.is_profile
    })) || [];

    const knowledge = knowledgeRes.data?.map(k => ({
        id: k.id, title: k.title, content: k.content, createdAt: k.created_at
    })) || [];

    const scrapedVideos = videosRes.data || [];

    return { references, knowledge, scrapedVideos };
}

export const useStore = create<StoreState>()(
    persist(
        (set, get) => ({
            user: null,
            workspaces: [],
            activeWorkspace: null,
            references: [],
            knowledge: [],
            chatMessages: [],

            setChatMessages: (messages) => set({ chatMessages: messages }),
            clearChatMessages: () => set({ chatMessages: [] }),

            login: async (email) => {
                // 1. Find or create account (user)
                let { data: account } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('email', email.toLowerCase().trim())
                    .maybeSingle();

                if (!account) {
                    const name = email.split('@')[0];
                    const { data: newAccount } = await supabase
                        .from('accounts')
                        .insert([{ email: email.toLowerCase().trim(), name, niche: 'Trading' }])
                        .select('*')
                        .single();
                    account = newAccount;
                }

                if (!account) return;

                // 2. Load user's workspaces via workspace_members
                const { data: memberships } = await supabase
                    .from('workspace_members')
                    .select('workspace_id, role, workspaces(*)')
                    .eq('user_id', account.id);

                let workspaces: Workspace[] = [];

                if (memberships && memberships.length > 0) {
                    workspaces = memberships.map((m: any) => {
                        const ws = m.workspaces;
                        return {
                            id: ws.id,
                            name: ws.name,
                            slug: ws.slug || '',
                            logoUrl: ws.logo_url || '',
                            plan: ws.plan || 'free',
                            ownTiktok: ws.own_tiktok || '',
                            ownInstagram: ws.own_instagram || '',
                            ownSocialData: ws.own_social_data || {},
                            niche: ws.niche || '',
                            role: m.role,
                        };
                    });
                } else {
                    // No workspaces yet — create one automatically (first-time user or pre-migration)
                    const slug = account.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workspace';
                    const { data: newWs } = await supabase
                        .from('workspaces')
                        .insert([{
                            name: account.name || 'Mi Workspace',
                            slug,
                            owner_id: account.id,
                            own_tiktok: account.own_tiktok || '',
                            own_instagram: account.own_instagram || '',
                            own_social_data: account.own_social_data || {},
                            niche: account.niche || '',
                        }])
                        .select('*')
                        .single();

                    if (newWs) {
                        await supabase.from('workspace_members').insert([{
                            workspace_id: newWs.id,
                            user_id: account.id,
                            role: 'owner',
                        }]);

                        workspaces = [{
                            id: newWs.id,
                            name: newWs.name,
                            slug: newWs.slug || '',
                            logoUrl: '',
                            plan: 'free',
                            ownTiktok: newWs.own_tiktok || '',
                            ownInstagram: newWs.own_instagram || '',
                            ownSocialData: newWs.own_social_data || {},
                            niche: newWs.niche || '',
                            role: 'owner',
                        }];
                    }
                }

                // 3. Select active workspace (first one, or previously saved)
                const savedWsId = localStorage.getItem('hooklab-active-workspace');
                const activeWs = workspaces.find(w => w.id === savedWsId) || workspaces[0] || null;

                // 4. Load workspace data
                let references: Reference[] = [];
                let knowledge: KnowledgeEntry[] = [];
                let ownSocialData: OwnSocialData = activeWs?.ownSocialData || {};

                if (activeWs) {
                    const wsData = await loadWorkspaceData(activeWs.id);
                    references = wsData.references;
                    knowledge = wsData.knowledge;

                    if (wsData.scrapedVideos.length > 0) {
                        ownSocialData = {
                            ...ownSocialData,
                            tiktokPostsList: wsData.scrapedVideos.map((v: any) => ({
                                id: v.video_id, caption: v.caption || '',
                                likes: v.likes || 0, comments: v.comments || 0, views: v.views || 0,
                                url: v.url || '', thumbnail: v.thumbnail || '',
                                platform: 'tiktok' as const, timestamp: v.timestamp, isVideo: true,
                            })),
                        };
                    }

                    localStorage.setItem('hooklab-active-workspace', activeWs.id);
                }

                set({
                    user: {
                        id: account.id,
                        name: account.name,
                        email: account.email || '',
                        niche: activeWs?.niche || account.niche || '',
                        ownTiktok: activeWs?.ownTiktok || account.own_tiktok || '',
                        ownInstagram: activeWs?.ownInstagram || account.own_instagram || '',
                        ownSocialData,
                    },
                    workspaces,
                    activeWorkspace: activeWs,
                    references,
                    knowledge,
                });

                console.log(`[Login] ${account.email} → ${workspaces.length} workspace(s), active: ${activeWs?.name}`);
            },

            logout: () => {
                localStorage.removeItem('hooklab-active-workspace');
                set({ user: null, workspaces: [], activeWorkspace: null, references: [], knowledge: [], chatMessages: [] });
            },

            // ─── NEW: Switch workspace ───
            switchWorkspace: async (workspaceId: string) => {
                const { workspaces } = get();
                const ws = workspaces.find(w => w.id === workspaceId);
                if (!ws) return;

                const wsData = await loadWorkspaceData(ws.id);
                let ownSocialData: OwnSocialData = ws.ownSocialData || {};

                if (wsData.scrapedVideos.length > 0) {
                    ownSocialData = {
                        ...ownSocialData,
                        tiktokPostsList: wsData.scrapedVideos.map((v: any) => ({
                            id: v.video_id, caption: v.caption || '',
                            likes: v.likes || 0, comments: v.comments || 0, views: v.views || 0,
                            url: v.url || '', thumbnail: v.thumbnail || '',
                            platform: 'tiktok' as const, timestamp: v.timestamp, isVideo: true,
                        })),
                    };
                }

                localStorage.setItem('hooklab-active-workspace', ws.id);

                set((state) => ({
                    activeWorkspace: ws,
                    references: wsData.references,
                    knowledge: wsData.knowledge,
                    chatMessages: [],  // Clear chat on workspace switch
                    user: state.user ? {
                        ...state.user,
                        niche: ws.niche,
                        ownTiktok: ws.ownTiktok,
                        ownInstagram: ws.ownInstagram,
                        ownSocialData,
                    } : null,
                }));

                console.log(`[Workspace] Switched to: ${ws.name}`);
            },

            // ─── NEW: Create workspace ───
            createWorkspace: async (name: string, niche?: string) => {
                const userId = get().user?.id;
                if (!userId) return null;

                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                const { data: ws } = await supabase
                    .from('workspaces')
                    .insert([{ name, slug, owner_id: userId, niche: niche || '' }])
                    .select('*')
                    .single();

                if (!ws) return null;

                await supabase.from('workspace_members').insert([{
                    workspace_id: ws.id,
                    user_id: userId,
                    role: 'owner',
                }]);

                const newWs: Workspace = {
                    id: ws.id, name: ws.name, slug: ws.slug || '',
                    logoUrl: '', plan: 'free',
                    ownTiktok: '', ownInstagram: '',
                    ownSocialData: {}, niche: ws.niche || '', role: 'owner',
                };

                set((state) => ({ workspaces: [...state.workspaces, newWs] }));
                console.log(`[Workspace] Created: ${name}`);
                return newWs;
            },

            updateOwnSocials: async (tiktok, instagram) => {
                const userId = get().user?.id;
                const wsId = get().activeWorkspace?.id;
                if (!userId) return;

                // Save to workspace if available, fall back to account
                if (wsId) {
                    await supabase
                        .from('workspaces')
                        .update({ own_tiktok: tiktok, own_instagram: instagram })
                        .eq('id', wsId);
                }
                await supabase
                    .from('accounts')
                    .update({ own_tiktok: tiktok, own_instagram: instagram })
                    .eq('id', userId);

                const existingData = get().user?.ownSocialData || {};
                let ownSocialData: OwnSocialData = { ...existingData };

                // ===== TIKTOK =====
                if (tiktok.trim()) {
                    const username = tiktok.replace('@', '').trim();

                    try {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 8000);
                        const res = await fetch('/api/extract-url', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: `https://www.tiktok.com/@${username}` }),
                            signal: controller.signal,
                        });
                        clearTimeout(timeout);
                        const data = await res.json();
                        if (!data.error) {
                            ownSocialData.tiktokFollowers = data.followers || ownSocialData.tiktokFollowers || 0;
                            ownSocialData.tiktokLikes = data.likes || ownSocialData.tiktokLikes || 0;
                            ownSocialData.tiktokVideos = data.videoCount || ownSocialData.tiktokVideos || 0;
                            ownSocialData.tiktokNickname = data.title || username;
                        }
                    } catch (e) { console.log('TikTok profile stats fetch skipped'); }

                    try {
                        const missionRes = await fetch('/api/scrape-mission', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ accountId: userId, workspaceId: wsId, username, platform: 'tiktok' }),
                        });
                        const missionData = await missionRes.json();
                        const missionId = missionData.missionId;

                        if (missionId) {
                            console.log(`[TikTok] Scrape mission: ${missionId}`);
                            const maxWait = 60000;
                            const startTime = Date.now();

                            while (Date.now() - startTime < maxWait) {
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                const statusRes = await fetch(`/api/scrape-mission?missionId=${missionId}`);
                                const statusData = await statusRes.json();

                                if (statusData.mission?.status === 'completed') {
                                    ownSocialData.tiktokPostsList = statusData.videos || [];
                                    if (statusData.videos?.length > 0) ownSocialData.tiktokVideos = statusData.videos.length;
                                    break;
                                } else if (statusData.mission?.status === 'failed') break;
                            }
                        }
                    } catch (e) { console.error('TikTok scrape error:', e); }

                    if (!ownSocialData.tiktokPostsList?.length) {
                        try {
                            const { data: videos } = await supabase
                                .from('scraped_videos').select('*')
                                .eq(wsId ? 'workspace_id' : 'account_id', wsId || userId)
                                .eq('platform', 'tiktok').order('views', { ascending: false });
                            if (videos && videos.length > 0) {
                                ownSocialData.tiktokPostsList = videos.map((v: any) => ({
                                    id: v.video_id, caption: v.caption || '', likes: v.likes || 0,
                                    comments: v.comments || 0, views: v.views || 0, url: v.url || '',
                                    thumbnail: v.thumbnail || '', platform: 'tiktok' as const,
                                    timestamp: v.timestamp, isVideo: true,
                                }));
                            }
                        } catch (e) { console.error('Failed to load scraped videos:', e); }
                    }
                }

                // ===== INSTAGRAM =====
                if (instagram.trim()) {
                    try {
                        const username = instagram.replace('@', '').trim();
                        const res = await fetch('/api/extract-url', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: `https://www.instagram.com/${username}` }),
                        });
                        const data = await res.json();
                        if (!data.error) {
                            ownSocialData.instagramFollowers = data.followers || 0;
                            ownSocialData.instagramPosts = data.videoCount || 0;
                        }
                    } catch (e) { console.error('Instagram stats error:', e); }

                    try {
                        const postsRes = await fetch('/api/fetch-own-data', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ instagram: instagram.trim() }),
                        });
                        const postsData = await postsRes.json();
                        if (postsData.success && postsData.instagramPosts?.length > 0) {
                            ownSocialData.instagramPostsList = postsData.instagramPosts;
                        }
                    } catch (e) { console.error('Instagram posts error:', e); }
                }

                // Save social data
                if (wsId) {
                    await supabase.from('workspaces').update({ own_social_data: ownSocialData }).eq('id', wsId);
                }
                await supabase.from('accounts').update({ own_social_data: ownSocialData }).eq('id', userId);

                set((state) => ({
                    user: state.user ? { ...state.user, ownTiktok: tiktok, ownInstagram: instagram, ownSocialData } : null,
                    activeWorkspace: state.activeWorkspace ? { ...state.activeWorkspace, ownTiktok: tiktok, ownInstagram: instagram, ownSocialData } : null,
                }));
            },

            addReference: async (ref) => {
                const userId = get().user?.id;
                const wsId = get().activeWorkspace?.id;
                if (!userId) return;
                const { data } = await supabase
                    .from('market_references')
                    .insert([{
                        account_id: userId, workspace_id: wsId || userId,
                        ref_name: ref.refName, name: ref.name, url: ref.url,
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
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url }),
                    });
                    const data = await response.json();
                    if (data.error) throw new Error(data.error);
                    await get().addReference({
                        refName, url, name: data.title, platform: data.platform, views: data.views,
                        thumbnail: data.thumbnail, author: data.author,
                        followers: data.followers, likes: data.likes,
                        videoCount: data.videoCount, isProfile: data.isProfile,
                    });
                } catch (error) {
                    console.error('Failed to extract URL:', error);
                    const platform = url.includes('youtube') || url.includes('youtu.be') ? 'youtube' as const
                        : url.includes('tiktok') ? 'tiktok' as const
                            : url.includes('instagram') ? 'instagram' as const : 'other' as const;
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
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: ref.url }),
                    });
                    const data = await response.json();
                    if (data.error) return;
                    await supabase.from('market_references')
                        .update({ views: data.views, name: data.title, followers: data.followers || 0, likes: data.likes || 0 })
                        .eq('id', id);
                    set((state) => ({
                        references: state.references.map(r =>
                            r.id === id ? { ...r, views: data.views, name: data.title, followers: data.followers, likes: data.likes } : r
                        )
                    }));
                } catch (error) { console.error('Failed to refresh views:', error); }
            },

            addKnowledge: async (entry) => {
                const userId = get().user?.id;
                const wsId = get().activeWorkspace?.id;
                if (!userId) return;
                const { data } = await supabase
                    .from('knowledge_entries')
                    .insert([{ account_id: userId, workspace_id: wsId || userId, title: entry.title, content: entry.content }])
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
