# Vision Reference

Use attached images as visual product context to guide implementation, matching visible layout, styling, content structure, and interaction patterns while staying honest about ambiguous details.

## When to invoke
- When an image, screenshot, or mockup is attached to the conversation
- When asked to "implement this design", "match this screenshot", or "build from this image"
- When comparing implementation against a visual reference
- When a user shares a design mockup, Figma export, or competitor screenshot

## Workflow

### 1. Image Analysis
Inspect the attached image for:
- **Layout structure**: Grid, columns, rows, sections, spacing relationships
- **Typography**: Font sizes, weights, hierarchy, alignment, line lengths
- **Color palette**: Primary colors, backgrounds, text colors, accent colors
- **Components**: Buttons, cards, forms, navigation, modals, lists
- **Spacing**: Margins, padding, gaps between elements
- **Content**: Text, images, icons, data being displayed
- **Interactions**: Hover states, active states, animations (if animated GIF/video)

### 2. Extract Design Tokens
From the visual reference, identify:
- Approximate font sizes (small ~12-14px, body ~16px, heading ~24-48px)
- Spacing scale (look for repeating gaps: 8px, 16px, 24px, 32px)
- Color values (use dominant colors, note contrast relationships)
- Border radius (sharp, slight ~4px, moderate ~8px, pill ~999px)
- Shadow depth (flat, subtle, elevated)

### 3. Map to Implementation
- Match the layout structure using appropriate CSS (flex, grid, absolute)
- Use the extracted spacing and typography values
- Replicate the color relationships (exact values if clear, approximations if not)
- Build components that match the visual patterns shown

### 4. Handle Ambiguity
When details are unclear from the image:
- **State the assumption**: "The image doesn't show the hover state, so I'll use..."
- **Choose the simplest option**: Default to standard patterns unless the image suggests otherwise
- **Note the gap**: Call out what couldn't be determined from the image
- **Ask if critical**: If an ambiguous detail is essential, ask the user

### 5. Identify Defects
If the reference image shows potential issues:
- Overlapping elements or layout problems
- Poor contrast or readability issues
- Inconsistent spacing or alignment
- Missing states (no loading, error, or empty state visible)

Flag these to the user: "The reference shows X, which may cause Y issue. Should I..."

### 6. Fidelity Check
After implementation, compare against the reference:
- Does the overall layout match?
- Are spacing relationships consistent?
- Does typography hierarchy match?
- Are colors and visual weight similar?
- What's different and why?

## Rules
- **Match what's visible**: Implement what you can see in the image
- **Don't invent**: Don't add features or content not shown in the reference
- **Acknowledge limits**: Images don't show interactions, states, or behavior — note these gaps
- **Prioritize structure over pixel perfection**: Get the layout and hierarchy right before fine-tuning
- **Stay honest**: If something is ambiguous, say so rather than guessing confidently

## Output Format
When implementing from a visual reference:
1. Describe what you see in the image (layout, components, styling)
2. Note any ambiguities or missing information
3. Implement the visible design
4. Report what matches and what differs from the reference
