# Responsive UI Polish

Ensure all UI renders correctly across viewports with consistent spacing, readable contrast, stable layouts, and no visual defects like overlapping elements or clipped text.

## When to invoke
- After building any UI component or page
- When asked to "make it responsive", "fix the layout", or "polish the UI"
- Before shipping any user-facing interface
- When visual defects are reported (overlapping, clipping, misalignment)

## Workflow

### 1. Viewport Testing
Test at these breakpoints (adjust to project standards):
- **Mobile**: 320px, 375px, 414px
- **Tablet**: 768px, 834px, 1024px
- **Desktop**: 1280px, 1440px, 1920px

Check for:
- Content fits without horizontal scrolling
- Touch targets are at least 44x44px on mobile
- Text is readable at all sizes
- Navigation adapts appropriately (hamburger menu on mobile)

### 2. Spacing Consistency
- Use a spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px) — no arbitrary values
- Vertical rhythm: consistent spacing between sections, headings, and paragraphs
- Padding and margin should scale proportionally across breakpoints
- Check that spacing doesn't collapse or double at any breakpoint

### 3. Typography
- Font sizes should scale appropriately (not too small on mobile, not too large on desktop)
- Line height should be at least 1.4 for body text, 1.2 for headings
- Check that text doesn't overflow its container at any size
- Ensure headings maintain visual hierarchy at all breakpoints
- Use `clamp()` or fluid typography for smooth scaling between breakpoints

### 4. Layout Stability
- No overlapping elements at any viewport size
- No clipped or truncated text (check long content, translations)
- Grid and flex layouts should reflow gracefully
- Images and media should scale without distortion
- Fixed/sticky elements should not obscure content

### 5. Contrast and Readability
- Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Background colors don't reduce text readability
- Interactive elements are distinguishable from static content
- Links are visually distinct from body text
- Check readability in both light and dark modes (if applicable)

### 6. Interactive Elements
- Buttons have adequate padding and touch target size (44x44px minimum)
- Form inputs are easy to tap on mobile
- Hover states have equivalent focus states for keyboard users
- Active/pressed states provide visual feedback
- Loading states don't break the layout

### 7. Content Edge Cases
- **Long text**: Does it wrap or truncate gracefully?
- **Empty states**: Does the layout hold up with no content?
- **Many items**: Does a list/grid handle 1, 5, 50, 500 items?
- **Images**: Missing images, wrong aspect ratios, very large/small images
- **User-generated content**: Long names, special characters, emojis, RTL text

## Anti-Patterns to Fix
- Overlapping UI elements (absolute positioning gone wrong)
- Clipped or truncated text (fixed heights, overflow hidden)
- Decorative choices that hurt scanning (low contrast, busy backgrounds)
- Fixed pixel widths that break on small screens
- Content that requires horizontal scrolling on mobile
- Inconsistent spacing between similar elements
- Layout that shifts when content loads (missing dimensions)

## Responsive Strategy
- **Mobile-first**: Start with mobile layout, add complexity for larger screens
- **Fluid where possible**: Use percentages, `fr` units, `clamp()` before breakpoints
- **Breakpoints when needed**: Use breakpoints for layout changes, not fine-tuning
- **Container queries**: Use for component-level responsiveness (when supported)

## Checklist
- [ ] No horizontal scrolling at 320px
- [ ] Touch targets >= 44x44px on mobile
- [ ] Text readable at all breakpoints
- [ ] No overlapping or clipped elements
- [ ] Spacing consistent across viewports
- [ ] Layout stable (no unexpected shifts)
- [ ] Contrast meets WCAG AA
- [ ] Interactive elements have all states (hover, focus, active)
- [ ] Edge cases handled (long text, empty states, many items)
- [ ] Images scale correctly
