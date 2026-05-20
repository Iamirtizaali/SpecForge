"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProgressPhase } from "@/lib/types";

export interface ProgressIndicatorProps {
  phase: ProgressPhase;
  onCancel?: () => void;
}

const PHASE_LABELS: Record<ProgressPhase, string> = {
  validating: "Validating repository",
  fetching: "Fetching files",
  analyzing: "Analyzing codebase",
  generating: "Generating specs",
  complete: "Complete",
};

const PHASE_ORDER: ProgressPhase[] = [
  "validating",
  "fetching",
  "analyzing",
  "generating",
  "complete",
];

const PHASE_PERCENT: Record<ProgressPhase, number> = {
  validating: 10,
  fetching: 25,
  analyzing: 50,
  generating: 80,
  complete: 100,
};

const TIMEOUT_WARNING_SECONDS = 90;

export function ProgressIndicator({ phase, onCancel }: ProgressIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (phase === "complete") return;
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const percent = PHASE_PERCENT[phase];
  const showTimeoutWarning = elapsed >= TIMEOUT_WARNING_SECONDS && phase !== "complete";

  return (
    <div className="w-full max-w-xl space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {phase !== "complete" && (
          <Loader2 className="size-4 animate-spin text-purple-400" />
        )}
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            {PHASE_LABELS[phase]}
          </div>
          <div className="mt-0.5 text-xs text-zinc-400">
            {phase === "complete"
              ? "Done — ready to preview."
              : `${elapsed}s elapsed`}
          </div>
        </div>
        <div className="text-xs tabular-nums text-zinc-500">{percent}%</div>
      </div>

      <Progress
        value={percent}
        className="h-1.5 bg-white/10 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-purple-500 [&>[data-slot=progress-indicator]]:to-fuchsia-500"
      />

      <ol className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
        {PHASE_ORDER.map((p) => {
          const reached =
            PHASE_ORDER.indexOf(p) <= PHASE_ORDER.indexOf(phase);
          return (
            <li
              key={p}
              className={
                reached
                  ? "rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-200"
                  : "rounded-full bg-white/5 px-2 py-0.5 text-zinc-500"
              }
            >
              {PHASE_LABELS[p]}
            </li>
          );
        })}
      </ol>

      {showTimeoutWarning && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span>This is taking longer than expected.</span>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onCancel}
              className="border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-500/10"
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
