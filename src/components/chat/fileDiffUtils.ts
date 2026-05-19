interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNum: number;
}

export interface FileDiff {
  path: string;
  action: 'create' | 'modify' | 'delete';
  oldContent?: string;
  newContent?: string;
  lines: DiffLine[];
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const lines: DiffLine[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined) {
      lines.push({ type: 'added', content: newLine, lineNum: i + 1 });
    } else if (newLine === undefined) {
      lines.push({ type: 'removed', content: oldLine, lineNum: i + 1 });
    } else if (oldLine !== newLine) {
      lines.push({ type: 'removed', content: oldLine, lineNum: i + 1 });
      lines.push({ type: 'added', content: newLine, lineNum: i + 1 });
    } else {
      lines.push({ type: 'unchanged', content: oldLine, lineNum: i + 1 });
    }
  }

  return lines;
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

    return {
      path: file.path,
      action: action as 'create' | 'modify' | 'delete',
      oldContent,
      newContent,
      lines: action === 'create'
        ? newContent.split('\n').map((line, i) => ({ type: 'added' as const, content: line, lineNum: i + 1 }))
        : computeDiff(oldContent, newContent),
    };
  });
}
