"use client";

import {
    BookOpen, Rocket, Brain, Clapperboard, FlaskConical,
    CalendarDays, MessageSquare, Zap, Eye, Users, Target,
    Gauge, Sparkles, Video, Globe, ChevronRight, Lightbulb
} from "lucide-react";

const sections = [
    {
        id: "start",
        title: "🚀 Primeros Pasos",
        icon: <Rocket className="w-5 h-5 text-emerald-400" />,
        color: "border-emerald-500/20 bg-emerald-500/5",
        steps: [
            { step: "1", text: "Conectar redes sociales", desc: "Ve a Overview → My Social Networks, ingresa tu TikTok e Instagram, y click Save & Connect." },
            { step: "2", text: "Agregar referencias", desc: "En Overview → References → + Add Reference. Nombra al competidor y pega sus URLs." },
            { step: "3", text: "Base de conocimiento", desc: "En Overview → Knowledge Base → + Add Knowledge. Agrega contexto de tu negocio para que la IA genere mejor contenido." },
        ],
    },
    {
        id: "intel",
        title: "🧠 Intelligence Hub",
        icon: <Brain className="w-5 h-5 text-fuchsia-400" />,
        color: "border-fuchsia-500/20 bg-fuchsia-500/5",
        steps: [
            { step: "1", text: "Buscar perfil", desc: "Escribe cualquier username de TikTok en Intelligence y click View Data o Run Full Analysis." },
            { step: "2", text: "Explorar módulos", desc: "Lead Profile, Hook Analysis, Content Spy, Audience Mirror, Trend Radar, Mediakit y Battle Map." },
            { step: "3", text: "Battle Map", desc: "Compara 2+ creadores head-to-head. Agrega usernames y ejecuta la comparación para encontrar brechas." },
        ],
    },
    {
        id: "studio",
        title: "🎬 Video Studio Pro",
        icon: <Clapperboard className="w-5 h-5 text-cyan-400" />,
        color: "border-cyan-500/20 bg-cyan-500/5",
        steps: [
            { step: "1", text: "AI Director", desc: "Selecciona plataforma y click Generate Concepts. La IA crea 3 conceptos rankeados por potencial viral." },
            { step: "2", text: "Visual Studio", desc: "Elige motor IA: Kling V3 (mejor calidad), Wan 2.1 (rápido), o Minimax (económico). Selecciona modo Text→Video o Image→Video." },
            { step: "3", text: "Generar video", desc: "Click Generate Video. Espera ~2-3 min. Descarga o envía al Calendar para publicar." },
        ],
    },
    {
        id: "tools",
        title: "🛠️ Creator Tools",
        icon: <FlaskConical className="w-5 h-5 text-amber-400" />,
        color: "border-amber-500/20 bg-amber-500/5",
        steps: [
            { step: "VS", text: "Viral Score", desc: "Pega tu hook + caption → obtens score 0-100, grade S/A/B/C/D/F, predicción de views y sugerencias de mejora." },
            { step: "AB", text: "A/B Hooks", desc: "Escribe un tema → la IA genera 5 variaciones de hooks con scores, templates y explicación de por qué funcionan." },
            { step: "📚", text: "Script Library", desc: "Todos tus hooks guardados en un lugar. Marca favoritos ⭐ y copia con un click." },
        ],
    },
    {
        id: "calendar",
        title: "📅 Content Calendar",
        icon: <CalendarDays className="w-5 h-5 text-violet-400" />,
        color: "border-violet-500/20 bg-violet-500/5",
        steps: [
            { step: "1", text: "Programar post", desc: "+ New Post → selecciona plataformas, escribe caption, pega URL del video, elige fecha/hora → Schedule." },
            { step: "2", text: "Conectar Ayrshare", desc: "Connect Accounts → regístrate en app.ayrshare.com → conecta tus redes → pega API Key → Verify." },
            { step: "3", text: "Auto-publicación", desc: "Una vez conectado, HOOKLAB publica automáticamente en la fecha programada." },
        ],
    },
    {
        id: "chat",
        title: "💬 AI Script Chat",
        icon: <MessageSquare className="w-5 h-5 text-pink-400" />,
        color: "border-pink-500/20 bg-pink-500/5",
        steps: [
            { step: "💡", text: "Sé específico", desc: "\"Hook de shock para video sobre errores de principiantes en cripto\" > \"hazme un hook\"." },
            { step: "🔄", text: "Pide variaciones", desc: "\"Dame 3 versiones diferentes\" o \"haz una versión más agresiva\"." },
            { step: "🧠", text: "Usa tu contexto", desc: "La IA conoce tu nicho, referencias y knowledge base. Mientras más datos tengas, mejor contenido genera." },
        ],
    },
];

const workflow = [
    { icon: <Brain className="w-4 h-4" />, label: "Intelligence", desc: "Analiza competidores", color: "text-fuchsia-400" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "AI Chat", desc: "Genera scripts", color: "text-pink-400" },
    { icon: <Gauge className="w-4 h-4" />, label: "Tools", desc: "Evalúa virality", color: "text-amber-400" },
    { icon: <Clapperboard className="w-4 h-4" />, label: "Studio", desc: "Produce video", color: "text-cyan-400" },
    { icon: <CalendarDays className="w-4 h-4" />, label: "Calendar", desc: "Publica", color: "text-violet-400" },
];

const tips = [
    { key: "Enter", desc: "en búsqueda de Intelligence ejecuta sin click" },
    { key: "Quick Fill", desc: "en Tools prueba la herramienta con un click" },
    { key: "Try links", desc: "en Intelligence carga perfiles de ejemplo" },
    { key: "💾 Guardar", desc: "en A/B Hooks guarda hooks en tu Library" },
    { key: "📋 Copiar", desc: "click en cualquier hook para copiar" },
];

export default function GuidePage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <BookOpen className="w-7 h-7 text-emerald-400" />
                    Guía de Usuario
                </h1>
                <p className="text-neutral-400 text-sm">Todo lo que necesitas para dominar HOOKLAB.</p>
            </div>

            {/* Workflow Pipeline */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Flujo de Trabajo Recomendado
                </h3>
                <div className="flex items-center justify-between gap-2 overflow-x-auto">
                    {workflow.map((w, i) => (
                        <div key={w.label} className="flex items-center gap-2 shrink-0">
                            <div className="flex flex-col items-center text-center min-w-[80px]">
                                <div className={`w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-1 ${w.color}`}>
                                    {w.icon}
                                </div>
                                <p className="text-xs font-semibold text-white">{w.label}</p>
                                <p className="text-[10px] text-neutral-500">{w.desc}</p>
                            </div>
                            {i < workflow.length - 1 && <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0 mt-[-16px]" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sections */}
            {sections.map(section => (
                <section key={section.id} className={`border rounded-2xl p-5 ${section.color}`}>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        {section.icon}
                        {section.title}
                    </h2>
                    <div className="space-y-3">
                        {section.steps.map(step => (
                            <div key={step.step} className="flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                    {step.step}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{step.text}</p>
                                    <p className="text-xs text-neutral-400 leading-relaxed">{step.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {/* Tips & Shortcuts */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Atajos y Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {tips.map(t => (
                        <div key={t.key} className="flex items-center gap-2 text-xs">
                            <span className="bg-neutral-800 border border-neutral-700 text-white font-mono px-2 py-0.5 rounded text-[10px] shrink-0">{t.key}</span>
                            <span className="text-neutral-400">{t.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3">❓ FAQ</h3>
                <div className="space-y-3">
                    {[
                        { q: "¿Cuánto cuesta generar un video?", a: "Kling V3 ≈ $0.10-0.30, Wan 2.1 ≈ $0.05-0.15, Minimax ≈ $0.03-0.10 por video." },
                        { q: "¿Puedo publicar automáticamente?", a: "Sí, conectando tu cuenta vía Ayrshare en Calendar → Connect Accounts." },
                        { q: "¿La IA conoce mi nicho?", a: "Sí, si agregas tu contexto en Knowledge Base y conectas tus redes." },
                        { q: "¿Qué pasa si un video falla?", a: "El sistema tiene fallback automático: Kling V3 → Wan 2.1 → Minimax." },
                    ].map(faq => (
                        <div key={faq.q}>
                            <p className="text-sm font-medium text-white">{faq.q}</p>
                            <p className="text-xs text-neutral-400">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
