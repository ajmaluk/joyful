# File Context Graph

Intelligently determine which files to read, modify, and verify before making changes, minimizing blast radius while ensuring completeness.

## When to invoke
- Before making any code changes
- When asked to "find the right file", "where is X implemented", or "what needs to change"
- When working on maintenance tasks, bug fixes, or feature additions
- When navigating an unfamiliar codebase

## Workflow

### 1. Identify the Entry Point
Determine where the change originates:
- **UI change**: Start from the component file or page route
- **API change**: Start from the route handler or controller
- **Logic change**: Start from the function or module name
- **Config change**: Start from the relevant config file

Use these signals to find the entry point:
- File path patterns (e.g., `src/pages/`, `src/components/`, `api/`)
- Route definitions or URL patterns
- Import chains from known entry points
- Test files that reference the target behavior

### 2. Build the Dependency Graph
From the entry point, trace:
- **Imports**: What does this file depend on? (read those files)
- **Importers**: What files import this one? (check for breakage)
- **Exports**: What does this file expose? (understand the public API)
- **Side effects**: What happens when this file loads? (initialization, registration)

### 3. Rank Files by Relevance
Score each candidate file on:
- **Direct relevance** (10): The file that must be changed
- **Import dependency** (8): Files this file imports that affect the change
- **Imported by** (7): Files that import this one and may break
- **Shared utilities** (5): Common helpers used by changed code
- **Styling source** (6): CSS/theme files that affect the changed component
- **Test files** (4): Tests that verify the changed behavior
- **Documentation** (2): Docs that describe the changed behavior

### 4. Read the Minimal Sufficient Set
- Read files in order of relevance score (highest first)
- Stop reading when you have enough context to make the change confidently
- For simple changes: 1-3 files is usually enough
- For complex changes: 5-10 files may be needed

### 5. Determine the Edit Set
- **Direct edits**: Files that must be modified
- **New files**: Files that need to be created
- **No edits but must read**: Files needed for context only
- **Tests to update**: Test files that verify changed behavior

### 6. Verify Impact
After making changes:
- Check that all importers still compile
- Verify that dependent tests still pass
- Confirm that no circular dependencies were introduced
- Ensure the change doesn't break the public API

## Strategies by Task Type

### Bug Fix
1. Start from the error message or symptom
2. Trace to the failing function or component
3. Read the function and its immediate dependencies
4. Identify the root cause, not just the symptom
5. Edit the smallest set of files that fixes the root cause

### Feature Addition
1. Start from the user-facing entry point (route, component, API endpoint)
2. Read the existing pattern for similar features
3. Identify where the new code fits in the existing structure
4. Read related utilities and shared logic
5. Create or modify the minimal set of files

### Refactoring
1. Read the code to be refactored fully
2. Read all importers to understand usage patterns
3. Read tests to understand expected behavior
4. Plan the refactoring to maintain the public API
5. Update tests if the internal behavior changes

### Maintenance / Cleanup
1. Identify the target (deprecated code, unused imports, dead code)
2. Verify it's truly unused (search for references)
3. Check that removing it won't break anything
4. Remove the code and update any affected files

## Rules
- Read before you write — never edit a file you haven't read
- Prefer editing existing files over creating new ones
- Prefer the smallest useful change over a comprehensive rewrite
- When in doubt, read one more file rather than guess
