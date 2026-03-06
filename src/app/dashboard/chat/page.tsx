"use client";

import { useStore, ChatMessage } from "@/store/useStore";
import { useChat, Message } from "ai/react";
import { Bot, User as UserIcon, Send, Settings, Check, X, Sparkles, Trash2 } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

export default function ChatPage() {
    const user = useStore(state => state.user);
    const references = useStore(state => state.references);
    const knowledge = useStore(state => state.knowledge);
    const storedMessages = useStore(state => state.chatMessages);
    const setChatMessages = useStore(state => state.setChatMessages);
    const clearChatMessages = useStore(state => state.clearChatMessages);
    const [selectedRefs, setSelectedRefs] = useState<string[]>(references.map(r => r.id));
    const chatEndRef = useRef<HTMLDivElement>(null);

    const activeReferences = references.filter(r => selectedRefs.includes(r.id));

    const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola ${user?.name}! Soy tu **HOOKLAB Script Engine**. Tengo acceso a tus referencias del nicho de trading, a toda tu base de conocimiento${user?.ownTiktok || user?.ownInstagram ? ' y a los datos de tus redes sociales' : ''}.\n\n¿Qué tipo de guion o estrategia de contenido quieres crear hoy?`
    };

    // Use stored messages if available, otherwise use welcome message
    const initialMsgs: Message[] = storedMessages.length > 0
        ? storedMessages.map(m => ({ id: m.id, role: m.role as Message['role'], content: m.content }))
        : [welcomeMessage];

    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
        api: '/api/chat',
        initialMessages: initialMsgs,
        body: {
            data: {
                accountName: user?.name,
                accountId: user?.id,
                references: activeReferences,
                knowledge: knowledge,
                ownSocials: {
                    tiktok: user?.ownTiktok || '',
                    instagram: user?.ownInstagram || '',
                    data: user?.ownSocialData || {}
                }
            }
        }
    });

    // Save messages to store whenever they change (but not during loading/streaming)
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            const toStore: ChatMessage[] = messages.map(m => ({
                id: m.id,
                role: m.role as ChatMessage['role'],
                content: m.content,
            }));
            setChatMessages(toStore);
        }
    }, [messages, isLoading, setChatMessages]);

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

    const handleClearChat = useCallback(() => {
        clearChatMessages();
        setMessages([welcomeMessage]);
    }, [clearChatMessages, setMessages, welcomeMessage]);

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)] space-y-3 md:space-y-4">
            {/* Context Panel */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 md:p-4 flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between shrink-0 shadow-sm backdrop-blur-md gap-3 md:gap-4">
                <div className="flex items-center space-x-3 md:space-x-6 flex-wrap gap-2">
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

                    {knowledge.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Knowledge</span>
                            <div className="px-3 py-1.5 bg-amber-500/10 text-amber-300 rounded-lg text-sm font-medium border border-amber-500/20">
                                {knowledge.length} entries loaded
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto overflow-x-auto">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 shrink-0">References</span>
                    <div className="flex flex-wrap gap-2">
                        {references.map(ref => {
                            const isActive = selectedRefs.includes(ref.id);
                            return (
                                <button
                                    key={ref.id}
                                    onClick={() => toggleRef(ref.id)}
                                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
                                >
                                    {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    <span>{ref.refName || ref.name}</span>
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
            <div className="flex-1 bg-card border border-border rounded-2xl p-4 md:p-6 overflow-y-auto space-y-6">
                {messages.map((msg, i) => (
                    <div key={msg.id || i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`shrink-0 hidden sm:flex items-start justify-center w-8 h-8 rounded-full mt-1 ${msg.role === 'user' ? 'bg-neutral-700 ml-3' : 'bg-white mr-3'}`}>
                                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white mt-2" /> : <Bot className="w-5 h-5 text-black mt-1.5" />}
                            </div>
                            <div className="flex flex-col">
                                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-200'}`}>
                                    {msg.role === 'assistant' ? (
                                        <MarkdownRenderer content={msg.content} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex items-center space-x-3 text-neutral-500">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-black animate-pulse" />
                        </div>
                        <p className="text-sm animate-pulse">Generating elite content...</p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center space-x-3 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3">
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Describe the hook or script you want to create (e.g. 'Make it more aggressive', 'Hook de curiosidad para forex')"
                        className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleClearChat}
                        title="New conversation"
                        className="p-2 text-neutral-500 hover:text-red-400 rounded-xl hover:bg-neutral-800 transition-colors shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="p-2 bg-white text-black rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-30 shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <p className="text-center text-xs text-neutral-600 mt-3 font-medium">HOOKLAB Engine · GPT-4o · Powered by your market references + knowledge base</p>
            </div>
        </div>
    );
}
