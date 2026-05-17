Now generate the design.md for SpecForge based on these requirements. The design should include:

1. **High-Level Architecture** — A mermaid diagram showing: User → Next.js Frontend → /api/analyze → GitHub API + AWS Bedrock → Response → Download

2. **Components** — Describe each major component:
   - RepoInput (UI)
   - SpecPreview (UI)
   - DownloadButton (UI)
   - github.ts (GitHub fetcher)
   - bedrock.ts (AI client)
   - prompts.ts (prompt library)
   - spec-generator.ts (orchestrator)

3. **Data Models** — TypeScript interfaces for:
   - AnalyzeRequest
   - RepoMetadata
   - GeneratedSpec
   - AnalyzeResponse

4. **API Contract** — Document the /api/analyze endpoint:
   - Method, request body, response shape, error codes

5. **AI Prompt Strategy** — For each generated file type (requirements, design, tasks, steering), describe:
   - What context we send to the AI
   - The system prompt approach
   - Expected output format
   - Token budget considerations

6. **Error Handling Strategy** — How we handle: invalid URLs, rate limits, AI failures, oversized repos.

7. **Performance Considerations** — How we keep total response under 90 seconds.

Use mermaid for any diagrams. Be specific enough that a developer could start coding from this document.