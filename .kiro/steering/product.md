# SpecForge Product Context

## What is SpecForge?
SpecForge is a web application that analyzes any public GitHub repository and auto-generates a complete `.kiro/` folder — including spec files (requirements.md, design.md, tasks.md), steering documents, and suggested hooks — so teams can retrofit Kiro's spec-driven development workflow onto existing codebases.

## Target User
Developers and engineering teams who:
- Have existing codebases without specs
- Want to adopt Kiro's spec-driven workflow
- Don't have time to manually write specs for legacy code

## Core Value Proposition
"From zero specs to a complete .kiro folder in 60 seconds."

## Success Metrics
- A user can paste a GitHub URL and receive a downloadable .kiro folder in under 90 seconds
- Generated specs follow EARS format (Easy Approach to Requirements Syntax)
- Generated specs are good enough to be used as a starting point without major edits

## Out of Scope (for hackathon MVP)
- Private repository support
- User accounts / authentication
- Spec editing in-browser (read-only download for now)
- Multi-language analysis depth (focus on JS/TS/Python repos for demo)