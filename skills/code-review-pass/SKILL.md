# Code Review Pass

Systematic code review after each build or change set to catch regressions, bugs, and quality issues before they land.

## When to invoke
- After completing a feature or fix
- Before committing or creating a PR
- When asked to "review this", "code review", or "check my changes"
- After refactoring or restructuring code

## Workflow

### 1. Changed File Analysis
- Run `git diff` to identify all changed files
- Categorize changes: new files, modified files, deleted files
- Note the scope: single file, feature area, or cross-cutting

### 2. Syntax and Type Checks
- Verify no syntax errors in any changed file
- Check that all imports resolve correctly
- Confirm TypeScript types are consistent (no `any` leakage, proper generics)
- Validate that function signatures match their callers

### 3. Logic Review
- Trace the execution path through changed code
- Identify edge cases: null/undefined inputs, empty arrays, boundary conditions
- Check error handling: are failures caught and surfaced appropriately?
- Verify state transitions are correct and complete
- Look for race conditions in async code

### 4. UI-Specific Checks
- **Visual regressions**: Compare before/after behavior of changed components
- **Empty states**: Do components render gracefully with no data?
- **Loading states**: Is there feedback during async operations?
- **Error states**: Are errors displayed to users, not just logged?
- **Responsiveness**: Does the UI work across viewport sizes?
- **Preview compatibility**: Does the component work in Storybook or isolated preview?

### 5. Integration Points
- Verify API calls match the expected contract (request shape, response handling)
- Check that event handlers are wired correctly
- Confirm prop types match between parent and child components
- Validate that shared utilities are used correctly

### 6. Code Quality
- No dead code or commented-out blocks
- Meaningful variable and function names
- Functions do one thing (single responsibility)
- No duplicated logic that should be extracted
- Comments explain "why", not "what"

### 7. Security
- No secrets, tokens, or credentials in code
- User input is validated before use
- XSS vectors are sanitized (dangerouslySetInnerHTML, innerHTML)
- Sensitive data is not logged or exposed

## Review Output Format

For each issue found, report:
1. **File:Line** — location of the issue
2. **Severity** — Critical / Warning / Suggestion
3. **Description** — what the issue is and why it matters
4. **Fix** — the recommended change

## Prioritization
- **Critical**: Bugs, security issues, broken builds — must fix before landing
- **Warning**: Logic errors, missing edge cases, accessibility violations — should fix
- **Suggestion**: Style improvements, naming, minor refactors — nice to have
