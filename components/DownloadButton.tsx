"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { downloadSpecsAsZip } from "@/lib/download";
import type { GeneratedFile } from "@/lib/types";

export interface DownloadButtonProps {
  files: GeneratedFile[];
  repoName: string;
  disabled?: boolean;
}

export function DownloadButton({
  files,
  repoName,
  disabled,
}: DownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled) {
      setError("Generation is still in progress.");
      return;
    }
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      await downloadSpecsAsZip(files, repoName);
    } catch {
      setError("Failed to create the ZIP archive. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy || files.length === 0}
        className="group h-10 rounded-xl border-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-700/40 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="mr-1 size-4 animate-spin" />
            Packaging…
          </>
        ) : (
          <>
            <Download className="mr-1 size-4" />
            Download .zip
          </>
        )}
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
