import { virtualFS } from '@/lib/vfs/VirtualFileSystem';

export interface BuildError {
  type: 'build_error' | 'syntax_error' | 'type_error' | 'missing_import' | 'runtime_error' | 'lint_error' | 'css_error' | 'blank_preview' | 'unknown';
  file: string;
  line: number;
  column: number;
  message: string;
  code?: string;
  likelyCause?: string;
  recommendedNextTool?: string;
  recommendedQuery?: string;
}

interface CompileResult {
  success: boolean;
  code?: string;
  errors: string[];
  warnings: string[];
}

interface ConsoleCapture {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  count?: number;
}

const IMPORT_ERROR_RE = /Cannot find module ['"]([^'"]+)['"]/;
const IMPORT_ERROR_ALT = /Module not found: Error: Can't resolve ['"]([^'"]+)['"]/;
const SYNTAX_ERROR_RE = /(?:Syntax|Parse|Unexpected token)\s+error/i;
const TYPE_ERROR_RE = /Type ['"]([^'"]+)['"] is not assignable/i;
const MISSING_NAME_RE = /Cannot find name ['"]([^'"]+)['"]/;
const MISSING_PROP_RE = /Property ['"]([^'"]+)['"] does not exist/i;
const DUPLICATE_RE = /Duplicate identifier ['"]([^'"]+)['"]/;
const JSX_RE = /Cannot use JSX/i;
const SEMICOLON_RE = /Expected ['";]'/;
const CSS_ERROR_RE = /CSS|style|stylesheet/i;
const UNTERMINATED_STRING = /Unterminated string/i;
const MISSING_INITIALIZER = /has no initializer/i;

const ERROR_TO_TYPE: [RegExp, BuildError['type']][] = [
  [IMPORT_ERROR_RE, 'missing_import'],
  [IMPORT_ERROR_ALT, 'missing_import'],
  [SYNTAX_ERROR_RE, 'syntax_error'],
  [UNTERMINATED_STRING, 'syntax_error'],
  [SEMICOLON_RE, 'syntax_error'],
  [TYPE_ERROR_RE, 'type_error'],
  [MISSING_NAME_RE, 'type_error'],
  [MISSING_PROP_RE, 'type_error'],
  [DUPLICATE_RE, 'type_error'],
  [MISSING_INITIALIZER, 'type_error'],
  [CSS_ERROR_RE, 'css_error'],
];

const ERROR_LIKELY_CAUSE: [RegExp, string][] = [
  [IMPORT_ERROR_RE, 'The import path does not exist or the module is not installed'],
  [IMPORT_ERROR_ALT, 'The import could not be resolved'],
  [MISSING_NAME_RE, 'The variable, type, or function is not defined in this scope'],
  [MISSING_PROP_RE, 'The property does not exist on the object type'],
  [TYPE_ERROR_RE, 'Type mismatch between expected and actual types'],
  [DUPLICATE_RE, 'A variable or type with the same name already exists'],
  [JSX_RE, 'JSX files must use .tsx or .jsx extension'],
  [SEMICOLON_RE, 'A statement is missing its terminator'],
  [UNTERMINATED_STRING, 'A string literal is missing its closing quote'],
  [MISSING_INITIALIZER, 'A variable declaration is missing its initializer'],
];

const ERROR_TO_TOOL: [RegExp, string][] = [
  [IMPORT_ERROR_RE, 'search_files'],
  [IMPORT_ERROR_ALT, 'search_files'],
  [TYPE_ERROR_RE, 'read_file'],
  [SYNTAX_ERROR_RE, 'read_file'],
  [MISSING_NAME_RE, 'read_file'],
  [DUPLICATE_RE, 'search_files'],
];

export class EnhancedErrorCollector {
  collectFromCompileResult(result: CompileResult): BuildError[] {
    const errors: BuildError[] = [];
    const dedup = new Set<string>();

    for (const errorStr of result.errors) {
      const parsed = this.parseErrorLine(errorStr);
      if (parsed) {
        const key = `${parsed.file}:${parsed.line}:${parsed.message.slice(0, 80)}`;
        if (dedup.has(key)) continue;
        dedup.add(key);

        const code = parsed.file ? this.extractCodeLine(parsed.file, parsed.line).slice(0, 200) : undefined;

        errors.push({
          type: parsed.type,
          file: parsed.file,
          line: parsed.line,
          column: parsed.column,
          message: parsed.message,
          code,
          likelyCause: this.getLikelyCause(parsed.message),
          recommendedNextTool: this.getRecommendedTool(parsed.message),
          recommendedQuery: this.getRecommendedQuery(parsed.message, parsed.file),
        });
      }
    }

    return errors;
  }

  collectFromConsoleMessages(messages: ConsoleCapture[]): BuildError[] {
    const errors: BuildError[] = [];
    const dedup = new Set<string>();

    for (const msg of messages) {
      if (msg.level !== 'error') continue;

      const key = msg.message.slice(0, 120);
      if (dedup.has(key)) continue;
      dedup.add(key);

      // Try to extract file and line from console error patterns
      const fileMatch = msg.message.match(/(?:at\s+)?(\S+\.(?:tsx?|jsx?))[:(](\d+)[(:](\d+)/);
      const file = fileMatch?.[1] || 'console';
      const line = fileMatch ? parseInt(fileMatch[2], 10) : 0;
      const column = fileMatch ? parseInt(fileMatch[3], 10) : 0;

      const lower = msg.message.toLowerCase();
      let type: BuildError['type'] = 'runtime_error';

      if (lower.includes('cannot find') || lower.includes('module not found')) {
        type = 'missing_import';
      } else if (lower.includes('type') && (lower.includes('not assignable') || lower.includes('not exist'))) {
        type = 'type_error';
      } else if (lower.includes('syntax') || lower.includes('unexpected')) {
        type = 'syntax_error';
      } else if (lower.includes('blank') || lower.includes('empty') || lower.includes('nothing')) {
        type = 'blank_preview';
      }

      errors.push({
        type,
        file,
        line,
        column,
        message: msg.message,
        likelyCause: this.getLikelyCause(msg.message),
        recommendedNextTool: 'read_file',
        recommendedQuery: file !== 'console' ? file : undefined,
      });
    }

    return errors;
  }

  groupByRootCause(errors: BuildError[]): { rootCause: string; errors: BuildError[]; count: number }[] {
    const groups = new Map<string, BuildError[]>();

    for (const err of errors) {
      const fileName = err.file.split('/').pop() || err.file;
      let key: string;

      if (err.type === 'missing_import') {
        const importMatch = err.message.match(IMPORT_ERROR_RE) || err.message.match(IMPORT_ERROR_ALT);
        const moduleName = importMatch?.[1] || 'unknown';
        key = `Missing import: ${moduleName}`;
      } else if (err.type === 'syntax_error') {
        key = `Syntax error in ${fileName}`;
      } else if (err.type === 'type_error') {
        key = `Type error in ${fileName}`;
      } else {
        key = `${err.type}: ${fileName}`;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(err);
    }

    return Array.from(groups.entries())
      .map(([rootCause, errorList]) => ({
        rootCause,
        errors: errorList,
        count: errorList.length,
      }))
      .sort((a, b) => b.count - a.count);
  }

  formatForPrompt(errors: BuildError[]): string {
    if (errors.length === 0) return 'No errors.';

    const parts: string[] = [];
    const grouped = this.groupByRootCause(errors);

    parts.push(`Found ${errors.length} error(s) across ${grouped.length} root cause(s):`);
    parts.push('');

    for (const group of grouped) {
      parts.push(`  🔴 ${group.rootCause} (${group.count} error(s))`);
      for (const err of group.errors) {
        parts.push(`    📁 ${err.file}:${err.line}:${err.column}`);
        parts.push(`      ${err.message.slice(0, 200)}`);
        if (err.code) {
          parts.push(`      Code: ${err.code}`);
        }
        if (err.likelyCause) {
          parts.push(`      💡 ${err.likelyCause}`);
        }
      }
      parts.push('');
    }

    if (errors.length > 0) {
      const first = errors[0];
      if (first.recommendedNextTool) {
        parts.push(`Recommended action: ${first.recommendedNextTool}`);
        if (first.recommendedQuery) {
          parts.push(`Recommended query: ${first.recommendedQuery}`);
        }
      }
    }

    return parts.join('\n');
  }

  async getCodeContext(path: string, line: number, contextLines = 5): Promise<string> {
    try {
      const content = await virtualFS.readFile(path);
      const lines = content.split('\n');
      const start = Math.max(0, line - 1 - contextLines);
      const end = Math.min(lines.length, line + contextLines);

      const context: string[] = [];
      for (let i = start; i < end; i++) {
        const prefix = i === line - 1 ? '>' : ' ';
        const lineNum = String(i + 1).padStart(4, ' ');
        context.push(`${prefix} ${lineNum}│ ${lines[i]}`);
      }

      return context.join('\n');
    } catch {
      return `(could not read file: ${path})`;
    }
  }

  private parseErrorLine(errorStr: string): { file: string; line: number; column: number; message: string; type: BuildError['type'] } | null {
    // Try to extract location from esbuild's error format
    const esbuildMatch = errorStr.match(/^(✘|ERROR|error):\s*(\[[^:]+:\d+:\d+\]|[^:]+:\d+:\d+|[^:]+)/);
    if (esbuildMatch) {
      const rest = errorStr.slice(esbuildMatch[0].length).trim();
      const locStr = esbuildMatch[2].replace(/[[\]']/g, '');
      const locParts = locStr.split(':');
      if (locParts.length >= 3) {
        const file = locParts[0];
        const line = parseInt(locParts[1], 10) || 0;
        const column = parseInt(locParts[2], 10) || 0;
        const type = this.categorizeError(rest);
        return { file, line, column, message: rest, type };
      }
    }

    // Try generic file:line:column pattern
    const fileMatch = errorStr.match(/(\S+?\.(?:tsx?|jsx?|css|json))[:(](\d+)[,:](\d+)/);
    if (fileMatch) {
      const file = fileMatch[1];
      const line = parseInt(fileMatch[2], 10) || 0;
      const column = parseInt(fileMatch[3], 10) || 0;
      const type = this.categorizeError(errorStr);
      return { file, line, column, message: errorStr, type };
    }

    // Fallback: unknown format, categorize by content
    const type = this.categorizeError(errorStr);
    return { file: '', line: 0, column: 0, message: errorStr, type };
  }

  private categorizeError(message: string): BuildError['type'] {
    const lower = message.toLowerCase();

    for (const [re, type] of ERROR_TO_TYPE) {
      if (re.test(message)) return type;
    }

    if (IMPORT_ERROR_RE.test(message) || IMPORT_ERROR_ALT.test(message)) return 'missing_import';
    if (MISSING_NAME_RE.test(message)) return 'type_error';
    if (MISSING_PROP_RE.test(message)) return 'type_error';
    if (DUPLICATE_RE.test(message)) return 'type_error';
    if (UNTERMINATED_STRING.test(lower)) return 'syntax_error';
    if (MISSING_INITIALIZER.test(lower)) return 'type_error';
    if (/^\[\w+\]/i.test(message)) return 'lint_error';
    if (CSS_ERROR_RE.test(lower)) return 'css_error';

    return 'build_error';
  }

  private getLikelyCause(message: string): string | undefined {
    for (const [re, cause] of ERROR_LIKELY_CAUSE) {
      if (re.test(message)) return cause;
    }

    const importMatch = message.match(IMPORT_ERROR_RE) || message.match(IMPORT_ERROR_ALT);
    if (importMatch) {
      return `Module "${importMatch[1]}" is not available. Check that the import path is correct.`;
    }

    return undefined;
  }

  private getRecommendedTool(message: string): string | undefined {
    for (const [re, tool] of ERROR_TO_TOOL) {
      if (re.test(message)) return tool;
    }
    return 'read_file';
  }

  private getRecommendedQuery(message: string, file?: string): string | undefined {
    const importMatch = message.match(IMPORT_ERROR_RE) || message.match(IMPORT_ERROR_ALT);
    if (importMatch) {
      return importMatch[1];
    }

    const nameMatch = message.match(MISSING_NAME_RE);
    if (nameMatch) {
      return nameMatch[1];
    }

    const propMatch = message.match(MISSING_PROP_RE);
    if (propMatch) {
      return propMatch[1];
    }

    return file || undefined;
  }

  private extractCodeLine(file: string, line: number): string {
    // This will be populated at format time if file is available
    if (!file || line <= 0) return '';
    return ''; // Placeholder — actual context loaded by getCodeContext
  }
}

export const enhancedErrorCollector = new EnhancedErrorCollector();
