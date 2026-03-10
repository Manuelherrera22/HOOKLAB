"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import {
    Settings, Globe, Users, Plus, Trash2, Loader2, Save, Check,
    Shield, Crown, Edit3, Eye, UserPlus, X, ChevronDown
} from "lucide-react";

interface SocialAccount {
    id: string;
    platform: string;
    username: string;
    display_name: string;
    profile_data: any;
    is_primary: boolean;
    connected_at: string;
}

interface Member {
    id: string;
    userId: string;
    role: string;
    name: string;
    email: string;
    inviteStatus: string;
    joinedAt: string;
}

const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "accounts", label: "Social Accounts", icon: Globe },
    { id: "team", label: "Team", icon: Users },
];

const roleIcons: Record<string, any> = {
    owner: Crown,
    admin: Shield,
    editor: Edit3,
    viewer: Eye,
};

const roleColors: Record<string, string> = {
    owner: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    admin: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    editor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    viewer: "text-neutral-400 bg-white/5 border-white/10",
};

const platformEmoji: Record<string, string> = {
    tiktok: "♪",
    instagram: "◎",
    youtube: "▶",
};

export default function SettingsPage() {
    const activeWorkspace = useStore((s) => s.activeWorkspace);
    const user = useStore((s) => s.user);

    const [activeTab, setActiveTab] = useState("general");

    // General state
    const [wsName, setWsName] = useState(activeWorkspace?.name || "");
    const [wsNiche, setWsNiche] = useState(activeWorkspace?.niche || "");
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [generalSaved, setGeneralSaved] = useState(false);

    // Social accounts state
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [newPlatform, setNewPlatform] = useState("tiktok");
    const [newUsername, setNewUsername] = useState("");
    const [addingAccount, setAddingAccount] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Team state
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("editor");
    const [inviting, setInviting] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // Load social accounts
    useEffect(() => {
        if (!activeWorkspace?.id) return;
        setLoadingAccounts(true);
        fetch(`/api/workspace/social-accounts?workspaceId=${activeWorkspace.id}`)
            .then((r) => r.json())
            .then((j) => setSocialAccounts(j.accounts || []))
            .catch(() => { })
            .finally(() => setLoadingAccounts(false));
    }, [activeWorkspace?.id]);

    // Load members
    useEffect(() => {
        if (!activeWorkspace?.id) return;
        setLoadingMembers(true);
        fetch(`/api/workspace/members?workspaceId=${activeWorkspace.id}`)
            .then((r) => r.json())
            .then((j) => setMembers(j.members || []))
            .catch(() => { })
            .finally(() => setLoadingMembers(false));
    }, [activeWorkspace?.id]);

    // Sync form with active workspace
    useEffect(() => {
        setWsName(activeWorkspace?.name || "");
        setWsNiche(activeWorkspace?.niche || "");
    }, [activeWorkspace?.id]);

    const handleSaveGeneral = async () => {
        if (!activeWorkspace?.id) return;
        setSavingGeneral(true);
        setGeneralSaved(false);
        try {
            await fetch("/api/workspace/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspace.id, name: wsName, niche: wsNiche }),
            });
            setGeneralSaved(true);
            setTimeout(() => setGeneralSaved(false), 3000);
        } catch { }
        setSavingGeneral(false);
    };

    const handleAddAccount = async () => {
        if (!activeWorkspace?.id || !newUsername.trim()) return;
        setAddingAccount(true);
        try {
            const res = await fetch("/api/workspace/social-accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspace.id, platform: newPlatform, username: newUsername }),
            });
            const json = await res.json();
            if (json.account) {
                setSocialAccounts((prev) => [...prev, json.account]);
                setNewUsername("");
                setShowAddAccount(false);
            }
        } catch { }
        setAddingAccount(false);
    };

    const handleDeleteAccount = async (id: string) => {
        setDeletingId(id);
        try {
            await fetch(`/api/workspace/social-accounts?id=${id}`, { method: "DELETE" });
            setSocialAccounts((prev) => prev.filter((a) => a.id !== id));
        } catch { }
        setDeletingId(null);
    };

    const handleInvite = async () => {
        if (!activeWorkspace?.id || !inviteEmail.trim()) return;
        setInviting(true);
        try {
            const res = await fetch("/api/workspace/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspace.id, email: inviteEmail, role: inviteRole }),
            });
            const json = await res.json();
            if (json.member) {
                // Reload members
                const membersRes = await fetch(`/api/workspace/members?workspaceId=${activeWorkspace.id}`);
                const membersJson = await membersRes.json();
                setMembers(membersJson.members || []);
                setInviteEmail("");
                setShowInvite(false);
            }
        } catch { }
        setInviting(false);
    };

    const handleRemoveMember = async (memberId: string) => {
        setRemovingId(memberId);
        try {
            await fetch(`/api/workspace/members?memberId=${memberId}`, { method: "DELETE" });
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
        } catch { }
        setRemovingId(null);
    };

    const handleChangeRole = async (memberId: string, newRole: string) => {
        try {
            await fetch("/api/workspace/members", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberId, role: newRole }),
            });
            setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
        } catch { }
    };

    const isOwner = activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <Settings className="w-6 h-6 text-neutral-400" /> Workspace Settings
                </h1>
                <p className="text-neutral-400 text-sm">
                    Manage <span className="text-white font-medium">{activeWorkspace?.name}</span> workspace
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-900/50 border border-neutral-800 rounded-xl p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? "bg-white/10 text-white"
                            : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ GENERAL TAB ═══ */}
            {activeTab === "general" && (
                <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
                    <div>
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">
                            Workspace Name
                        </label>
                        <input
                            value={wsName}
                            onChange={(e) => setWsName(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5 block">
                            Niche / Industry
                        </label>
                        <input
                            value={wsNiche}
                            onChange={(e) => setWsNiche(e.target.value)}
                            placeholder="e.g. Trading, Fitness, Crypto..."
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveGeneral}
                            disabled={savingGeneral}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                            {savingGeneral ? <Loader2 className="w-4 h-4 animate-spin" /> : generalSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            <span>{savingGeneral ? "Saving..." : generalSaved ? "Saved!" : "Save"}</span>
                        </button>
                        <span className="text-xs text-neutral-600">
                            Plan: <span className="text-neutral-400 uppercase font-bold">{activeWorkspace?.plan || "free"}</span>
                        </span>
                    </div>
                </section>
            )}

            {/* ═══ SOCIAL ACCOUNTS TAB ═══ */}
            {activeTab === "accounts" && (
                <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Globe className="w-4 h-4 text-neutral-400" /> Connected Accounts
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {socialAccounts.length} account{socialAccounts.length !== 1 ? "s" : ""} connected
                            </p>
                        </div>
                        {isOwner && (
                            <button
                                onClick={() => setShowAddAccount(!showAddAccount)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Connect</span>
                            </button>
                        )}
                    </div>

                    {/* Add account form */}
                    {showAddAccount && (
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={newPlatform}
                                    onChange={(e) => setNewPlatform(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                                >
                                    <option value="tiktok">♪ TikTok</option>
                                    <option value="instagram">◎ Instagram</option>
                                    <option value="youtube">▶ YouTube</option>
                                </select>
                                <input
                                    autoFocus
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleAddAccount(); }}
                                    placeholder="@username"
                                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAddAccount}
                                    disabled={!newUsername.trim() || addingAccount}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
                                >
                                    {addingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                    <span>{addingAccount ? "Connecting..." : "Connect Account"}</span>
                                </button>
                                <button onClick={() => { setShowAddAccount(false); setNewUsername(""); }} className="text-xs text-neutral-500 hover:text-white">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Account list */}
                    {loadingAccounts ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                        </div>
                    ) : socialAccounts.length === 0 ? (
                        <p className="text-neutral-500 text-sm text-center py-8">
                            No accounts connected yet. Click &quot;Connect&quot; to add your first social account.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {socialAccounts.map((acc) => (
                                <div
                                    key={acc.id}
                                    className="flex items-center justify-between px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                                            {platformEmoji[acc.platform] || "●"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                @{acc.username}
                                                {acc.is_primary && (
                                                    <span className="ml-2 text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                                        primary
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-neutral-500 capitalize">{acc.platform}</p>
                                        </div>
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={() => handleDeleteAccount(acc.id)}
                                            disabled={deletingId === acc.id}
                                            className="p-1.5 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            {deletingId === acc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* ═══ TEAM TAB ═══ */}
            {activeTab === "team" && (
                <section className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-white font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4 text-neutral-400" /> Team Members
                            </h3>
                            <p className="text-xs text-neutral-500 mt-0.5">
                                {members.length} member{members.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        {isOwner && (
                            <button
                                onClick={() => setShowInvite(!showInvite)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span>Invite</span>
                            </button>
                        )}
                    </div>

                    {/* Invite form */}
                    {showInvite && (
                        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                                    placeholder="email@example.com"
                                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/20"
                                />
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editor</option>
                                    <option value="viewer">Viewer</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleInvite}
                                    disabled={!inviteEmail.trim() || inviting}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
                                >
                                    {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                                    <span>{inviting ? "Inviting..." : "Send Invite"}</span>
                                </button>
                                <button onClick={() => { setShowInvite(false); setInviteEmail(""); }} className="text-xs text-neutral-500 hover:text-white">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Member list */}
                    {loadingMembers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {members.map((member) => {
                                const RoleIcon = roleIcons[member.role] || Eye;
                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between px-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{member.name}</p>
                                                <p className="text-xs text-neutral-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {member.inviteStatus === "pending" && (
                                                <span className="text-[9px] uppercase font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded">
                                                    pending
                                                </span>
                                            )}
                                            {isOwner && member.role !== "owner" ? (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                                    className="bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="editor">Editor</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            ) : (
                                                <span className={`flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${roleColors[member.role]}`}>
                                                    <RoleIcon className="w-3 h-3" />
                                                    {member.role}
                                                </span>
                                            )}
                                            {isOwner && member.role !== "owner" && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="p-1.5 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    {removingId === member.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
