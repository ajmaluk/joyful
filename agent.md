# Joyful - AI Website Builder Agent

## Project Overview
Joyful is an AI-powered website builder built with Remix, React, and WebContainers. It enables users to describe websites in natural language and have them built in real-time within the browser.

## Tech Stack
- **Runtime:** Remix (Cloudflare Pages)
- **UI Framework:** React 18
- **Styling:** UnoCSS + SCSS
- **AI SDK:** Vercel AI SDK (@ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google)
- **Code Editor:** CodeMirror 6
- **Container:** WebContainer API (browser-based Node.js)
- **State Management:** Nano Stores
- **Animations:** Framer Motion
- **Icons:** Iconify (Phosphor Icons)
- **Charts/Persistence:** IndexedDB
- **Terminal:** xterm.js

## Project Structure

```
app/
├── components/
│   ├── chat/           # Chat interface, messages, artifacts
│   ├── editor/         # CodeMirror editor integration
│   ├── header/         # App header with navigation
│   ├── home/           # Landing page components (HeroSection, ProjectsPanel)
│   ├── sidebar/        # Navigation sidebar (IconSidebar, Menu, History)
│   ├── ui/             # Reusable UI components (IconButton, Dialog, Slider, etc.)
│   └── workbench/      # Code editor, preview, terminal, file tree
├── lib/
│   ├── .server/llm/    # AI model configuration, streaming, prompts
│   ├── hooks/          # Custom React hooks
│   ├── persistence/    # Chat history & IndexedDB management
│   ├── runtime/        # Message parser, action runner
│   ├── stores/         # Nano Stores for state management
│   └── webcontainer/   # WebContainer boot & lifecycle
├── routes/             # Remix routes
├── styles/             # SCSS styles
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Agent Workflow

### 1. Understanding Requirements
- Parse user request to determine project type (website, app, component, etc.)
- Extract key requirements: features, design preferences, constraints
- Check for file modifications (diffs) in incoming messages

### 2. Planning Phase (`agent.md` - this file)
- Review existing codebase context
- Identify dependencies and their versions
- Plan component architecture
- Determine file structure for new features

### 3. Implementation Phase
- **Create Files:** Use `<boltAction type="file">` for source files
- **Run Commands:** Use `<boltAction type="shell">` for package installation
- **Dependencies:** Install with `pnpm` (preferred) or `pnpm dlx`
- **Order:** Dependencies → Config files → Source code → Assets → Dev server

### 4. Development Guidelines

#### Code Quality
- Split functionality into small, focused modules
- Use TypeScript strictly - avoid `any` types
- Follow existing naming conventions (camelCase for functions/vars, PascalCase for components)
- Use 2-space indentation
- Add meaningful comments for complex logic

#### UI/UX Standards
- Dark theme with vibrant gradient backgrounds
- Glassmorphic panels (backdrop blur, semi-transparent backgrounds)
- Smooth transitions and micro-interactions
- Mobile-first responsive design
- Consistent spacing (use theme tokens)
- Accessible (ARIA labels, keyboard navigation)

#### Component Architecture
- Use `memo()` for performance optimization
- Use `forwardRef` for reusable components
- Use `useStore` from nanostores for state access
- Use `classNames` utility for conditional styling

#### State Management
- Nano Stores for global app state
- React hooks for component-local state
- WorkbenchStore orchestrates editor, files, previews, terminal

### 5. Key Features & Capabilities

#### Website Building
- Accept natural language descriptions
- Generate complete project files
- Preview in real-time via WebContainer
- Edit code directly in the browser
- Terminal access for command execution

#### AI Model Support
- Default: Llama 3.3 70B via NVIDIA API
- Configurable: OpenAI, Anthropic, Google models
- Prompt enhancement via `/api/enhancer`
- Context management with conversation compaction
- File diff tracking for iterative development

#### Image Handling
- Unsplash API integration for stock images
- Local image upload (max 3 images)
- Image preview in the prompt area

### 6. Testing & Validation
- Run `pnpm typecheck` for TypeScript validation
- Run `pnpm lint` for code quality
- Run `pnpm test` for unit tests
- Preview with `pnpm dev` and review in browser

### 7. Common Patterns

#### Adding a New Feature
1. Create necessary store(s) in `app/lib/stores/`
2. Create component(s) in `app/components/`
3. Add route(s) in `app/routes/`
4. Wire up in existing parent components
5. Add styles in `app/styles/`
6. Run typecheck and lint

#### Modifying the AI Prompt
- Edit `app/lib/.server/llm/prompts.ts`
- The `getSystemPrompt()` function generates the system prompt
- Artifact instructions control code generation behavior

## Performance Considerations
- Use `memo` and `useMemo` for expensive renders
- Use `nanostores` computed values for derived state
- WebContainer lifecycle: boot once, reuse across sessions
- Message parser handles streaming incrementally
- File watchers batch events (100ms buffer)

## Security Notes
- API keys stored in Cloudflare environment variables
- IndexedDB for local persistence only
- WebContainer sandboxes code execution
- Sanitize HTML in markdown rendering
