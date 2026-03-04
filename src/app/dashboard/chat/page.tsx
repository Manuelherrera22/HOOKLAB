"use client";

import { useStore } from "@/store/useStore";
import { useChat } from "ai/react";
import { Bot, User as UserIcon, Send, Settings, Check, X, Sparkles, BookmarkPlus } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function ChatPage() {
    const user = useStore(state => state.user);
    const references = useStore(state => state.references);
    const addHook = useStore(state => state.addHook);
    const [selectedRefs, setSelectedRefs] = useState<string[]>(references.map(r => r.id));
    const [savedMessages, setSavedMessages] = useState<Set<string>>(new Set());
    const chatEndRef = useRef<HTMLDivElement>(null);

    const activeReferences = references.filter(r => selectedRefs.includes(r.id));

    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        initialMessages: [
            {
                id: '1',
                role: 'assistant',
                content: `¡Hola ${user?.name}! Soy tu **HOOKLAB Script Engine**. Tengo acceso a tus referencias del nicho de trading y estoy listo para generar guiones virales de nivel élite.\n\n¿Qué tipo de hook o guion quieres crear hoy?`
            }
        ],
        body: {
            data: {
                accountName: user?.name,
                references: activeReferences
            }
        }
    });

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const toggleRef = (id: string) => {
        if (selectedRefs.includes(id)) {
            setSelectedRefs(prev => prev.filter(refId => refId !== id));
        } else {
            setSelectedRefs(prev => [...prev, id]);
        }
    };

    const saveAsHook = async (messageId: string, content: string) => {
        // Extract first line as title
        const firstLine = content.split('\n').find(l => l.trim().length > 0) || 'Saved Hook';
        const title = firstLine.replace(/[#*_\-]/g, '').trim().substring(0, 80);

        await addHook({
            title,
            content: content.substring(0, 500),
            category: 'AI Generated',
            matchScore: Math.floor(Math.random() * 15) + 85,
        });
        setSavedMessages(prev => new Set(prev).add(messageId));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
            {/* Context Panel */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between shrink-0 shadow-sm backdrop-blur-md gap-4">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Account</span>
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-800 rounded-lg">
                            <UserIcon className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-white">{user?.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Framework</span>
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700">
                            <Settings className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-medium text-white">Robar Como Un Artista</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Active References</span>
                    <div className="flex flex-wrap gap-2">
                        {references.map(ref => {
                            const isActive = selectedRefs.includes(ref.id);
                            return (
                                <button
                                    key={ref.id}
                                    onClick={() => toggleRef(ref.id)}
                                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-transparent'
                                        }`}
                                >
                                    {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    <span>{ref.name}</span>
                                </button>
                            )
                        })}
                        {references.length === 0 && (
                            <span className="text-xs text-neutral-600">No references added yet</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 bg-card border border-border rounded-2xl p-6 overflow-y-auto space-y-6">
                {messages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 flex items-start justify-center w-8 h-8 rounded-full mt-1 ${msg.role === 'user' ? 'bg-neutral-700 ml-3' : 'bg-white mr-3'}`}>
                                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white mt-2" /> : <Bot className="w-5 h-5 text-black mt-1.5" />}
                            </div>
                            <div className="flex flex-col">
                                <div className={`px-5 py-4 rounded-2xl shadow-sm ${msg.role === 'user'
                                    ? 'bg-neutral-800 text-white rounded-tr-sm'
                                    : 'bg-neutral-900/80 border border-neutral-800 text-neutral-200 rounded-tl-sm'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <MarkdownRenderer content={msg.content} />
                                    ) : (
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {/* Save as Hook button for assistant messages */}
                                {msg.role === 'assistant' && msg.id !== '1' && (
                                    <div className="flex items-center mt-2 ml-1">
                                        <button
                                            onClick={() => saveAsHook(msg.id, msg.content)}
                                            disabled={savedMessages.has(msg.id)}
                                            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${savedMessages.has(msg.id)
                                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                                : 'text-neutral-500 hover:text-purple-400 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20'
                                                }`}
                                        >
                                            {savedMessages.has(msg.id) ? (
                                                <>
                                                    <Check className="w-3 h-3" />
                                                    <span>Saved to Hooks Library</span>
                                                </>
                                            ) : (
                                                <>
                                                    <BookmarkPlus className="w-3 h-3" />
                                                    <span>Save as Hook</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex w-full justify-start">
                        <div className="flex flex-row items-center">
                            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white mr-3">
                                <Bot className="w-5 h-5 text-black" />
                            </div>
                            <div className="px-5 py-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-neutral-400 rounded-tl-sm flex items-center space-x-2">
                                <Sparkles className="w-4 h-4 animate-pulse text-purple-400" />
                                <span>Analyzing references & generating iteration...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="shrink-0">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        placeholder="Describe the hook or script you want to create (e.g. 'Make it more aggressive')..."
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl pl-6 pr-16 py-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/30 transition-shadow shadow-sm disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-3 p-2 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <p className="text-center text-xs text-neutral-600 mt-3 font-medium">HOOKLAB Engine · GPT-4o · Powered by your market references</p>
            </div>
        </div>
    );
}
