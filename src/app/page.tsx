import { Bot, LineChart, MessageSquare, Video } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-background to-background opacity-50"></div>

      <main className="z-10 flex flex-col items-center max-w-4xl text-center space-y-8">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm mb-4">
          <Bot className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
          HOOKLAB
        </h1>

        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl font-light">
          Content management, analytics, and AI-powered script generation for the modern trading niche.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full pt-12 border-t border-neutral-800">
          <FeatureCard
            icon={<Video className="w-6 h-6" />}
            title="Reference Tracking"
            description="Monitor viral trading hooks and references."
          />
          <FeatureCard
            icon={<LineChart className="w-6 h-6" />}
            title="Performance Metrics"
            description="Track views, retention, and success rates."
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="Iterative Scripting"
            description="Generate scripts tailored to your specific context."
          />
        </div>

        <Link href="/login" className="mt-12 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors duration-200 shadow-[0_0_30px_rgba(255,255,255,0.1)] inline-flex items-center">
          Enter Workspace
        </Link>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-md hover:bg-neutral-800/50 transition-colors">
      <div className="p-3 bg-neutral-800 rounded-xl mb-4 text-white">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  );
}
