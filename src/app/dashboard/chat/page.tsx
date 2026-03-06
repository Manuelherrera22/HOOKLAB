"use client";

import { useStore, ChatMessage } from "@/store/useStore";
import { useChat, Message } from "ai/react";
import { Hexagon, User as UserIcon, Send, Settings, Check, X, Sparkles, Trash2, Paperclip, Mic, MicOff, Image as ImageIcon, FileText, XCircle, MessageSquare } from "lucide-react";
import { useRef, useEffect, useState, useCallback } from "react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface FileAttachment {
    id: string;
    file: File;
    type: 'image' | 'audio' | 'document';
    preview?: string; // base64 data URL for images
    name: string;
}

export default function ChatPage() {
    const user = useStore(state => state.user);
    const references = useStore(state => state.references);
    const knowledge = useStore(state => state.knowledge);
    const storedMessages = useStore(state => state.chatMessages);
    const setChatMessages = useStore(state => state.setChatMessages);
    const clearChatMessages = useStore(state => state.clearChatMessages);
    const [selectedRefs, setSelectedRefs] = useState<string[]>(references.map(r => r.id));
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File attachments state
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Custom message state for handling file uploads
    const [customInput, setCustomInput] = useState('');
    const [isSending, setIsSending] = useState(false);

    const activeReferences = references.filter(r => selectedRefs.includes(r.id));

    const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `¡Hola ${user?.name}! Soy tu **HOOKLAB Script Engine**. Tengo acceso a tus referencias del nicho de trading, a toda tu base de conocimiento${user?.ownTiktok || user?.ownInstagram ? ' y a los datos de tus redes sociales' : ''}.\n\nPuedes enviarme **imágenes**, **audios** y **archivos** para que los analice. 📎🎙️\n\n¿Qué tipo de guion o estrategia de contenido quieres crear hoy?`
    };

    // Use stored messages if available, otherwise use welcome message
    const initialMsgs: Message[] = storedMessages.length > 0
        ? storedMessages.map(m => ({ id: m.id, role: m.role as Message['role'], content: m.content }))
        : [welcomeMessage];

    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
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
        setAttachments([]);
    }, [clearChatMessages, setMessages, welcomeMessage]);

    // ===== FILE HANDLING =====
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const id = Math.random().toString(36).substr(2, 9);
            let type: FileAttachment['type'] = 'document';

            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('audio/')) type = 'audio';

            const attachment: FileAttachment = {
                id,
                file,
                type,
                name: file.name,
            };

            // Generate preview for images
            if (type === 'image') {
                const reader = new FileReader();
                reader.onload = () => {
                    setAttachments(prev => prev.map(a =>
                        a.id === id ? { ...a, preview: reader.result as string } : a
                    ));
                };
                reader.readAsDataURL(file);
            }

            setAttachments(prev => [...prev, attachment]);
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    // ===== AUDIO RECORDING =====
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });

                const id = Math.random().toString(36).substr(2, 9);
                setAttachments(prev => [...prev, {
                    id,
                    file: audioFile,
                    type: 'audio',
                    name: `Grabación (${recordingTime}s)`,
                }]);

                stream.getTracks().forEach(track => track.stop());
                setRecordingTime(0);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    // ===== SEND MESSAGE WITH FILES =====
    const handleSendWithFiles = async (e: React.FormEvent) => {
        e.preventDefault();

        const textContent = input.trim();
        if (!textContent && attachments.length === 0) return;

        setIsSending(true);

        try {
            // If we have attachments, process them
            if (attachments.length > 0) {
                // Build the message content parts
                const fileSummaries: string[] = [];
                const imageBase64s: { data: string; mimeType: string }[] = [];

                for (const att of attachments) {
                    if (att.type === 'image') {
                        // Convert image to base64
                        const base64 = await fileToBase64(att.file);
                        imageBase64s.push({ data: base64, mimeType: att.file.type });
                        fileSummaries.push(`📷 Imagen adjunta: ${att.name}`);
                    } else if (att.type === 'audio') {
                        // Transcribe audio via Whisper API
                        try {
                            const formData = new FormData();
                            formData.append('file', att.file);
                            const transcribeRes = await fetch('/api/transcribe', {
                                method: 'POST',
                                body: formData,
                            });
                            const transcribeData = await transcribeRes.json();
                            if (transcribeData.text) {
                                fileSummaries.push(`🎙️ Audio transcrito: "${transcribeData.text}"`);
                            } else {
                                fileSummaries.push(`🎙️ Audio adjunto: ${att.name} (no se pudo transcribir)`);
                            }
                        } catch {
                            fileSummaries.push(`🎙️ Audio adjunto: ${att.name}`);
                        }
                    } else {
                        // Document - read as text if possible
                        try {
                            const text = await att.file.text();
                            const truncated = text.substring(0, 3000);
                            fileSummaries.push(`📄 Documento "${att.name}":\n${truncated}${text.length > 3000 ? '\n...(truncado)' : ''}`);
                        } catch {
                            fileSummaries.push(`📄 Documento adjunto: ${att.name}`);
                        }
                    }
                }

                // Build the full message
                let fullMessage = '';
                if (textContent) fullMessage += textContent + '\n\n';
                if (fileSummaries.length > 0) fullMessage += fileSummaries.join('\n\n');

                // If we have images, send them to the image analysis endpoint
                if (imageBase64s.length > 0) {
                    // Send images via a special API endpoint that handles GPT-4o vision
                    const imageAnalysisRes = await fetch('/api/chat-with-images', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: messages.map(m => ({ role: m.role, content: m.content })),
                            userMessage: textContent || 'Analiza esta imagen',
                            images: imageBase64s,
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
                        }),
                    });

                    const result = await imageAnalysisRes.json();

                    // Add user message with file indicators to chat
                    const userMessageContent = (textContent || 'Analiza esta imagen') + '\n\n' +
                        imageBase64s.map((_, i) => `📷 Imagen ${i + 1} adjunta`).join('\n') +
                        (fileSummaries.filter(s => !s.startsWith('📷')).length > 0 ? '\n' + fileSummaries.filter(s => !s.startsWith('📷')).join('\n') : '');

                    // Manually add messages to the chat
                    const newUserMsg: Message = {
                        id: `user-${Date.now()}`,
                        role: 'user',
                        content: userMessageContent,
                    };
                    const newAssistantMsg: Message = {
                        id: `assistant-${Date.now()}`,
                        role: 'assistant',
                        content: result.response || 'Error procesando la imagen.',
                    };

                    setMessages([...messages, newUserMsg, newAssistantMsg]);
                } else {
                    // No images — just text + audio/documents → use regular append
                    await append({
                        role: 'user',
                        content: fullMessage,
                    });
                }

                setAttachments([]);
            } else {
                // No attachments — normal text submission
                handleSubmit(e);
            }
        } catch (error) {
            console.error('Error sending message with files:', error);
        } finally {
            setIsSending(false);
        }
    };

    // Helper: file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:...;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Check if any message has image indicators
    const hasImageIndicator = (content: string) => content.includes('📷 Imagen');
    const hasAudioIndicator = (content: string) => content.includes('🎙️ Audio');
    const hasDocIndicator = (content: string) => content.includes('📄 Documento');

    return (
        <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)] space-y-3 md:space-y-4">
            {/* Context Panel */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 md:p-4 flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between shrink-0 shadow-sm backdrop-blur-md gap-3 md:gap-4">
                <div className="flex items-center space-x-3 md:space-x-6 flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Account</span>
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-800 rounded-lg">
                            <UserIcon className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-white">{user?.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Framework</span>
                        <div className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700">
                            <Settings className="w-4 h-4 text-neutral-400" />
                            <span className="text-sm font-medium text-white">Robar Como Un Artista</span>
                        </div>
                    </div>

                    {knowledge.length > 0 && (
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Knowledge</span>
                            <div className="px-3 py-1.5 bg-white/5 text-neutral-300 rounded-lg text-sm font-medium border border-white/10">
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
                                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${isActive ? 'bg-white/10 text-neutral-200 border border-white/20' : 'bg-neutral-800 text-neutral-500 hover:text-neutral-300 border border-transparent'}`}
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
                                {msg.role === 'user' ? <UserIcon className="w-4 h-4 text-white mt-2" /> : <Hexagon className="w-5 h-5 text-black mt-1.5" />}
                            </div>
                            <div className="flex flex-col">
                                <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-white text-black' : 'bg-neutral-900 border border-neutral-800 text-neutral-200'}`}>
                                    {msg.role === 'assistant' ? (
                                        <MarkdownRenderer content={msg.content} />
                                    ) : (
                                        <div>
                                            {/* Show file indicators with icons */}
                                            {hasImageIndicator(msg.content) && (
                                                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/5 rounded-lg text-neutral-400 text-xs font-medium">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span>Imagen adjunta</span>
                                                </div>
                                            )}
                                            {hasAudioIndicator(msg.content) && (
                                                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/5 rounded-lg text-neutral-400 text-xs font-medium">
                                                    <Mic className="w-4 h-4" />
                                                    <span>Audio adjunto</span>
                                                </div>
                                            )}
                                            {hasDocIndicator(msg.content) && (
                                                <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/5 rounded-lg text-neutral-400 text-xs font-medium">
                                                    <FileText className="w-4 h-4" />
                                                    <span>Documento adjunto</span>
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap">
                                                {msg.content.split('\n').filter(line =>
                                                    !line.startsWith('📷 Imagen') &&
                                                    !line.startsWith('🎙️ Audio transcrito') &&
                                                    !line.startsWith('🎙️ Audio adjunto') &&
                                                    !line.startsWith('📄 Documento')
                                                ).join('\n').trim() || msg.content}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(isLoading || isSending) && (
                    <div className="flex items-center space-x-3 text-neutral-500">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-black animate-pulse" />
                        </div>
                        <p className="text-sm animate-pulse">
                            {isSending ? 'Procesando archivos...' : 'Generating elite content...'}
                        </p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Attachment Preview Bar */}
            {attachments.length > 0 && (
                <div className="shrink-0 flex flex-wrap gap-2 px-4 py-2 bg-neutral-900/80 border border-neutral-800 rounded-xl">
                    {attachments.map(att => (
                        <div key={att.id} className="relative group flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700">
                            {att.type === 'image' && att.preview ? (
                                <img src={att.preview} alt={att.name} className="w-10 h-10 rounded-md object-cover" />
                            ) : att.type === 'image' ? (
                                <ImageIcon className="w-5 h-5 text-neutral-400" />
                            ) : att.type === 'audio' ? (
                                <Mic className="w-5 h-5 text-neutral-400" />
                            ) : (
                                <FileText className="w-5 h-5 text-neutral-400" />
                            )}
                            <span className="text-xs text-neutral-300 max-w-[120px] truncate">{att.name}</span>
                            <button
                                onClick={() => removeAttachment(att.id)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
                <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-400 font-medium">Grabando... {recordingTime}s</span>
                    <button
                        onClick={stopRecording}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        Detener
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="shrink-0">
                <form onSubmit={handleSendWithFiles} className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-3">
                    {/* File Upload Button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,audio/*,.txt,.pdf,.csv,.json,.md"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Adjuntar archivo"
                        className="p-2 text-neutral-500 hover:text-blue-400 rounded-xl hover:bg-neutral-800 transition-colors shrink-0"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Audio Recording Button */}
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        title={isRecording ? "Detener grabación" : "Grabar audio"}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${isRecording ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-neutral-500 hover:text-purple-400 hover:bg-neutral-800'}`}
                    >
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    {/* Text Input */}
                    <input
                        value={input}
                        onChange={handleInputChange}
                        placeholder={attachments.length > 0
                            ? `${attachments.length} archivo(s) adjunto(s) — agrega un mensaje o envía directamente`
                            : "Describe the hook or script you want to create (e.g. 'Hook de curiosidad para forex')"}
                        className="flex-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none text-sm min-w-0"
                    />

                    {/* Clear Chat Button */}
                    <button
                        type="button"
                        onClick={handleClearChat}
                        title="New conversation"
                        className="p-2 text-neutral-500 hover:text-red-400 rounded-xl hover:bg-neutral-800 transition-colors shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={isLoading || isSending || (!input.trim() && attachments.length === 0)}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${attachments.length > 0 ? 'bg-white text-black hover:bg-neutral-200' : 'bg-white text-black hover:bg-neutral-200'} disabled:opacity-30`}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
                <p className="text-center text-xs text-neutral-600 mt-3 font-medium">HOOKLAB Engine · GPT-4o · Powered by your market references + knowledge base</p>
            </div>
        </div>
    );
}
