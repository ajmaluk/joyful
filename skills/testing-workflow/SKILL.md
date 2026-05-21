# Testing Workflow

Maintain the smallest meaningful verification path that catches regressions: build, lint, type-check, and user-flow tests that actually fail when something breaks.

## When to invoke
- After making any code change
- When asked to "run tests", "verify this works", or "check for regressions"
- Before committing or creating a PR
- When adding or modifying a feature that affects behavior

## Workflow

### 1. Discover the Test Setup
Before running anything, identify:
- **Test framework**: Jest, Vitest, Playwright, Cypress, Testing Library?
- **Test location**: `__tests__/`, `*.test.*`, `*.spec.*`, `tests/`?
- **Test scripts**: Check `package.json` scripts (`test`, `test:unit`, `test:e2e`, `lint`, `typecheck`)
- **CI configuration**: What does CI run? (`.github/workflows/`, `.gitlab-ci.yml`)

### 2. Run the Verification Path
Execute checks in order of speed and importance:

```
1. Type check    — catches type errors instantly
2. Lint          — catches style and potential bugs
3. Build         — confirms the code compiles
4. Unit tests    — fast, isolated logic verification
5. Integration   — component/API interaction tests
6. E2E tests     — full user flow verification
```

Stop at the first failure and fix it before proceeding.

### 3. Changed-File Test Selection
Run only the tests affected by your changes:
- **Unit**: Tests in the same directory as changed files
- **Integration**: Tests that import changed modules
- **E2E**: Tests that cover the affected user flow
- Use test framework watch mode or `--findRelatedTests` when available

### 4. User-Flow Verification
For changes that affect user behavior:
- Identify the user flow that the change impacts
- Verify the flow works end-to-end (manually or via E2E test)
- Check happy path, error path, and edge cases
- Verify the flow on mobile viewport if UI is affected

### 5. Test Quality Checks
When adding or modifying tests:
- **Assertions**: Tests should assert something that can actually fail
- **Coverage**: Tests should cover the changed behavior, not just lines
- **Isolation**: Tests should not depend on each other or external state
- **Determinism**: Tests should pass consistently, not flake
- **Readability**: Tests should document expected behavior

### 6. Preserve Existing Tests
- Never delete a test without understanding why it exists
- If a test breaks due to your change, update it to match the new behavior
- If a test is truly obsolete, document why before removing it
- Add a test for any new behavior that doesn't already have one

## Test Strategy by Change Type

### Bug Fix
1. Write a test that reproduces the bug (should fail)
2. Fix the bug
3. Verify the test passes
4. Run the full test suite to ensure no regressions

### New Feature
1. Write tests for the expected behavior (TDD if possible)
2. Implement the feature
3. Verify all tests pass
4. Add edge case tests (empty state, error state, boundary conditions)

### Refactoring
1. Run existing tests to establish baseline (all should pass)
2. Make the refactoring
3. Run the same tests (all should still pass)
4. If behavior changed intentionally, update tests to match

### UI Change
1. Run component/unit tests
2. Run visual regression tests (if available)
3. Manually verify the UI at multiple viewports
4. Run E2E tests for affected user flows

## Checklist
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Changed-file tests pass
- [ ] User flow verified (manual or E2E)
- [ ] New behavior has test coverage
- [ ] No existing tests broken without reason
- [ ] Tests assert something that can actually fail

## Rules
- Run the fastest checks first (types, lint) before slower ones (tests, E2E)
- Test the behavior, not the implementation
- A test that can't fail is not a test
- If it's not tested, it's not guaranteed to work
