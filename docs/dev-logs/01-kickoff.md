# Dev Log 01: Kickoff
**Date:** [today's date]
**Time:** [start time]
**Team:** [4 names]

## What We're Building
SpecForge — a tool that auto-generates Kiro spec files for any GitHub repository.

## Why This Idea
Kiro is incredible for greenfield projects, but adopting it on existing codebases means manually writing specs for everything that already exists. We're solving that.

## Hour 0-1 Activities
- Locked team roles
- Set up GitHub repo
- Got AWS Bedrock access (using Claude 3.5 Sonnet)
- Got GitHub PAT
- Started spec-driven planning in Kiro

## Key Decisions Made
- Tech stack: Next.js + Bedrock + GitHub API
- Hosting: Vercel
- Region: us-east-1 (or us-west-2 if Bedrock model unavailable)
- MVP scope: public repos only, JS/TS/Python focus for demo

## Next Up
Build the core analyze pipeline. Frontend scaffolding underway in parallel.