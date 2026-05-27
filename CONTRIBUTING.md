# Contributing to Joyful Builder

Thank you for considering contributing! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and fill in your API keys
4. Start development: `pnpm dev`

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages and layouts |
| `components/` | Reusable UI components |
| `ai/` | AI integration layer (gateway, tools, messages) |
| `lib/` | Core libraries and services |
| `hooks/` | React custom hooks |
| `public/` | Static assets |

## Code Style

- **TypeScript** strict mode, no `any`
- **Tailwind CSS** for all styling — no CSS modules or inline styles
- **React Server Components** by default; `'use client'` only for interactivity
- **Component files** use PascalCase; utility files use camelCase
- **Imports** use absolute paths with `@/` alias
- **2-space indentation**

## Pull Request Process

1. Create a feature branch from `main`
2. Make changes with clear, atomic commits
3. Run `pnpm check` (lint + typecheck + build)
4. Ensure the build succeeds
5. Open a PR with a clear description

## Adding a Skill

Skills are defined in `lib/services/skills.ts`:

1. Add a `BuilderSkill` entry with: `id`, `name`, `description`, `instructions`, `keywords`, `sourcePath`
2. Add doc content in `registerSkillDocs()` 
3. Add scoring rules in `scoreSkill()` for auto-activation
4. Optionally add a slash command in `SLASH_COMMANDS`

## Adding an AI Model

1. Add the model constant in `ai/constants.ts`
2. Configure the provider in `ai/gateway.ts`
3. Add fallback logic in `app/api/chat/route.ts`

## Adding a UI Component

1. Check if a shadcn/ui primitive exists in `components/ui/`
2. Use `@/lib/utils` for `cn()` class merging
3. Follow existing component patterns (named exports, TypeScript interfaces)

## Questions?

Open a [GitHub Discussion](https://github.com/your-username/joyful-builder/discussions).
