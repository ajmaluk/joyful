import { virtualFS } from '@/lib/vfs/VirtualFileSystem';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  length: number;
  lineText: string;
  contextBefore: string[];
  contextAfter: string[];
}

export interface EnrichedError {
  text: string;
  raw: string;
  location: SourceLocation | null;
  suggestion: string | null;
}

const SUGGESTIONS: Record<string, string> = {
  "Cannot find name": "Check that the variable/type is imported or declared. Add the missing import.",
  "Cannot find module": "Ensure the import path is correct and the file exists. For npm packages, use the import name (resolved via esm.sh).",
  "Property '.*' does not exist": "The property isn't declared on the type. Add it to the type definition or check for typos.",
  "Type '.*' is not assignable": "The value's type doesn't match the expected type. Cast or fix the type mismatch.",
  "Cannot use JSX syntax": "Files with JSX must use .tsx or .jsx extension.",
  "Expected ';'": "Missing semicolon or statement terminator.",
  "Unexpected token": "Syntax error — check for unmatched brackets, missing commas, or invalid syntax nearby.",
  "Module not found": "The import path doesn't resolve to any file. Check the path and file extension.",
  "Duplicate identifier": "A name is declared twice. Remove or rename the duplicate.",
  "is declared but its value is never read": "Consider removing the unused variable or prefix with _ to suppress warnings.",
  "is declared but never used": "Unused variable — remove it or prefix with _.",
};

function matchSuggestion(errorText: string): string | null {
  for (const [pattern, suggestion] of Object.entries(SUGGESTIONS)) {
    const dynamic = new RegExp(pattern.replace(/'.*?'/g, "'.+'"));
    if (dynamic.test(errorText)) {
      return suggestion;
    }
  }
  return null;
}

export class ErrorCollector {
  private seen = new Set<string>();

  async enrichError(
    raw: string,
    file?: string,
    line?: number,
    column?: number,
  ): Promise<EnrichedError> {
    const dedupKey = `${file ?? ''}:${line ?? 0}:${raw}`;
    if (this.seen.has(dedupKey)) {
      return {
        text: raw,
        raw,
        location: null,
        suggestion: null,
      };
    }
    this.seen.add(dedupKey);

    let location: SourceLocation | null = null;

    if (file && line) {
      location = await this.extractSourceContext(file, line, column ?? 0);
    }

    return {
      text: raw,
      raw,
      location,
      suggestion: matchSuggestion(raw),
    };
  }

  async formatCompileErrors(
    esbuildErrors: Array<{ text: string; location?: { file?: string; line?: number; column?: number; length?: number } | null }>,
  ): Promise<string[]> {
    const formatted: string[] = [];

    for (const err of esbuildErrors) {
      const enriched = await this.enrichError(
        err.text,
        err.location?.file,
        err.location?.line,
        err.location?.column,
      );

      const parts: string[] = [];

      if (enriched.location) {
        const loc = enriched.location;
        parts.push(`📁 ${loc.file}:${loc.line}:${loc.column}`);
        parts.push(`\n  ${enriched.text}`);

        parts.push(`\n  ${loc.line} │ ${loc.lineText}`);
        if (loc.column > 0) {
          parts.push(`  ${' '.repeat(String(loc.line).length)} │ ${' '.repeat(loc.column)}^`);
        }

        if (loc.contextBefore.length > 0) {
          for (const ctx of loc.contextBefore) {
            parts.push(`  … │ ${ctx}`);
          }
        }
        if (loc.contextAfter.length > 0) {
          for (const ctx of loc.contextAfter) {
            parts.push(`  … │ ${ctx}`);
          }
        }
      } else {
        parts.push(enriched.text);
      }

      if (enriched.suggestion) {
        parts.push(`\n  💡 ${enriched.suggestion}`);
      }

      formatted.push(parts.join(''));
    }

    return formatted;
  }

  private async extractSourceContext(
    file: string,
    line: number,
    column: number,
  ): Promise<SourceLocation | null> {
    try {
      const content = await virtualFS.readFile(file);
      const lines = content.split('\n');

      if (line < 1 || line > lines.length) return null;

      const lineIndex = line - 1;
      const lineText = lines[lineIndex];

      const contextBefore = lines.slice(Math.max(0, lineIndex - 3), lineIndex).map(l => l.trimEnd());
      const contextAfter = lines.slice(lineIndex + 1, lineIndex + 4).map(l => l.trimEnd());

      let length = 1;
      if (lineText.length > column) {
        const rest = lineText.slice(column);
        const identMatch = rest.match(/^[a-zA-Z0-9_$]+/);
        if (identMatch) length = identMatch[0].length;
      }

      return {
        file,
        line,
        column,
        length,
        lineText,
        contextBefore,
        contextAfter,
      };
    } catch (err) {
      if (err instanceof Error && !err.message.includes('NOT_FOUND')) {
        console.warn(`ErrorCollector: failed to read ${file} for source context:`, err);
      }
      return null;
    }
  }

  reset(): void {
    this.seen.clear();
  }
}

export const errorCollector = new ErrorCollector();
