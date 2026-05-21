# Design System Consistency

Enforce visual and structural consistency across all UI by maintaining a coherent design language, reusing shared patterns, and preventing one-off deviations.

## When to invoke
- Building new pages or components
- When asked to "check consistency", "design audit", or "make this match"
- After receiving design specs or mockups
- When adding new sections to existing pages

## Workflow

### 1. Establish the Design Token Baseline
Before implementing, identify the project's design tokens:
- **Colors**: Primary, secondary, neutral palette, semantic colors (success, warning, error)
- **Typography**: Font families, sizes, weights, line heights, letter spacing
- **Spacing**: Base unit (4px, 8px?), spacing scale (xs, sm, md, lg, xl)
- **Border radius**: Small, medium, large values
- **Shadows**: Elevation levels
- **Breakpoints**: Mobile, tablet, desktop thresholds

If no design tokens exist, extract them from the existing codebase and document them.

### 2. Component Pattern Audit
- Search for existing component implementations of the same pattern
- Reuse existing components before creating new ones
- If a variant is needed, extend the existing component with props rather than duplicating
- Check component library exports before building custom versions

### 3. Spacing Consistency
- Use the project's spacing scale exclusively — no arbitrary pixel values
- Check vertical rhythm: headings, paragraphs, and sections should have consistent spacing
- Verify padding and margin follow the same scale across components
- Ensure consistent gutters between grid items and sections

### 4. Typography Hierarchy
- Use defined text styles (h1, h2, body, caption, etc.) — no custom font sizes
- Heading levels should be consistent across pages
- Body text should use the same size, weight, and line height throughout
- Links, buttons, and labels should have consistent typography

### 5. Color Usage
- Use semantic color tokens, not raw hex values
- Primary actions should use the same color across the app
- Error, warning, and success states should be consistent
- Hover, active, and disabled states should follow the same pattern
- Dark mode (if applicable) should use the same semantic tokens

### 6. Layout Patterns
- Page layouts should follow established grid patterns
- Card components should have consistent padding, borders, and shadows
- Navigation patterns should be reused, not reimplemented
- Form layouts should follow the same structure (label position, spacing, validation placement)

### 7. Interaction Patterns
- Buttons should have consistent hover, active, and focus states
- Transitions and animations should use the same duration and easing
- Loading indicators should be consistent (spinner, skeleton, progress bar)
- Modal/dialog patterns should follow the same structure

## Anti-Patterns to Catch
- Hardcoded color values (`#3b82f6` instead of `var(--color-primary)`)
- Arbitrary spacing (`margin: 13px` instead of `var(--space-md)`)
- Duplicate component logic that should be shared
- One-off animations or transitions that don't match the system
- Inconsistent button styles across pages
- Different form layouts in different sections
- Mixed typography scales

## Checklist
- [ ] All colors use design tokens
- [ ] All spacing uses the spacing scale
- [ ] Typography uses defined text styles
- [ ] Component patterns are reused, not duplicated
- [ ] Layout follows established grid patterns
- [ ] Interaction states are consistent
- [ ] No hardcoded values that should be tokens
- [ ] New components integrate with existing design system

## When to Extend vs. When to Follow
- **Extend**: The pattern exists but needs a new variant (add a prop)
- **Follow**: The pattern exists and fits the use case (reuse it)
- **Create**: No existing pattern covers this use case (document the new pattern)
