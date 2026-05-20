"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  GitBranch,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { RepoInput } from "@/components/RepoInput";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { FileTree } from "@/components/FileTree";
import { FilePreview } from "@/components/FilePreview";
import { DownloadButton } from "@/components/DownloadButton";
import type {
  AnalyzeResponse,
  ErrorResponse,
  GeneratedFile,
  ProgressPhase,
  RepoMetadata,
} from "@/lib/types";

type AppState =
  | { status: "idle" }
  | { status: "loading"; phase: ProgressPhase }
  | { status: "error"; message: string; retryable: boolean }
  | { status: "success"; result: AnalyzeResponse };

const PHASE_SCHEDULE: { phase: ProgressPhase; afterMs: number }[] = [
  { phase: "validating", afterMs: 0 },
  { phase: "fetching", afterMs: 4_000 },
  { phase: "analyzing", afterMs: 12_000 },
  { phase: "generating", afterMs: 35_000 },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>({ status: "idle" });
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const abortRef = useRef<AbortController | null>(null);
  const phaseTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      phaseTimersRef.current.forEach(clearTimeout);
    },
    []
  );

  function clearPhaseTimers() {
    phaseTimersRef.current.forEach(clearTimeout);
    phaseTimersRef.current = [];
  }

  function schedulePhases() {
    clearPhaseTimers();
    for (const step of PHASE_SCHEDULE) {
      const id = setTimeout(() => {
        setAppState((prev) =>
          prev.status === "loading" ? { ...prev, phase: step.phase } : prev
        );
      }, step.afterMs);
      phaseTimersRef.current.push(id);
    }
  }

  async function handleSubmit(url: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAppState({ status: "loading", phase: "validating" });
    setSelectedPath(undefined);
    schedulePhases();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      const data: AnalyzeResponse | ErrorResponse = await response.json();
      clearPhaseTimers();

      if (!data.success) {
        setAppState({
          status: "error",
          message: data.error.message,
          retryable: data.error.retryable,
        });
        return;
      }

      setAppState({ status: "success", result: data });
      const firstFile = data.spec.files[0];
      if (firstFile) setSelectedPath(firstFile.path);
    } catch (error: unknown) {
      clearPhaseTimers();
      if (error instanceof DOMException && error.name === "AbortError") {
        setAppState({
          status: "error",
          message: "Analysis was cancelled.",
          retryable: true,
        });
        return;
      }
      setAppState({
        status: "error",
        message:
          "Could not reach the analysis service. Check your connection and try again.",
        retryable: true,
      });
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    clearPhaseTimers();
  }

  function handleReset() {
    abortRef.current?.abort();
    clearPhaseTimers();
    setAppState({ status: "idle" });
    setSelectedPath(undefined);
  }

  const isLoading = appState.status === "loading";
  const result = appState.status === "success" ? appState.result : null;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-950 text-white">
      <BackgroundGlows />

      <header className="relative z-10 flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 font-semibold tracking-tight transition hover:opacity-80"
        >
          <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-900/40">
            <Sparkles className="size-4" />
          </span>
          <span>SpecForge</span>
        </button>
        <a
          href="https://github.com/Iamirtizaali/SpecForge"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur transition hover:bg-white/10"
        >
          <GitBranch className="size-3.5" />
          <span>Built with Kiro</span>
        </a>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-6 py-10 sm:px-10">
        {!result ? (
          <LandingView
            appState={appState}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onReset={handleReset}
            isLoading={isLoading}
          />
        ) : (
          <ResultView
            metadata={result.metadata}
            files={result.spec.files}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onReset={handleReset}
            cached={result.cached}
            generatedAt={result.generatedAt}
          />
        )}
      </main>

      <footer className="relative z-10 px-6 py-6 text-center text-xs text-zinc-500 sm:px-10">
        From zero specs to a complete .kiro folder in seconds.
      </footer>
    </div>
  );
}

function BackgroundGlows() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
    </>
  );
}

interface LandingViewProps {
  appState: AppState;
  onSubmit: (url: string) => void;
  onCancel: () => void;
  onReset: () => void;
  isLoading: boolean;
}

function LandingView({
  appState,
  onSubmit,
  onCancel,
  onReset,
  isLoading,
}: LandingViewProps) {
  const errorMessage =
    appState.status === "error" ? appState.message : undefined;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Spec-driven development, retrofitted
      </span>

      <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-7xl">
        SpecForge
      </h1>

      <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
        Bring spec-driven development to any codebase. Paste a GitHub URL and
        SpecForge generates a complete <code>.kiro/</code> folder.
      </p>

      <div className="mt-10 w-full">
        <RepoInput
          onSubmit={onSubmit}
          isLoading={isLoading}
          error={errorMessage}
        />
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Public repos only. We never store your code.
      </p>

      {appState.status === "loading" && (
        <div className="mt-10 w-full">
          <ProgressIndicator phase={appState.phase} onCancel={onCancel} />
        </div>
      )}

      {appState.status === "error" && (
        <div className="mt-6 w-full max-w-xl">
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RotateCcw className="mr-1 size-4" /> Try Again
          </Button>
        </div>
      )}

      <div className="mt-14 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
        {[
          {
            title: "Requirements",
            body: "EARS-format user stories, generated from your codebase.",
          },
          {
            title: "Design",
            body: "Architecture overview, components, data flow.",
          },
          {
            title: "Tasks",
            body: "Actionable backlog grouped by area of the codebase.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            <div className="text-sm font-medium text-white">{feature.title}</div>
            <div className="mt-1 text-xs text-zinc-400">{feature.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ResultViewProps {
  metadata: RepoMetadata;
  files: GeneratedFile[];
  selectedPath?: string;
  onSelect: (path: string) => void;
  onReset: () => void;
  cached: boolean;
  generatedAt: string;
}

function ResultView({
  metadata,
  files,
  selectedPath,
  onSelect,
  onReset,
  cached,
  generatedAt,
}: ResultViewProps) {
  const selectedFile = files.find((f) => f.path === selectedPath) ?? files[0];

  return (
    <div className="flex w-full max-w-6xl flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Generated for
          </div>
          <div className="mt-0.5 truncate font-mono text-base text-white">
            {metadata.owner}/{metadata.repo}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span>branch: {metadata.defaultBranch}</span>
            <span className="text-zinc-700">•</span>
            <span>commit: {metadata.commitSha.slice(0, 7)}</span>
            {metadata.primaryLanguage && (
              <>
                <span className="text-zinc-700">•</span>
                <span>{metadata.primaryLanguage}</span>
              </>
            )}
            <span className="text-zinc-700">•</span>
            <span>
              {cached ? "cached" : "fresh"} ·{" "}
              {new Date(generatedAt).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            className="h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <RotateCcw className="mr-1 size-4" /> New analysis
          </Button>
          <DownloadButton files={files} repoName={metadata.repo} />
        </div>
      </div>

      <div className="grid min-h-[560px] flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="min-h-[400px]">
          <FileTree
            files={files}
            selectedPath={selectedFile?.path}
            onSelect={onSelect}
          />
        </div>
        <div className="min-h-[400px]">
          <FilePreview file={selectedFile} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-zinc-500">
        <ArrowRight className="size-3" />
        Extract the zip into the root of your repository.
      </div>
    </div>
  );
}
