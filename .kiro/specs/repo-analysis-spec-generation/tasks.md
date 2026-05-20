# Implementation Plan: Repository Analysis & Spec Generation

## Overview

This plan implements SpecForge's core feature: accepting a public GitHub repository URL, fetching and analyzing its contents via AWS Bedrock (Claude 3.5 Sonnet), and generating a complete `.kiro/` folder with specs, steering documents, and hook suggestions. The implementation is organized into parallel workstreams: UI/frontend, backend API/services, and AI integration/generation — enabling 3 developers to work concurrently over ~6 hours.

## Tasks

- [x] 1. Project foundation and shared types
  - [x] 1.1 Set up project structure and shared TypeScript interfaces
    - Create `lib/types.ts` with interfaces: `AnalyzeRequest`, `RepoMetadata`, `FetchedFile`, `AIAnalysisResult`, `GeneratedSpec`, `AnalyzeResponse`, `ProgressPhase`, `ErrorResponse`
    - Create `lib/constants.ts` with limits (20 files max, 100KB total, 50KB per file, 10000 file tree max, 90s timeout, 120s AI timeout)
    - Create `lib/errors.ts` with typed error classes: `ValidationError`, `GitHubError`, `AIAnalysisError`, `CacheError`
    - _Requirements: 1.1, 1.2, 2.1, 3.3, 3.6, 4.3, 12.6_

  - [x] 1.2 Set up environment configuration and validation
    - Create `lib/config.ts` that reads and validates `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `GITHUB_TOKEN` from environment
    - Throw descriptive errors at startup if required vars are missing
    - Create `.env.local.example` documenting all required variables
    - _Requirements: 2.1, 4.1_

- [ ] 2. Repository URL submission and validation UI
  - [ ] 2.1 Implement RepoInput component with URL validation
    - Create `components/RepoInput.tsx` with text input (maxLength 2048) and submit button
    - Implement client-side regex validation for `https://github.com/{owner}/{repo}` pattern
    - Display inline validation messages for empty input and invalid format
    - Disable submit button during analysis (prevent duplicate submissions)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 13.4_

  - [ ] 2.2 Build the main page layout and form submission flow
    - Create `app/page.tsx` with centered layout, branding, and RepoInput integration
    - Wire form submission to call `/api/analyze` endpoint
    - Handle error responses (404, 403, 502, 429) and display user-friendly messages
    - Implement "Try Again" button that clears input and results
    - _Requirements: 1.5, 2.3, 2.4, 2.5, 12.1, 12.2, 12.4, 12.7_

  - [ ]* 2.3 Write unit tests for URL validation logic
    - Test valid GitHub URLs, invalid formats, empty input, edge cases (trailing slashes, extra path segments)
    - _Requirements: 1.2, 1.3, 1.4_

- [ ] 3. Progress indication UI
  - [ ] 3.1 Implement ProgressIndicator component
    - Create `components/ProgressIndicator.tsx` showing current phase name and animated spinner/bar
    - Support phases: "Validating repository", "Fetching files", "Analyzing codebase", "Generating specs", "Complete"
    - Update displayed phase within 2 seconds of server phase change
    - Show timeout warning after 90 seconds with cancel button
    - _Requirements: 13.1, 13.2, 13.3, 13.5_

  - [ ] 3.2 Implement cancel and timeout handling
    - Wire cancel button to abort in-progress fetch request
    - Re-enable submit button and display cancellation message on cancel
    - Implement polling or SSE client to receive progress updates from server
    - _Requirements: 13.5, 13.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. GitHub integration service
  - [ ] 5.1 Implement repository accessibility validation
    - Create `lib/github.ts` with Octokit REST client initialization
    - Implement `validateRepository(owner, repo)` that checks existence and public access within 10 seconds
    - Return appropriate error codes: 404 (not found), 403 (private), 502 (GitHub unavailable)
    - Handle GitHub API timeout (10s) and 5xx responses
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 5.2 Implement repository content fetching with intelligent file selection
    - Implement `fetchRepositoryContent(owner, repo)` that retrieves file tree from default branch
    - Implement file prioritization: README → package manifests → config files → entry points → source files (by depth, then alphabetical)
    - Enforce limits: max 20 text files, 50KB per file (truncate with notice), 100KB total cumulative
    - Skip binary files (images, compiled artifacts, fonts, archives)
    - Return error if tree exceeds 10,000 files
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 5.3 Implement commit SHA resolution for caching
    - Implement `resolveCommitSHA(owner, repo)` to get latest commit SHA on default branch
    - Return error if GitHub API fails to resolve SHA (block analysis, don't proceed)
    - _Requirements: 14.2, 14.7_

  - [ ]* 5.4 Write unit tests for file prioritization and content fetching logic
    - Test priority ordering, binary file skipping, size limit enforcement, truncation behavior
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

- [ ] 6. AI analysis service
  - [ ] 6.1 Implement AWS Bedrock client and AI analysis
    - Create `lib/bedrock.ts` with Bedrock client initialization for Claude 3.5 Sonnet (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
    - Implement `analyzeRepository(fileTree, fileContents)` that sends payload (max 150,000 chars) to Bedrock
    - Set 120-second timeout on Bedrock API call
    - Parse response as JSON, validate all 6 required sections (languages, frameworks, architecture, features, relationships, entry points)
    - _Requirements: 4.1, 4.2, 4.3, 4.6_

  - [ ] 6.2 Implement retry logic for AI failures
    - Retry once after 5-second delay on Bedrock error or timeout (per Requirement 4)
    - On second failure, retry up to 2 additional times with 3-second delays (per Requirement 12)
    - Return descriptive error with failure reason after all retries exhausted
    - _Requirements: 4.4, 4.5, 4.7, 12.3_

  - [ ] 6.3 Create AI prompt templates
    - Create `lib/prompts.ts` with structured prompts for: codebase analysis, requirements generation, design generation, tasks generation, steering generation, hook suggestions
    - Each prompt specifies expected output format (JSON structure)
    - Include token budget considerations (150K char input limit)
    - _Requirements: 4.2, 5.1, 6.1, 7.1, 8.1, 9.1_

- [ ] 7. Spec generation service
  - [ ] 7.1 Implement requirements.md generator
    - Create `lib/spec-generator.ts` with `generateRequirements(analysis)` function
    - Send analysis to Bedrock with requirements prompt requesting EARS format
    - Ensure output has: Glossary section, sequential numbering, user stories, ≥2 acceptance criteria per requirement
    - Handle edge case: zero features detected → single requirement from README/metadata
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 7.2 Implement design.md generator
    - Implement `generateDesign(analysis)` function
    - Produce sections: architecture overview (≥2 sentences), tech stack (named entries with roles), component descriptions, data flow with relationships
    - Handle edge case: <2 components or <1 technology → include insufficient data notice
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 7.3 Implement tasks.md generator
    - Implement `generateTasks(analysis)` function
    - Produce 5-50 tasks as markdown checkboxes under category headings (h2)
    - Categories: testing gaps, documentation improvements, refactoring opportunities, feature enhancements (+ additional as relevant)
    - Each task: 10-200 chars, identifies target component/file and action
    - Omit empty categories
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 7.4 Implement steering documents generator (product.md, tech.md, structure.md)
    - Implement `generateSteering(analysis, readme)` function
    - product.md: project purpose, target users, value proposition (from README + features)
    - tech.md: detected stack, coding conventions, architecture principles
    - structure.md: directory layout, naming conventions, file organization patterns
    - Handle missing README: infer from code, add notice
    - Handle undetectable sections: add placeholder for manual input
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 7.5 Implement hook suggestions generator
    - Implement `generateHooks(analysis)` function
    - Generate 2-3 hook files based on detected tech stack
    - Each hook: event type (≤50 chars), action (≤200 chars), description (≤300 chars)
    - Map technologies to hooks: JS→lint-on-save, TS→type-check, test framework→test-runner
    - Fallback: 2 general-purpose hooks if no tech matches
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. API route and orchestration
  - [ ] 9.1 Implement /api/analyze route with orchestration logic
    - Create `app/api/analyze/route.ts` with POST handler
    - Orchestrate: validate URL → check cache → validate repo access → fetch content → AI analysis → generate specs → cache result → return response
    - Return typed JSON responses with appropriate HTTP status codes
    - Log errors server-side without exposing internals to client
    - _Requirements: 2.1, 2.2, 4.1, 12.6, 14.2, 14.3_

  - [ ] 9.2 Implement progress reporting via Server-Sent Events
    - Create `app/api/analyze/progress/route.ts` SSE endpoint (or polling fallback)
    - Emit phase transitions: validating → fetching → analyzing → generating → complete
    - Ensure phase updates reach client within 2 seconds
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ] 9.3 Implement response caching with S3
    - Create `lib/cache.ts` with S3 read/write operations keyed by commit SHA
    - On cache hit with matching SHA: return cached result within 2 seconds
    - On cache miss or changed SHA: proceed with fresh analysis, update cache
    - Handle cache unavailability gracefully: proceed without cache, no user-facing error
    - Handle cache write failure: return result anyway, log error
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 9.4 Write integration tests for the /api/analyze route
    - Test happy path, cache hit, GitHub errors, AI failures, rate limiting
    - _Requirements: 2.1, 4.4, 12.1, 12.2, 14.3_

- [ ] 10. File preview UI
  - [ ] 10.1 Implement file tree component
    - Create `components/FileTree.tsx` displaying generated files in `.kiro/` hierarchy
    - Show up to 50 files with top-level folders expanded by default
    - Render within 2 seconds of generation completion
    - Auto-select and render first file on initial display
    - _Requirements: 10.1, 10.4, 10.5_

  - [ ] 10.2 Implement file preview with markdown rendering and syntax highlighting
    - Create `components/FilePreview.tsx` with markdown rendering and syntax highlighting (markdown, TypeScript, YAML at minimum)
    - Display file path relative to `.kiro/` root (up to 200 chars)
    - Render selected file content (up to 500KB) within 1 second
    - Show error message if file fails to render, keep tree navigable
    - _Requirements: 10.2, 10.3, 10.6_

- [ ] 11. Download as ZIP
  - [ ] 11.1 Implement ZIP archive generation and download
    - Create `lib/download.ts` using JSZip or similar to package all generated files
    - Structure archive: `.kiro/specs/`, `.kiro/steering/`, `.kiro/hooks/` subdirectories
    - Name file: `{repo-name}-kiro-specs.zip` (sanitize: replace invalid chars with hyphens, max 100 chars)
    - Trigger browser download without page navigation
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ] 11.2 Implement download button with state management
    - Create `components/DownloadButton.tsx` disabled until generation complete
    - Show "generation in progress" message when clicked before completion
    - Handle zip creation failure with error message and retry option
    - _Requirements: 11.5, 11.6_

- [ ] 12. Error handling and edge cases
  - [ ] 12.1 Implement comprehensive error handling across all services
    - Add rate limit handling: parse `x-ratelimit-reset` header, display reset timestamp
    - Ensure all 5xx errors return generic message without internals
    - Wire "Try Again" button to clear all state and return to empty form
    - Implement oversized repo detection (>10,000 files or >500MB) with user message
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 12.2 Write unit tests for error handling paths
    - Test rate limit parsing, retry logic, error message sanitization, oversized repo detection
    - _Requirements: 12.1, 12.3, 12.5, 12.6_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between major phases
- The three parallel workstreams are: UI (tasks 2, 3, 10, 11), Backend services (tasks 5, 9, 12), AI/Generation (tasks 6, 7)
- All AI prompts must live in `lib/prompts.ts` per project conventions — never inline in business logic
- Environment variables are validated at startup via `lib/config.ts`
- Frontend never calls Bedrock directly — always through `/api/analyze`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "5.1", "6.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1", "5.2", "5.3", "6.2", "6.3"] },
    { "id": 3, "tasks": ["3.2", "5.4", "7.1", "7.2", "7.3"] },
    { "id": 4, "tasks": ["7.4", "7.5", "9.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 6, "tasks": ["9.4", "10.2", "11.1"] },
    { "id": 7, "tasks": ["11.2", "12.1"] },
    { "id": 8, "tasks": ["12.2"] }
  ]
}
```
