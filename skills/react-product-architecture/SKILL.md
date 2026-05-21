# React Product Architecture

Create production-ready React applications with clear component structure, predictable state management, framework-friendly organization, and complete local imports.

## When to invoke
- Starting a new React project or feature
- When asked to "set up React", "create a component", or "architect this feature"
- When restructuring an existing React codebase
- When deciding between state management approaches

## Project Structure

```
src/
  components/          # Shared UI components
    Button/
      Button.tsx
      Button.test.tsx
      Button.stories.tsx
      index.ts
  features/            # Feature-specific code
    auth/
      components/
      hooks/
      api.ts
      types.ts
      index.ts
  hooks/               # Shared custom hooks
  lib/                 # Utilities, API clients, config
  pages/               # Route-level components
  types/               # Shared TypeScript types
  styles/              # Global styles, tokens, themes
```

### Rules
- **Colocate**: Keep code as close to where it's used as possible
- **Extract up**: Move to `components/` or `features/` only when used in 2+ places
- **Feature folders**: Group by feature, not by type (all auth code in `features/auth/`)
- **Barrel exports**: Use `index.ts` for clean imports, but avoid re-exporting everything

## Component Architecture

### Component Types
1. **Presentational (UI) Components**: Receive props, render UI, no business logic
   - Live in `components/`
   - Named after what they render: `Button`, `Card`, `Modal`
   - Export both the component and its props type

2. **Container Components**: Connect data to presentational components
   - Live in `features/` or `pages/`
   - Named after what they manage: `UserProfile`, `ProductList`, `Dashboard`
   - Handle data fetching, state, and business logic

3. **Page Components**: Route-level components that compose containers
   - Live in `pages/`
   - Named after the route: `HomePage`, `SettingsPage`, `ProductDetailPage`
   - Handle routing, layout, and page-level data

### Component Design Rules
- **Single responsibility**: Each component does one thing well
- **Props interface**: Define explicit props types, avoid `any` or overly broad types
- **Default props**: Use default parameter values, not `defaultProps`
- **Composition over props drilling**: Use composition (children, render props) before context
- **Simple boundaries**: Keep components small; extract only when repeated or complex

## State Management

### State Hierarchy (prefer top option that fits)
1. **Local state** (`useState`, `useReducer`): Component-specific data
2. **Lifted state**: Shared between parent and children
3. **URL state**: Data that should be shareable/bookmarkable (query params, path params)
4. **Context**: Truly global data (theme, auth, locale) — use sparingly
5. **Server state cache** (React Query, SWR): Data from APIs — never put in useState
6. **Global state** (Zustand, Redux): Cross-cutting client state (only when needed)

### Rules
- Never put server data in `useState` — use a data fetching library
- Prefer URL state over global state for filters, search, pagination
- Context is for dependency injection, not state management
- Keep state as close to where it's used as possible

## Data Fetching

### Patterns
- Use React Query / SWR for server state (caching, refetching, stale-while-revalidate)
- Co-locate API calls with the feature that uses them (`features/auth/api.ts`)
- Type all API responses and requests
- Handle loading, error, and empty states explicitly
- Use optimistic updates for better UX when appropriate

### Anti-Patterns
- Fetching in `useEffect` without caching
- Putting API data in global state manually
- Fetching in component bodies (violates rules of hooks)
- Not handling error states

## File Organization

### Import Rules
- Use complete, explicit imports — no relying on global scope
- Order imports: external libraries, internal modules, relative imports
- Use absolute imports from `src/` (configure path aliases)
- Avoid circular dependencies — if A imports B and B imports A, extract shared logic

### Naming Conventions
- Components: PascalCase (`UserProfile`)
- Hooks: camelCase with `use` prefix (`useAuth`)
- Types: PascalCase (`UserProps`, `ApiResponse`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Files: Match the exported component/hook name

## Checklist
- [ ] Project structure follows feature-based organization
- [ ] Components have single responsibility
- [ ] State is at the appropriate level (not over-engineered)
- [ ] Server state uses a caching library, not useState
- [ ] All imports are explicit and complete
- [ ] Props types are defined and exported
- [ ] Loading, error, and empty states are handled
- [ ] No circular dependencies
- [ ] Code is colocated until extraction is justified
