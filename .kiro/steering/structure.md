# SpecForge Repository Structure

## File Organization
- `/app` — Next.js pages and API routes
- `/lib` — Core business logic (no React)
- `/components` — Reusable React components
- `/.kiro` — Our own Kiro spec/steering/hooks (eat our own dog food)
- `/docs/dev-logs` — Development journal entries

## Naming Conventions
- Files: kebab-case (`spec-generator.ts`)
- React components: PascalCase (`RepoInput.tsx`)
- API routes: `route.ts` inside `app/api/[name]/`
- Types: PascalCase interfaces in same file or `lib/types.ts`

## Git Workflow
- Main branch: protected, PR-only
- Feature branches: `feat/short-description`
- Commit messages: conventional commits (feat:, fix:, docs:, chore:)
- Each major step gets a dev log commit