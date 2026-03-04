"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
    content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => (
                    <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-lg font-semibold text-white mt-4 mb-2 flex items-center gap-2">{children}</h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-neutral-200 mt-3 mb-1">{children}</h3>
                ),
                p: ({ children }) => (
                    <p className="text-neutral-300 mb-3 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                    <em className="text-neutral-400 italic">{children}</em>
                ),
                ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1 mb-3 text-neutral-300 ml-2">{children}</ul>
                ),
                ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1 mb-3 text-neutral-300 ml-2">{children}</ol>
                ),
                li: ({ children }) => (
                    <li className="text-neutral-300 leading-relaxed">{children}</li>
                ),
                hr: () => (
                    <hr className="border-neutral-700 my-4" />
                ),
                code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                        return (
                            <pre className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 my-3 overflow-x-auto">
                                <code className="text-sm text-emerald-400 font-mono">{children}</code>
                            </pre>
                        );
                    }
                    return (
                        <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-sm text-emerald-400 font-mono">{children}</code>
                    );
                },
                blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-purple-500 pl-4 my-3 text-neutral-400 italic">{children}</blockquote>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}
