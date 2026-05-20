"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

import { Copy, Check, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GeneratedFile } from "@/lib/types";

export interface FilePreviewProps {
  file?: GeneratedFile;
}

const MAX_PREVIEW_CHARS = 500_000;

function isMarkdown(path: string): boolean {
  return path.endsWith(".md") || path.endsWith(".markdown");
}

export function FilePreview({ file }: FilePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    setRenderError(null);
    setCopied(false);
  }, [file?.path]);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-white/10 bg-zinc-950/60 p-8 text-sm text-zinc-500 backdrop-blur">
        Select a file from the tree to preview it.
      </div>
    );
  }

  const truncated = file.content.length > MAX_PREVIEW_CHARS;
  const content = truncated
    ? file.content.slice(0, MAX_PREVIEW_CHARS) +
      "\n\n[... preview truncated at 500KB ...]"
    : file.content;

  async function handleCopy() {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-zinc-500" />
          <span
            className="truncate font-mono text-xs text-zinc-300"
            title={file.path}
          >
            {file.path}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={handleCopy}
          className="shrink-0 text-zinc-400 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {renderError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {renderError}
          </div>
        ) : isMarkdown(file.path) ? (
          <article className="prose prose-invert prose-sm max-w-none prose-headings:tracking-tight prose-headings:text-white prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-white prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-purple-200 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10 prose-a:text-purple-300 prose-hr:border-white/10">
            <SafeMarkdown content={content} onError={setRenderError} />
          </article>
        ) : (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-200">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

function SafeMarkdown({
  content,
  onError,
}: {
  content: string;
  onError: (message: string) => void;
}) {
  try {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
      >
        {content}
      </ReactMarkdown>
    );
  } catch {
    onError("This file could not be rendered. Try a different file.");
    return null;
  }
}
