# Joyful Agent Manifest

Joyful keeps this file as the lightweight agent manifest. The AI request should include the available skill names and descriptions, then load only the matching skill instructions for the current task.

## Available skills

- React Product Architecture (`react-product-architecture`): Prefer maintainable React/Vite structures, component boundaries, and reusable state patterns. Source: `skills/react-product-architecture/SKILL.md`
- File Context Graph (`file-context-graph`): Read the smallest useful file set before editing and include dependency neighbors. Source: `skills/file-context-graph/SKILL.md`
- Code Review Pass (`code-review-pass`): Check edits for runtime errors, broken references, preview failures, and missing states. Source: `skills/code-review-pass/SKILL.md`
- Responsive UI Polish (`responsive-ui-polish`): Keep layouts clean, professional, accessible, and stable across viewport sizes. Source: `skills/responsive-ui-polish/SKILL.md`
- Vision Reference (`vision-reference`): Use attached screenshots, mockups, and visual references when the request includes an image. Source: `skills/vision-reference/SKILL.md`
- Accessibility Audit (`accessibility-audit`): Check keyboard support, semantic structure, contrast, focus states, and screen-reader readiness. Source: `skills/accessibility-audit/SKILL.md`
- Testing Workflow (`testing-workflow`): Push the AI to validate behavior with build, lint, and preview-safe checks. Source: `skills/testing-workflow/SKILL.md`
- Performance Budget (`performance-budget`): Keep the AI aware of render cost, bundle size, image weight, and avoidable rerenders. Source: `skills/performance-budget/SKILL.md`
- Design System Consistency (`design-system-consistency`): Keep the generated UI visually coherent with reusable tokens, spacing, and component patterns. Source: `skills/design-system-consistency/SKILL.md`

User-created skills are stored in Joyful settings and merged into this manifest dynamically at runtime.
