"use client";

import { useState } from "react";
import { ArrowRight, GitBranch, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Regex pattern for validating GitHub repository URLs.
 * Matches: https://github.com/{owner}/{repo} with optional trailing slash.
 * Owner and repo may contain alphanumeric characters, dots, hyphens, and underscores.
 */
export const GITHUB_URL_REGEX =
  /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/;

export interface RepoInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error?: string;
}

export function RepoInput({ onSubmit, isLoading, error }: RepoInputProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function validate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return "A GitHub repository URL is required.";
    }
    if (!GITHUB_URL_REGEX.test(trimmed)) {
      return "Please enter a valid GitHub URL in the format: https://github.com/owner/repo";
    }
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errorMsg = validate(url);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    setValidationError(null);
    onSubmit(url.trim());
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const newValue = event.target.value;
    setUrl(newValue);

    // Clear validation error as user types (if they had one)
    if (validationError) {
      setValidationError(null);
    }
  }

  const displayedError = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-2"
      noValidate
    >
      <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row">
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
            onChange={handleChange}
            placeholder="https://github.com/owner/repo"
            aria-label="GitHub repository URL"
            aria-invalid={!!displayedError}
            aria-describedby={displayedError ? "repo-input-error" : undefined}
            maxLength={2048}
            disabled={isLoading}
            className="h-12 w-full rounded-xl border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:border-purple-400/50 focus-visible:ring-purple-500/30 disabled:opacity-50 md:text-sm"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="group h-12 rounded-xl border-0 bg-linear-to-r from-purple-600 via-fuchsia-500 to-purple-500 px-6 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition-all hover:from-purple-500 hover:via-fuchsia-400 hover:to-purple-400 hover:shadow-purple-700/50 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              Generate Specs
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </Button>
      </div>

      {displayedError && (
        <p
          id="repo-input-error"
          role="alert"
          className="text-sm text-red-400"
        >
          {displayedError}
        </p>
      )}
    </form>
  );
}
