"use client";

import { useState } from "react";
import { ArrowRight, GitBranch, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Home() {
  const [url, setUrl] = useState("");

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    // Wiring to /api/analyze comes later — for now just log it.
    console.log("[SpecForge] submit url:", trimmed);
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gray-950 text-white">
      {/* Ambient background glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-purple-600/25 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <header className="flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-900/40">
            <Sparkles className="size-4" />
          </span>
          <span>SpecForge</span>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur transition hover:bg-white/10"
        >
          <GitBranch className="size-3.5" />
          <span>Built with Kiro</span>
        </a>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="flex w-full max-w-2xl flex-col items-center text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Spec-driven development, retrofitted
          </span>

          <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-7xl">
            SpecForge
          </h1>

          <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
            Bring spec-driven development to any codebase.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 flex w-full flex-col items-stretch gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <GitBranch
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              />
              <Input
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/user/repo"
                aria-label="GitHub repository URL"
                maxLength={2048}
                className="h-12 w-full rounded-xl border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:border-purple-400/50 focus-visible:ring-purple-500/30 md:text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={!url.trim()}
              className="group h-12 rounded-xl border-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-500 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:via-fuchsia-400 hover:to-purple-400 hover:shadow-purple-700/50 disabled:opacity-50"
            >
              Generate Specs
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </form>

          <p className="mt-4 text-xs text-zinc-500">
            Public repos only. We never store your code.
          </p>

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
                <div className="text-sm font-medium text-white">
                  {feature.title}
                </div>
                <div className="mt-1 text-xs text-zinc-400">{feature.body}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-zinc-500 sm:px-10">
        From zero specs to a complete .kiro folder in seconds.
      </footer>
    </div>
  );
}
