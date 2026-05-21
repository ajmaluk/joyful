# Performance Budget

Ensure all UI work respects performance constraints: lightweight components, minimal rerenders, reasonable payloads, and observable improvements over speculative optimization.

## When to invoke
- Building new components or pages
- When asked to "optimize", "make it faster", or "check performance"
- After adding data fetching, images, or animations
- Before shipping any user-facing feature

## Performance Budgets

### Bundle Size
- **Initial JS bundle**: < 200KB gzipped
- **Per-page JS**: < 100KB gzipped (above the fold)
- **CSS**: < 50KB gzipped
- **Single image**: < 200KB (use WebP/AVIF, resize to display dimensions)
- **Total page weight**: < 1MB (aim for < 500KB)

### Runtime Performance
- **First Contentful Paint**: < 1.8s
- **Time to Interactive**: < 3.8s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Interaction to Next Paint**: < 200ms

### React-Specific
- **Rerenders**: Components should not rerender more than once per user action
- **Component count**: Avoid deeply nested component trees (> 20 levels)
- **State updates**: Batch related state changes; avoid sequential setState calls
- **Effect dependencies**: Effects should have stable, minimal dependency arrays

## Workflow

### 1. Component Design
- Prefer lightweight components: no unnecessary wrappers, HOCs, or context providers
- Use composition over inheritance for shared behavior
- Lazy-load components that are not immediately visible (below the fold, in modals, in tabs)
- Split large components into smaller ones only when it improves clarity or enables lazy loading

### 2. Rerender Prevention
- Use `React.memo` only when profiling shows unnecessary rerenders
- Stabilize callback references with `useCallback` when passed to memoized children
- Stabilize object references with `useMemo` when used as props or effect dependencies
- Avoid creating objects/arrays inline in JSX (`style={{}}`, `items={data.map(...)}`)
- Keep state as close to where it's used as possible

### 3. Data Fetching
- Fetch only the data you need (select specific fields, paginate, filter server-side)
- Cache responses to avoid redundant network requests
- Use streaming or pagination for large datasets
- Debounce search inputs (300ms minimum)
- Prefetch data for likely next actions (hover links, visible tabs)

### 4. Asset Optimization
- Use modern image formats (WebP, AVIF) with fallbacks
- Specify image dimensions to prevent layout shift
- Lazy-load images below the fold
- Use CSS animations over JS animations when possible
- Minimize icon payload (use icon sprites or SVG symbols)

### 5. Code Splitting
- Split by route (each page loads its own code)
- Split by feature (heavy features load on demand)
- Split by user role (admin-only code doesn't load for regular users)
- Use dynamic `import()` for large dependencies used in specific flows

### 6. Observable Improvements
- Measure before optimizing (use React DevTools Profiler, Lighthouse, Web Vitals)
- Optimize the biggest bottleneck first (usually images, then JS, then CSS)
- Verify the improvement with the same measurement tool
- Document the before/after metrics

## Anti-Patterns to Avoid
- Loading all data upfront when only a subset is needed
- Rerendering entire lists when one item changes
- Inline object/array creation in render functions
- Unnecessary `useEffect` for derived state (use `useMemo` instead)
- Fetching data in `useEffect` without a caching strategy
- Large dependencies bundled when only a small part is used
- Synchronous operations that block the main thread

## Checklist
- [ ] Bundle size within budget
- [ ] Images optimized (format, size, lazy loading)
- [ ] No unnecessary rerenders
- [ ] Data fetching is efficient (pagination, caching, debouncing)
- [ ] Code splitting applied where appropriate
- [ ] Animations use CSS or requestAnimationFrame
- [ ] Layout shift is minimized (dimensions specified)
- [ ] Performance measured and verified

## When to Optimize
- **Always**: Image optimization, proper data fetching, code splitting by route
- **When measured**: Rerender optimization, memoization, complex computations
- **Never**: Premature optimization without profiling data
