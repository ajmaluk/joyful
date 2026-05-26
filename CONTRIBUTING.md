# Contributing to Joyful Builder

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start development: `pnpm dev`

## Project Structure

- `app/` — Next.js App Router pages and layouts
- `components/` — Reusable UI components
- `ai/` — AI integration layer (gateway, tools, messages)
- `lib/` — Core libraries and services
- `hooks/` — React custom hooks
- `public/` — Static assets

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling — no CSS modules
- React Server Components by default; `'use client'` only when needed
- Component files use PascalCase; utility files use camelCase
- Imports: absolute paths with `@/` alias

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Run `pnpm type-check` and `pnpm lint`
4. Ensure the build succeeds with `pnpm build`
5. Open a PR with a clear description of changes

## Adding a New Skill

Skills are defined in `lib/services/skills.ts`. To add one:

1. Create an entry in `defaultBuilderSkills` array with:
   - `id` — unique identifier
   - `name` — display name
   - `description` — summary (shown in manifest)
   - `instructions` — detailed guidance for the AI
   - `keywords` — trigger words for auto-activation
   - `sourcePath` — path to a markdown doc (optional)

2. Add scoring rules in `scoreSkill()` for auto-activation

3. Add to appropriate group in `composeSkills()` if it should compose

## Adding an AI Model

1. Add the model constant in `ai/constants.ts`
2. Configure the provider in `ai/gateway.ts`
3. Add fallback logic in `app/api/chat/route.ts`

## Deployment

Joyful is designed for Cloudflare Pages static deployment:

```bash
pnpm cf-pages
```

The output in `out/` can be deployed to any static hosting provider.

## Questions?

Open a [GitHub Discussion](https://github.com/your-username/joyful-builder/discussions) for questions and ideas.
