interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNum: number;
  oldLineNum?: number;
}

export interface FileDiff {
  path: string;
  action: 'create' | 'modify' | 'delete';
  oldContent?: string;
  newContent?: string;
  lines: DiffLine[];
  stats: { added: number; removed: number; unchanged: number };
}

/**
 * Compute LCS (Longest Common Subsequence) table for proper diff algorithm.
 */
function computeLCSTable(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

/**
 * Backtrack through LCS table to produce diff lines.
 */
function backtrackLCS(
  dp: number[][],
  oldLines: string[],
  newLines: string[]
): DiffLine[] {
  let i = oldLines.length;
  let j = newLines.length;
  const result: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'unchanged', content: oldLines[i - 1], lineNum: j, oldLineNum: i });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', content: newLines[j - 1], lineNum: j });
      j--;
    } else if (i > 0) {
      result.push({ type: 'removed', content: oldLines[i - 1], lineNum: i, oldLineNum: i });
      i--;
    }
  }

  return result.reverse();
}

/**
 * Optimized diff for large files using a sliding window approach.
 */
function computeDiffOptimized(oldLines: string[], newLines: string[]): DiffLine[] {
  const lines: DiffLine[] = [];
  const windowSize = 10;
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      lines.push({ type: 'unchanged', content: oldLines[i], lineNum: j + 1, oldLineNum: i + 1 });
      i++;
      j++;
    } else {
      let foundMatch = false;
      for (let lookAhead = 1; lookAhead <= windowSize; lookAhead++) {
        if (j + lookAhead < newLines.length && i < oldLines.length && oldLines[i] === newLines[j + lookAhead]) {
          for (let k = 0; k < lookAhead; k++) {
            lines.push({ type: 'added', content: newLines[j + k], lineNum: j + k + 1 });
          }
          j += lookAhead;
          foundMatch = true;
          break;
        }
        if (i + lookAhead < oldLines.length && j < newLines.length && oldLines[i + lookAhead] === newLines[j]) {
          for (let k = 0; k < lookAhead; k++) {
            lines.push({ type: 'removed', content: oldLines[i + k], lineNum: i + k + 1, oldLineNum: i + k + 1 });
          }
          i += lookAhead;
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) {
        if (i < oldLines.length) {
          lines.push({ type: 'removed', content: oldLines[i], lineNum: i + 1, oldLineNum: i + 1 });
          i++;
        }
        if (j < newLines.length) {
          lines.push({ type: 'added', content: newLines[j], lineNum: j + 1 });
          j++;
        }
      }
    }
  }

  return lines;
}

/**
 * Proper LCS-based diff computation.
 */
function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  if (!oldContent && newContent) {
    return newContent.split('\n').map((line, i) => ({ type: 'added' as const, content: line, lineNum: i + 1 }));
  }
  if (oldContent && !newContent) {
    return oldContent.split('\n').map((line, i) => ({ type: 'removed' as const, content: line, lineNum: i + 1, oldLineNum: i + 1 }));
  }
  if (!oldContent && !newContent) return [];

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  if (oldLines.length > 500 || newLines.length > 500) {
    return computeDiffOptimized(oldLines, newLines);
  }

  const dp = computeLCSTable(oldLines, newLines);
  return backtrackLCS(dp, oldLines, newLines);
}

function computeDiffStats(lines: DiffLine[]): { added: number; removed: number; unchanged: number } {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const line of lines) {
    if (line.type === 'added') added++;
    else if (line.type === 'removed') removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}

export function buildDiffsFromFiles(
  files: { path: string; content: string; action?: string }[],
  existingFiles: { path: string; content: string }[]
): FileDiff[] {
  return files.map(file => {
    const existing = existingFiles.find(f => f.path === file.path);
    const action = file.action || (existing ? 'modify' : 'create');
    const oldContent = existing?.content || '';
    const newContent = file.content;

    const lines = action === 'create'
      ? newContent.split('\n').map((line, i) => ({ type: 'added' as const, content: line, lineNum: i + 1 }))
      : action === 'delete'
        ? oldContent.split('\n').map((line, i) => ({ type: 'removed' as const, content: line, lineNum: i + 1, oldLineNum: i + 1 }))
        : computeDiff(oldContent, newContent);

    return {
      path: file.path,
      action: action as 'create' | 'modify' | 'delete',
      oldContent,
      newContent,
      lines,
      stats: computeDiffStats(lines),
    };
  });
}

/**
 * Generate a unified diff string (git-style) for export.
 */
export function toUnifiedDiff(diff: FileDiff): string {
  const lines: string[] = [];
  lines.push(`--- a/${diff.path}`);
  lines.push(`+++ b/${diff.path}`);

  let oldLine = 1;
  let newLine = 1;
  let hunk: string[] = [];
  let hunkOldStart = 0;
  let hunkNewStart = 0;
  let hunkOldCount = 0;
  let hunkNewCount = 0;

  const flushHunk = () => {
    if (hunk.length > 0) {
      lines.push(`@@ -${hunkOldStart},${hunkOldCount} +${hunkNewStart},${hunkNewCount} @@`);
      lines.push(...hunk);
      hunk = [];
      hunkOldCount = 0;
      hunkNewCount = 0;
    }
  };

  for (const line of diff.lines) {
    if (line.type === 'unchanged') {
      if (hunk.length > 0 && hunk.length >= 3) flushHunk();
      if (hunk.length === 0) {
        hunkOldStart = line.oldLineNum || oldLine;
        hunkNewStart = line.lineNum;
      }
      hunk.push(` ${line.content}`);
      hunkOldCount++;
      hunkNewCount++;
      oldLine++;
      newLine++;
    } else if (line.type === 'added') {
      if (hunk.length === 0) {
        hunkOldStart = oldLine;
        hunkNewStart = line.lineNum;
      }
      hunk.push(`+${line.content}`);
      hunkNewCount++;
      newLine++;
    } else {
      if (hunk.length === 0) {
        hunkOldStart = line.oldLineNum || oldLine;
        hunkNewStart = newLine;
      }
      hunk.push(`-${line.content}`);
      hunkOldCount++;
      oldLine++;
    }
  }

  flushHunk();
  return lines.join('\n');
}
