# SpecForge Technical Context

## Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes (serverless on Vercel)
- **AI**: AWS Bedrock — Anthropic Claude 3.5 Sonnet (model id: `anthropic.claude-3-5-sonnet-20241022-v2:0`)
- **GitHub API**: Octokit REST client
- **Hosting**: Vercel
- **Storage**: AWS S3 (optional, for caching analyzed repos)

## Code Standards
- TypeScript strict mode
- Functional React components with hooks (no class components)
- Async/await over .then() chains
- All API routes return typed JSON with status codes
- Environment variables in `.env.local`, never committed
- All AI prompts live in `lib/prompts.ts` — never inline in business logic

## Architecture Principles
- Frontend never calls Bedrock directly — always through `/api/analyze`
- GitHub fetching happens server-side only (protect the token)
- Cache analyzed repos by commit SHA to avoid duplicate AI calls
- Stream progress to user via Server-Sent Events if time permits, else polling

## Environment Variables (required)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION (us-east-1 or us-west-2)
- GITHUB_TOKEN