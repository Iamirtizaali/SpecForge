# SpecForge 🔨

> Bring spec-driven development to any codebase in seconds.

Paste a public GitHub URL. SpecForge fetches the repo, analyses it with an LLM, and generates a complete `.kiro/` folder — EARS-format requirements, a design document, a tasks backlog, three steering files, and 2–3 hook suggestions — ready to drop into the root of your project.

---

## The Problem

Spec-driven development works beautifully on greenfield projects. But most real work happens in repositories that already exist — with implicit architecture, undocumented decisions, and an empty `docs/` folder. Writing the specs by hand is the kind of high-value, low-urgency task that never quite gets done.

SpecForge closes that gap. It treats an existing codebase as the source of truth, then back-fills the spec layer (`.kiro/specs/`, `.kiro/steering/`, `.kiro/hooks/`) so the team gets the benefits of spec-driven development without rewriting the project.

## What SpecForge Does

Given a public GitHub URL, SpecForge produces:

| File | Description |
|---|---|
| `.kiro/specs/repo-analysis/requirements.md` | EARS-syntax requirements with Glossary, user stories, and ≥2 acceptance criteria per requirement |
| `.kiro/specs/repo-analysis/design.md` | Architecture overview, tech stack with roles, component descriptions, data flow |
| `.kiro/specs/repo-analysis/tasks.md` | 5–50 actionable tasks grouped by category (testing gaps, refactors, docs, features) |
| `.kiro/steering/product.md` | Purpose, target users, value proposition (derived from README) |
| `.kiro/steering/tech.md` | Detected stack, coding conventions, architecture principles |
| `.kiro/steering/structure.md` | Directory layout, naming conventions, file organization patterns |
| `.kiro/hooks/*.md` | 2–3 hook suggestions mapped to the detected tech stack |

Preview every file in-browser. Download the whole bundle as `{repo}-kiro-specs.zip`.

## Demo

_Coming soon — record a 60-second walkthrough and link it here._

## How It Works

```
┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
│  Browser   │──▶│ /api/analyze │──▶│  GitHub API  │   │   OpenRouter     │
│ (Next.js)  │   │   (Node.js)  │   │   (Octokit)  │   │  (Claude Haiku)  │
└────────────┘   └──────┬───────┘   └──────────────┘   └──────────────────┘
       ▲                │                   ▲                    ▲
       │                ├───────────────────┘                    │
       │                │  1. Validate repo & resolve commit SHA │
       │                │  2. Fetch prioritised files (≤20, ≤100KB)
       │                │  3. AI analysis → structured JSON      │
       │                │  4. Parallel spec generation ──────────┘
       │                ▼
       │       ┌─────────────────┐
       └───────│ AnalyzeResponse │  preview → download .zip (JSZip, client-side)
               └─────────────────┘
```

### Pipeline

1. **Validate** the URL pattern and call `GET /repos/{owner}/{repo}` to confirm it's public.
2. **Resolve** the latest commit SHA on the default branch.
3. **Fetch** up to 20 prioritised text files (README → manifests → configs → entry points → source by depth), capped at 50KB per file and 100KB cumulative. Binary files and trees over 10,000 files are rejected up-front.
4. **Analyse** with an LLM (default: `anthropic/claude-3.5-haiku` via OpenRouter) using a strict JSON schema covering languages, frameworks, architecture, features, relationships, and entry points.
5. **Generate** the six markdown files plus hook suggestions in parallel from the analysis JSON.
6. **Package** client-side with JSZip — the server never touches a zip.

The orchestration lives in [`app/api/analyze/route.ts`](app/api/analyze/route.ts); the prompt library is centralised in [`lib/prompts.ts`](lib/prompts.ts) (no inline prompts elsewhere).

## Built With Kiro

SpecForge was itself built using Kiro's spec-driven workflow. Our own `.kiro/` folder is checked in — see [`.kiro/specs/repo-analysis-spec-generation/`](.kiro/specs/repo-analysis-spec-generation/) for the requirements, design, and tasks that produced this project.

## Tech Stack

- **Next.js 16** (App Router, Turbopack) + **React 19**
- **TypeScript 5**, **Tailwind CSS v4**, **shadcn/ui**
- **OpenRouter** for LLM access (default model: `anthropic/claude-3.5-haiku`; configurable via `OPENROUTER_MODEL`)
- **Octokit REST** for GitHub fetching
- **JSZip** for client-side archive generation
- **react-markdown** + **rehype-highlight** for in-browser preview
- Deployed on **Vercel**

## Local Setup

**Prerequisites:** Node.js 20+ and an OpenRouter API key.

```bash
git clone https://github.com/Iamirtizaali/SpecForge.git
cd SpecForge
npm install
cp .env.local.example .env.local
# Edit .env.local — set OPENROUTER_API_KEY and GITHUB_TOKEN
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | yes | Create at <https://openrouter.ai/keys> |
| `GITHUB_TOKEN` | yes | Personal access token, public-repo scope. <https://github.com/settings/tokens> |
| `OPENROUTER_MODEL` | no | Defaults to `anthropic/claude-3.5-haiku`. Try `anthropic/claude-sonnet-4` for higher-quality output (~12× the cost) |
| `AWS_*` / `S3_CACHE_BUCKET` | no | Optional S3 cache (not yet wired in this build) |

### Scripts

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build + type check
npm run start   # serve production build
npm run lint    # eslint
```

### Cost expectations (per analysis)

| Model | Approx. cost | Quality |
|---|---|---|
| `anthropic/claude-3.5-haiku` (default) | ~$0.01–0.02 | Good |
| `google/gemini-2.5-flash` | ~$0.005 | Good, fastest |
| `anthropic/claude-sonnet-4` | ~$0.15–0.25 | Best |

## Project Layout

```
app/
  api/analyze/route.ts   POST endpoint, orchestrates the full pipeline
  page.tsx               Landing → loading → results state machine
  layout.tsx, globals.css
components/
  RepoInput.tsx          URL form + client-side validation
  ProgressIndicator.tsx  Phased progress with timeout warning + cancel
  FileTree.tsx           Generated-files hierarchy
  FilePreview.tsx        Markdown rendering with syntax highlighting
  DownloadButton.tsx     Client-side zip + browser download
  ui/                    shadcn/ui primitives
lib/
  github.ts              Octokit calls, file prioritisation, size limits
  openrouter.ts          OpenRouter client, retry logic, JSON validation
  prompts.ts             ALL prompt templates (single source of truth)
  spec-generator.ts      Parallel generation of the six spec files + hooks
  download.ts            JSZip packaging + filename sanitisation
  config.ts, constants.ts, errors.ts, types.ts
.kiro/
  specs/repo-analysis-spec-generation/   the spec SpecForge was built from
  steering/                              product / tech / structure docs
```

## API Contract

`POST /api/analyze`

```json
// Request
{ "url": "https://github.com/owner/repo" }
```

```json
// Success (200)
{
  "success": true,
  "metadata": { "owner": "...", "repo": "...", "commitSha": "...", "defaultBranch": "...", "primaryLanguage": "...", "fileCount": 42 },
  "spec":     { "files": [ { "path": ".kiro/specs/repo-analysis/requirements.md", "content": "...", "type": "requirements" }, ... ] },
  "cached":   false,
  "generatedAt": "2026-05-20T10:30:00.000Z"
}
```

Error responses follow the same envelope (`{ success: false, error: { code, message, retryable, retryAfter? } }`) with codes: `INVALID_URL`, `REPO_NOT_FOUND`, `REPO_PRIVATE`, `REPO_TOO_LARGE`, `GITHUB_UNAVAILABLE`, `GITHUB_RATE_LIMITED`, `AI_ANALYSIS_FAILED`, `INTERNAL_ERROR`.

## Limits

- **20** text files fetched per repo
- **50 KB** per file (truncated past that), **100 KB** cumulative
- **10,000** files maximum in the repo tree
- **150,000** characters total payload to the LLM
- **120 s** AI call timeout, up to **3** retries with backoff
- Public repositories only

## Roadmap

- [ ] S3 caching by commit SHA (so re-running a popular repo is instant)
- [ ] Server-Sent Events for live progress (currently time-based on the client)
- [ ] Optional sign-in to use a personal OpenRouter key
- [ ] More language coverage in steering generation
- [ ] PR-mode: open a PR against the analysed repo with the generated `.kiro/` folder

## Team

Built by [Iamirtizaali](https://github.com/Iamirtizaali).

## Dev Logs

See [`docs/dev-logs/`](docs/dev-logs/) for the development journey.

## License

MIT.
