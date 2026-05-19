export interface Action {
  id: string;
  type: 'create' | 'modify' | 'delete';
  path: string;
  description: string;
  timestamp: string;
}

export function buildActionsFromFiles(
  files: { path: string; action?: string }[],
  existingFiles: { path: string }[],
  options: { idPrefix?: string; timestamp?: string } = {}
): Action[] {
  return files.map((file, index) => {
    const action = file.action || (existingFiles.some(f => f.path === file.path) ? 'modify' : 'create');
    const descriptions: Record<string, string> = {
      create: `Created ${file.path}`,
      modify: `Modified ${file.path}`,
      delete: `Deleted ${file.path}`,
    };
    return {
      id: `${options.idPrefix || 'action'}_${file.path}_${action}_${index}`,
      type: action as 'create' | 'modify' | 'delete',
      path: file.path,
      description: descriptions[action] || `Updated ${file.path}`,
      timestamp: options.timestamp || new Date().toISOString(),
    };
  });
}
