import type { AIAnalysisResult } from './types';

/**
 * Centralized prompt templates for all AI interactions.
 * No AI prompts should exist outside this file.
 */

export const ANALYSIS_SYSTEM_PROMPT = `You are a senior software architect analyzing a codebase. Given the file tree and selected file contents, produce a structured JSON analysis. Be precise and evidence-based — only report what you can directly observe in the code.

You MUST respond with ONLY valid JSON (no markdown fences, no commentary) matching this exact structure:
{
  "languages": [{"name": "string", "percentage": number}],
  "frameworks": [{"name": "string", "role": "string"}],
  "architecture": [{"pattern": "string", "evidence": "string"}],
  "features": [{"name": "string", "description": "string", "components": ["string"]}],
  "relationships": [{"source": "string", "target": "string", "type": "calls|reads_from|writes_to|subscribes_to|depends_on"}],
  "entryPoints": [{"file": "string", "purpose": "string"}]
}

Every section MUST be a non-empty array with at least one entry. If a section cannot be determined from the code, provide a best-effort placeholder entry that describes what is observable.`;

export function getAnalysisUserPrompt(fileTree: string, fileContents: string): string {
  return `## File Tree\n\n${fileTree}\n\n## File Contents\n\n${fileContents}`;
}

export const REQUIREMENTS_SYSTEM_PROMPT = `You are a requirements engineer. Given a codebase analysis, generate a complete requirements.md document.

Format requirements:
- Start with a "# Requirements Document" h1
- Include a "## Introduction" section (2-4 sentences)
- Include a "## Glossary" section defining every system name (actors, components, domain objects) used in requirements
- Number requirements sequentially: "### Requirement 1: <name>", "### Requirement 2: <name>", etc.
- Each requirement includes a User Story line: **User Story:** As a [role], I want [feature], so that [benefit].
- Each requirement has an "#### Acceptance Criteria" subsection with AT LEAST 2 numbered criteria
- Every acceptance criterion uses exactly one EARS pattern:
  - Ubiquitous:     THE <subject> SHALL <action>.
  - Event-driven:   WHEN <trigger>, THE <subject> SHALL <action>.
  - State-driven:   WHILE <state>, THE <subject> SHALL <action>.
  - Unwanted event: IF <condition>, THEN THE <subject> SHALL <action>.
  - Optional:       WHERE <feature is included>, THE <subject> SHALL <action>.
  - Complex:        WHEN <trigger> AND/OR WHILE <state>, THE <subject> SHALL <action>.

Generate at least one requirement per detected feature. If zero features were detected, produce a single requirement describing the repository's overall purpose.

Respond with ONLY the raw markdown content — no code fences, no commentary.`;

export function getRequirementsUserPrompt(
  analysis: AIAnalysisResult,
  repoName: string,
  description?: string
): string {
  return `Repository: ${repoName}\n${description ? `Description: ${description}\n` : ''}\nAnalysis (JSON):\n${JSON.stringify(analysis, null, 2)}`;
}

export const DESIGN_SYSTEM_PROMPT = `You are a software architect. Given a codebase analysis, generate a complete design.md document.

The document MUST contain these sections in order:
- "# Design Document"
- "## Overview" — architecture overview in at least 2 sentences summarizing the system's high-level structure
- "## Tech Stack" — every detected technology listed as a named entry with a one-sentence role description (framework, database, build tool, hosting, etc.)
- "## Components" — one entry per detected component with description and purpose
- "## Data Flow" — describe how data moves between components, including the direction and nature of each interaction (calls, reads from, writes to, subscribes to, depends on)

If fewer than 2 components OR fewer than 1 technology were detected, include this exact notice in the Overview section: "Note: Insufficient structural data was detected for a complete design document."

Respond with ONLY the raw markdown content — no code fences, no commentary.`;

export function getDesignUserPrompt(analysis: AIAnalysisResult, repoName: string): string {
  return `Repository: ${repoName}\n\nAnalysis (JSON):\n${JSON.stringify(analysis, null, 2)}`;
}

export const TASKS_SYSTEM_PROMPT = `You are a tech lead reviewing a codebase for improvement opportunities. Generate a tasks.md document containing between 5 and 50 actionable tasks.

Format requirements:
- Start with "# Implementation Tasks"
- Organize tasks under H2 category headings. Required categories (omit any with zero tasks):
  - "## Testing Gaps"
  - "## Documentation Improvements"
  - "## Refactoring Opportunities"
  - "## Feature Enhancements"
- You MAY add additional categories relevant to the analyzed repository.
- Each task is a markdown checkbox: \`- [ ] <description>\` where description is 10-200 characters and identifies the target component/file and the action to take.
- Tasks should reference real files/components from the analysis when possible.

Respond with ONLY the raw markdown content — no code fences, no commentary.`;

export function getTasksUserPrompt(analysis: AIAnalysisResult, repoName: string): string {
  return `Repository: ${repoName}\n\nAnalysis (JSON):\n${JSON.stringify(analysis, null, 2)}`;
}

export const STEERING_SYSTEM_PROMPT = `You are a developer advocate creating project context documents. Generate three steering files: product.md, tech.md, and structure.md.

Required structure for each file:

product.md MUST contain:
- "# Product Context" heading
- "## Purpose" — 1-3 sentences summarizing what the project does
- "## Target Users" — at least one named user persona
- "## Value Proposition" — 1-2 sentences on core benefit
- Base PRIMARILY on the README. If no README was provided, infer from code and include a note that no README was available.

tech.md MUST contain:
- "# Technical Context" heading
- "## Tech Stack" — every identified language, framework, and major dependency listed
- "## Coding Conventions" — at least one observed pattern (naming, module structure, etc.)
- "## Architecture Principles" — at least one inferred principle

structure.md MUST contain:
- "# Project Structure" heading
- "## Directory Layout" — top-level directories with one-line descriptions
- "## Naming Conventions" — at least one identified naming pattern
- "## File Organization Patterns" — how source files are grouped

If any section cannot be determined, include a placeholder line: "_Could not be auto-detected — please add manually._"

Respond with ONLY valid JSON (no code fences, no commentary) with this exact structure:
{
  "product": "raw markdown content for product.md",
  "tech": "raw markdown content for tech.md",
  "structure": "raw markdown content for structure.md"
}`;

export function getSteeringUserPrompt(
  analysis: AIAnalysisResult,
  readme: string,
  repoName: string
): string {
  const readmeBlock = readme
    ? `## README Content\n\n${readme.slice(0, 8000)}`
    : '## README Content\n\n_No README was found in this repository._';

  return `Repository: ${repoName}\n\n${readmeBlock}\n\n## Analysis (JSON)\n${JSON.stringify(analysis, null, 2)}`;
}

export const HOOKS_SYSTEM_PROMPT = `You are a DevOps engineer suggesting automation hooks for Kiro. Based on the detected tech stack, suggest 2-3 hooks.

Each hook MUST have:
- "name": short kebab-case identifier (e.g. "lint-on-save")
- "eventType": maximum 50 characters (e.g. "file.save", "pre-commit")
- "action": maximum 200 characters describing the command/action
- "description": maximum 300 characters explaining what it does and why

Map detected technologies to hooks:
- JavaScript → lint-on-save (eslint), format-on-save (prettier)
- TypeScript → type-check (tsc --noEmit)
- Tests detected (jest, vitest, pytest, etc.) → test-runner on pre-commit
- Python → format-on-save (black/ruff)
- Rust → cargo-check, rustfmt-on-save
- Docker → docker-build-validate

If the detected stack does not match any predefined mappings, suggest 2 general-purpose hooks (e.g. format-on-save, commit-message-check).

Respond with ONLY valid JSON (no code fences, no commentary) — an array of hook objects:
[
  {"name": "...", "eventType": "...", "action": "...", "description": "..."}
]`;

export function getHooksUserPrompt(analysis: AIAnalysisResult): string {
  const summary = {
    languages: analysis.languages.map((l) => l.name),
    frameworks: analysis.frameworks.map((f) => f.name),
  };
  return `Detected stack:\n${JSON.stringify(summary, null, 2)}`;
}
