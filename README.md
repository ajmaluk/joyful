# Joyful Builder

**Build full-stack projects with an AI-powered coding workspace.**

Joyful is an open-source, AI-powered web application builder. Describe what you want in plain English, and Joyful generates, previews, and iterates on your project in real time. All AI runs through **NVIDIA**, **Groq**, and **Freemodel** — no Vercel services required. The sandbox is fully local and in-memory.

## Quick Start

```bash
pnpm install
pnpm dev
# Open http://localhost:3000
```

## Features

- **AI-Powered Generation** — Describe your idea and Joyful builds it
- **Live Preview** — See changes in real-time with an in-browser iframe preview
- **File Explorer** — Browse and edit all generated files with syntax highlighting
- **Local Sandbox** — Fully in-memory sandbox for code execution, no external dependencies
- **Skill System** — 23+ auto-activating AI skills with slash command support
- **Multi-Model AI** — Switch between NVIDIA, Groq, and Freemodel providers
- **Local-First** — All projects stored in localStorage, zero server required
- **Dark Mode** — Light/dark/system theme support
- **Responsive Workspace** — Resizable panels for chat, preview, files, and logs

## AI Providers

Joyful supports multiple AI providers through a unified API:

| Provider | Default Model | Environment Variable |
|----------|--------------|---------------------|
| **NVIDIA AI** | Mistral Large 3 | `NV_API_KEY` |
| **Groq** | Llama 3.3 70B | `GROQ_API_KEY` |
| **Freemodel** | GPT-5.5 | `FREEMODEL_API_KEY` |

Models auto-fallback — if NVIDIA rate-limits, Groq takes over.

## Environment Variables

```env
# ── NVIDIA AI (primary) ──
NV_API_KEY=nvapi-your-key
NV_INVOKE_URL=https://integrate.api.nvidia.com/v1/chat/completions
NV_API_MODEL=mistralai/mistral-large-3-675b-instruct-2512
NV_API_FALLBACK_MODELS=qwen/qwen3-coder-480b-a35b-instruct
NV_TOP_P=0.8

# ── Groq (fallback) ──
GROQ_API_KEY=gsk-your-key
GROQ_INVOKE_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_MODEL=llama-3.3-70b-versatile

# ── Freemodel ──
FREEMODEL_API_KEY=fe_oa_your-key
FREEMODEL_INVOKE_URL=https://api.freemodel.dev/v1/chat/completions
FREEMODEL_MODEL=gpt-5.5

# ── Firebase Auth (optional) ──
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Architecture

```
src/
├── app/              # Next.js App Router pages
│   ├── (app)/        # Workspace pages (builder, settings, dashboard)
│   ├── (auth)/       # Authentication pages (login, signup)
│   └── (marketing)/  # Public marketing pages
├── components/       # React components
│   ├── chat/         # Chat interface + message parts
│   ├── preview/      # Iframe live preview
│   ├── file-explorer/ # File tree + content viewer
│   ├── settings/     # Settings panels
│   ├── joyful/       # Brand + marketing components
│   └── ui/           # shadcn/ui primitives
├── ai/               # AI integration
│   ├── gateway.ts    # Provider configuration (NVIDIA, Groq, Freemodel)
│   ├── tools/        # AI tools (sandbox, files, commands)
│   └── messages/     # Data part types
├── lib/              # Core libraries
│   ├── services/     # Storage, skills (23+), agent runtime
│   ├── sandbox.ts    # In-memory sandbox
│   └── types.ts      # TypeScript types
└── hooks/            # Custom React hooks
```

## Skills System

Joyful includes 23+ built-in skills that auto-activate based on your prompt. Skills guide the AI toward better code for your specific use case.

### Quick commands (type `/` in chat)

| Command | Skill | Usage |
|---------|-------|-------|
| `/architect` | React Architecture | `/architect build a dashboard app` |
| `/review` | Code Review | `/review the current code` |
| `/ui` | UI Polish | `/ui make the header responsive` |
| `/test` | Testing | `/test add tests for login` |
| `/perf` | Performance | `/perf optimize images` |
| `/security` | Security | `/security audit the auth flow` |
| `/db` | Database Schema | `/db design user schema` |
| `/api` | API Design | `/api design REST endpoints` |
| `/state` | State Management | `/state refactor to zustand` |
| `/design` | Design System | `/design enforce tokens` |
| `/a11y` | Accessibility | `/a11y check contrast` |
| `/next` | Next.js App Router | `/next scaffold a new route` |
| `/tailwind` | Tailwind CSS | `/tailwind add responsive grid` |
| `/git` | Git Workflow | `/git commit changes` |
| `/docker` | Docker & Containers | `/docker create a Dockerfile` |
| `/animate` | Animation & Motion | `/animate page transitions` |
| `/chart` | Data Visualization | `/chart add revenue chart` |
| `/e2e` | E2E Testing | `/e2e test login flow` |
| `/pwa` | PWA & Offline | `/pwa make app installable` |

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19, TypeScript strict)
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS v4 + Framer Motion
- **State:** Zustand stores + nuqs (URL query-state)
- **AI SDK:** `@ai-sdk/react`, `@ai-sdk/openai`, `ai` SDK v6
- **Auth:** Firebase (email, Google, GitHub)
- **Icons:** Lucide React
- **Sandbox:** Fully local in-memory (MockSandbox)
- **Deployment:** Cloudflare Pages, any static hosting

## Development

```bash
pnpm dev        # Start dev server with Turbopack
pnpm build      # Production build
pnpm lint       # ESLint check
pnpm typecheck  # TypeScript check
pnpm check      # lint + typecheck + build
pnpm cf-pages   # Build for Cloudflare Pages (output: out/)
```

## Deployment

Joyful is designed to be fully static-hostable:

### Cloudflare Pages
```bash
pnpm cf-pages
# Deploy the `out/` directory to Cloudflare Pages
```

### Any Static Hosting
```bash
pnpm build
# Deploy the `out/` directory to any static host
```

> Note: The `/api/chat` endpoint requires a serverless function for AI inference.
> For a fully static site, configure the AI client to call an external OpenAI-compatible endpoint directly.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
