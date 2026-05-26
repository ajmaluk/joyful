# Joyful Builder

**Build and iterate on full-stack projects with an AI-powered coding workspace.**

Joyful is an open-source, AI-powered web application builder that lets you create websites and apps by simply describing what you want. It runs entirely in your browser with no server-side computation needed — perfect for deployment on Cloudflare Pages, Vercel, or any static hosting.

## Features

- **AI-Powered Development** — Describe your idea and Joyful builds it with AI-driven code generation
- **Live Preview** — See changes in real-time as the AI builds your project
- **File Explorer** — Browse and edit all generated files with syntax highlighting
- **Sandbox Environment** — Isolated in-browser sandbox for testing without external dependencies
- **Skill Management** — Auto-activating AI skills that guide generation based on your needs
- **Template Library** — Start from pre-built templates for common project types
- **Local Storage** — All projects stored locally in your browser — no server required
- **Dark Mode** — Built-in theme support with light/dark/system modes
- **Responsive Workspace** — Split-panel layout with resizable panels for chat, preview, files, and logs

## Getting Started

### Prerequisites

- Node.js 22.x or later
- npm, pnpm, or yarn

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm build
```

### Deploy to Cloudflare Pages

```bash
pnpm cf-pages
# Output goes to `out/` — deploy this directory to Cloudflare Pages
```

## Environment Variables

Create a `.env` file in the root:

```env
# AI Provider (choose one or more)

## NVIDIA AI
NV_API_KEY=nvapi-your-key
NV_INVOKE_URL=https://integrate.api.nvidia.com/v1/chat/completions
NV_API_MODEL=mistralai/mistral-large-3-675b-instruct-2512
NV_API_FALLBACK_MODELS=qwen/qwen3-coder-480b-a35b-instruct
NV_TOP_P=0.8

## Groq (fallback)
GROQ_API_KEY=gsk-your-key
GROQ_INVOKE_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_API_MODEL=llama-3.3-70b-versatile

# Firebase Auth (optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Architecture

Joyful uses Next.js with the App Router, client-side rendering, and local-first storage:

```
src/
├── app/           # Next.js App Router pages
│   ├── (app)/     # Authenticated app pages (builder, settings, dashboard)
│   ├── (auth)/    # Authentication pages (login, signup)
│   └── (marketing)/ # Public marketing pages
├── components/    # Reusable React components
│   ├── chat/      # Chat interface components
│   ├── preview/   # Live preview components
│   ├── file-explorer/ # File browsing components
│   ├── settings/  # Settings panel components
│   └── joyful/    # Joyful brand components
├── ai/            # AI integration layer
│   ├── gateway.ts # AI provider configuration
│   ├── tools/     # AI tools (sandbox, files, commands)
│   └── messages/  # Message data parts and schemas
├── lib/           # Core libraries
│   ├── services/  # Storage, skills, agent runtime
│   ├── sandbox.ts # In-browser sandbox implementation
│   └── types.ts   # TypeScript type definitions
└── hooks/         # React hooks
```

## Skills System

Joyful includes an intelligent skills system that automatically activates relevant development guidelines based on your prompt:

- **React Architecture** — Production-ready React/Vite structure
- **Web Dev Master** — Full lifecycle web development orchestration
- **UI Polish** — Responsive, accessible, professional layouts
- **Code Review** — Runtime error and regression detection
- **Next.js App Router** — Server components and RSC patterns
- **API Design** — RESTful and GraphQL API conventions
- **Database Schema** — Efficient data modeling
- **Security** — OWASP best practices
- **State Management** — Efficient React state patterns

Skills auto-activate with confidence scoring and compose together for complex tasks.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](LICENSE) for details.

## Built With

- [Next.js](https://nextjs.org/) — React framework
- [AI SDK](https://sdk.vercel.ai/) — AI integration
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [Zustand](https://github.com/pmndrs/zustand) — State management
- [Firebase](https://firebase.google.com/) — Authentication
- [Framer Motion](https://www.framer.com/motion/) — Animations
