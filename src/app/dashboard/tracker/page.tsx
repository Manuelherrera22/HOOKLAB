"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useStore } from "@/store/useStore";
import {
    Table2, Plus, Trash2, Loader2, Save, Check,
    ExternalLink, ArrowUpDown, Filter, ChevronDown
} from "lucide-react";

interface TrackerRow {
    id: string;
    workspace_id: string;
    properties: Record<string, any>;
    created_at: string;
    updated_at: string;
}

const STATUS_OPTIONS = ['Idea', 'In Progress', 'Recorded', 'Editing', 'Published', 'Archived'];
const PLATFORM_OPTIONS = ['TikTok', 'Instagram', 'YouTube', 'Twitter/X', 'LinkedIn', 'Other'];

const statusColors: Record<string, string> = {
    'Idea': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'In Progress': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Recorded': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Editing': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Published': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Archived': 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
};

const formatNumber = (n: number) => {
    if (!n || isNaN(n)) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
};

export default function ContentTrackerPage() {
    const activeWorkspace = useStore(state => state.activeWorkspace);
    const [rows, setRows] = useState<TrackerRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingRow, setAddingRow] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const editRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [platformFilter, setPlatformFilter] = useState('all');

    // Load rows
    useEffect(() => {
        if (!activeWorkspace?.id) return;
        setLoading(true);
        fetch(`/api/tracker?workspaceId=${activeWorkspace.id}`)
            .then(r => r.json())
            .then(data => setRows(data.rows || []))
            .catch(err => console.error('Tracker load error:', err))
            .finally(() => setLoading(false));
    }, [activeWorkspace?.id]);

    // Add row
    const handleAddRow = async () => {
        if (!activeWorkspace?.id || addingRow) return;
        setAddingRow(true);
        try {
            const res = await fetch('/api/tracker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId: activeWorkspace.id }),
            });
            const data = await res.json();
            if (data.row) {
                setRows(prev => [data.row, ...prev]);
            }
        } catch (err) {
            console.error('Add row error:', err);
        }
        setAddingRow(false);
    };

    // Delete row
    const handleDeleteRow = async (id: string) => {
        setDeletingId(id);
        try {
            await fetch(`/api/tracker?id=${id}`, { method: 'DELETE' });
            setRows(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error('Delete row error:', err);
        }
        setDeletingId(null);
    };

    // Save cell
    const handleSaveCell = useCallback(async (rowId: string, key: string, value: any) => {
        const row = rows.find(r => r.id === rowId);
        if (!row) return;

        const updatedProps = { ...row.properties, [key]: value };

        // Optimistic update
        setRows(prev => prev.map(r => r.id === rowId ? { ...r, properties: updatedProps } : r));
        setSavingId(rowId);

        try {
            await fetch('/api/tracker', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: rowId, properties: updatedProps }),
            });
        } catch (err) {
            console.error('Save cell error:', err);
        }
        setSavingId(null);
        setEditingCell(null);
    }, [rows]);

    // Start editing a cell
    const startEdit = (rowId: string, key: string, currentValue: any) => {
        setEditingCell({ rowId, key });
        setEditValue(String(currentValue ?? ''));
        setTimeout(() => editRef.current?.focus(), 50);
    };

    // Handle keyboard in editable cells
    const handleEditKeyDown = (e: React.KeyboardEvent, rowId: string, key: string) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveCell(rowId, key, key === 'views' || key === 'likes' || key === 'comments' ? Number(editValue) || 0 : editValue);
        }
        if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    // Handle blur save
    const handleEditBlur = (rowId: string, key: string) => {
        const numericKeys = ['views', 'likes', 'comments'];
        const val = numericKeys.includes(key) ? Number(editValue) || 0 : editValue;
        handleSaveCell(rowId, key, val);
    };

    // Filtered rows
    const displayRows = rows.filter(r => {
        if (statusFilter !== 'all' && r.properties.status !== statusFilter) return false;
        if (platformFilter !== 'all' && r.properties.platform !== platformFilter) return false;
        return true;
    });

    // Selectable cell component
    const SelectCell = ({ rowId, propKey, options, currentValue }: { rowId: string; propKey: string; options: string[]; currentValue: string }) => (
        <select
            value={currentValue || ''}
            onChange={e => handleSaveCell(rowId, propKey, e.target.value)}
            className="bg-transparent text-white text-sm w-full px-2 py-1 rounded-md hover:bg-white/5 focus:bg-white/5 outline-none cursor-pointer appearance-none"
        >
            <option value="" className="bg-neutral-900">—</option>
            {options.map(opt => (
                <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
            ))}
        </select>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                        <Table2 className="w-7 h-7 text-neutral-400" />
                        Content Tracker
                    </h1>
                    <p className="text-neutral-400 text-sm">Notion-style grid to manage your content pipeline and track performance.</p>
                </div>
                <button
                    onClick={handleAddRow}
                    disabled={addingRow}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                    {addingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>New Row</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-neutral-500" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                        <option value="all">All Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={platformFilter}
                        onChange={e => setPlatformFilter(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20"
                    >
                        <option value="all">All Platforms</option>
                        {PLATFORM_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <span className="text-xs text-neutral-600">{displayRows.length} rows</span>
            </div>

            {/* Table */}
            <section className="bg-card border border-border rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                        <span className="ml-3 text-neutral-500 text-sm">Loading tracker...</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[250px] min-w-[200px]">Title</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[120px]">Status</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[120px]">Platform</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[120px]">Date</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[80px]">Views</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[80px]">Likes</th>
                                    <th className="text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[80px]">Comments</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 w-[200px]">URL</th>
                                    <th className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 min-w-[200px]">Notes</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-16">
                                            <Table2 className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                                            <p className="text-neutral-500 text-sm">No rows yet. Click &quot;New Row&quot; to start tracking content.</p>
                                        </td>
                                    </tr>
                                ) : displayRows.map(row => (
                                    <tr key={row.id} className="border-b border-neutral-800/50 hover:bg-white/[0.015] transition-colors group">
                                        {/* Title — editable */}
                                        <td className="px-3 py-2">
                                            {editingCell?.rowId === row.id && editingCell.key === 'title' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'title')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'title')}
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(row.id, 'title', row.properties.title)}
                                                    className="text-sm text-white cursor-text px-2 py-1 rounded-md hover:bg-white/5 min-h-[28px] truncate"
                                                >
                                                    {row.properties.title || <span className="text-neutral-600 italic">Untitled</span>}
                                                </div>
                                            )}
                                        </td>

                                        {/* Status — select */}
                                        <td className="px-3 py-2">
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[row.properties.status] || statusColors['Idea']}`}>
                                                <SelectCell rowId={row.id} propKey="status" options={STATUS_OPTIONS} currentValue={row.properties.status} />
                                            </div>
                                        </td>

                                        {/* Platform — select */}
                                        <td className="px-3 py-2">
                                            <SelectCell rowId={row.id} propKey="platform" options={PLATFORM_OPTIONS} currentValue={row.properties.platform} />
                                        </td>

                                        {/* Date — editable */}
                                        <td className="px-3 py-2">
                                            <input
                                                type="date"
                                                value={row.properties.date || ''}
                                                onChange={e => handleSaveCell(row.id, 'date', e.target.value)}
                                                className="bg-transparent border-none text-sm text-white focus:outline-none cursor-pointer hover:bg-white/5 rounded-md px-2 py-1"
                                            />
                                        </td>

                                        {/* Views — editable number */}
                                        <td className="px-3 py-2 text-right">
                                            {editingCell?.rowId === row.id && editingCell.key === 'views' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'views')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'views')}
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(row.id, 'views', row.properties.views || 0)}
                                                    className="text-sm text-neutral-300 cursor-text px-2 py-1 rounded-md hover:bg-white/5 text-right"
                                                >
                                                    {formatNumber(row.properties.views || 0)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Likes — editable number */}
                                        <td className="px-3 py-2 text-right">
                                            {editingCell?.rowId === row.id && editingCell.key === 'likes' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'likes')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'likes')}
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(row.id, 'likes', row.properties.likes || 0)}
                                                    className="text-sm text-neutral-300 cursor-text px-2 py-1 rounded-md hover:bg-white/5 text-right"
                                                >
                                                    {formatNumber(row.properties.likes || 0)}
                                                </div>
                                            )}
                                        </td>

                                        {/* Comments — editable number */}
                                        <td className="px-3 py-2 text-right">
                                            {editingCell?.rowId === row.id && editingCell.key === 'comments' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    type="number"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'comments')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'comments')}
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(row.id, 'comments', row.properties.comments || 0)}
                                                    className="text-sm text-neutral-300 cursor-text px-2 py-1 rounded-md hover:bg-white/5 text-right"
                                                >
                                                    {formatNumber(row.properties.comments || 0)}
                                                </div>
                                            )}
                                        </td>

                                        {/* URL — editable with link */}
                                        <td className="px-3 py-2">
                                            {editingCell?.rowId === row.id && editingCell.key === 'url' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'url')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'url')}
                                                    placeholder="https://..."
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        onClick={() => startEdit(row.id, 'url', row.properties.url)}
                                                        className="text-sm text-neutral-400 cursor-text px-2 py-1 rounded-md hover:bg-white/5 truncate max-w-[160px] flex-1"
                                                    >
                                                        {row.properties.url || <span className="text-neutral-600 italic">Add URL</span>}
                                                    </div>
                                                    {row.properties.url && (
                                                        <a href={row.properties.url} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white shrink-0">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        {/* Notes — editable */}
                                        <td className="px-3 py-2">
                                            {editingCell?.rowId === row.id && editingCell.key === 'notes' ? (
                                                <input
                                                    ref={el => { editRef.current = el; }}
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleEditBlur(row.id, 'notes')}
                                                    onKeyDown={e => handleEditKeyDown(e, row.id, 'notes')}
                                                    className="w-full bg-white/5 border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => startEdit(row.id, 'notes', row.properties.notes)}
                                                    className="text-sm text-neutral-400 cursor-text px-2 py-1 rounded-md hover:bg-white/5 truncate min-h-[28px]"
                                                >
                                                    {row.properties.notes || <span className="text-neutral-600 italic">Add notes</span>}
                                                </div>
                                            )}
                                        </td>

                                        {/* Delete */}
                                        <td className="px-2 py-2">
                                            <button
                                                onClick={() => handleDeleteRow(row.id)}
                                                disabled={deletingId === row.id}
                                                className="p-1.5 text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                {deletingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Quick Add */}
            {!loading && (
                <button
                    onClick={handleAddRow}
                    disabled={addingRow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.02] border border-dashed border-neutral-800 rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04] hover:border-neutral-700 transition-colors text-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add new row</span>
                </button>
            )}

            {/* Saving indicator */}
            {savingId && (
                <div className="fixed bottom-6 right-6 flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl text-sm text-neutral-400 animate-in fade-in">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                </div>
            )}
        </div>
    );
}
