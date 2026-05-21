# Accessibility Audit

Audit and enforce WCAG 2.2 AA compliance across all UI work.

## When to invoke
- Building new UI components or pages
- After implementing interactive features (forms, modals, navigation)
- When asked to "check accessibility", "a11y audit", or "make this accessible"
- Before shipping any user-facing interface

## Workflow

### 1. Semantic HTML
- Use the correct element for the job: `<button>` for actions, `<a>` for navigation, `<nav>` for navigation regions, `<main>` for primary content
- Avoid `<div>` or `<span>` with click handlers when a semantic element exists
- Wrap form controls in `<label>` elements or use `aria-labelledby`

### 2. Keyboard Navigation
- All interactive elements must be reachable via Tab
- Focus order must follow visual order
- Custom components need `tabIndex`, `role`, and key handlers (Enter/Space for buttons, Escape for modals)
- No keyboard traps — users must be able to navigate away from every element

### 3. Focus States
- Never use `outline: none` without a visible replacement
- Focus indicators must have at least 3:1 contrast ratio against adjacent colors
- Focus ring should be clearly visible on all interactive elements

### 4. Color and Contrast
- Text must have at least 4.5:1 contrast ratio against its background (3:1 for large text, 18pt+ or 14pt+ bold)
- Never use color alone to convey information — add icons, text, or patterns
- Check contrast for placeholder text, disabled states, and link colors

### 5. Screen Reader Support
- Add `alt` text to all meaningful images; use `alt=""` for decorative images
- Use `aria-label` or `aria-labelledby` on icon-only buttons and inputs without visible labels
- Mark up live regions with `aria-live` for dynamic content updates
- Ensure ARIA attributes match the element's role and valid states

### 6. Heading Structure
- Use a single `<h1>` per page
- Headings must be hierarchical (no skipping from h1 to h3)
- Headings should describe the content that follows

### 7. Forms
- Every input must have an associated label
- Required fields must be indicated with text (not just `*`)
- Error messages must be programmatically associated with their inputs via `aria-describedby`
- Group related fields with `<fieldset>` and `<legend>`

### 8. Responsive Accessibility
- Touch targets must be at least 44x44px
- Content must be readable and operable at 200% zoom
- Horizontal scrolling should not be required at 320px width

## Checklist
- [ ] Semantic HTML elements used correctly
- [ ] All interactive elements keyboard-accessible
- [ ] Visible focus states on all interactive elements
- [ ] Contrast ratios meet WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Alt text present on meaningful images
- [ ] Labels associated with all form controls
- [ ] Heading hierarchy is logical
- [ ] ARIA attributes are valid and necessary
- [ ] Error states are accessible
- [ ] No content lost at 200% zoom or 320px width
