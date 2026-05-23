export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. Use this before editing any file. For large files, use start_line and end_line to read specific sections only.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path like /src/App.tsx' },
        start_line: { type: 'number', description: 'First line to read (1-indexed, optional)' },
        end_line: { type: 'number', description: 'Last line to read (optional)' },
      },
      required: ['path'],
    },
  },
  {
    name: 'read_file_chunk',
    description: 'Read a specific range of lines from a file. Use for large files instead of read_file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path' },
        start_line: { type: 'number', description: 'First line (1-indexed)' },
        end_line: { type: 'number', description: 'Last line (inclusive)' },
      },
      required: ['path', 'start_line', 'end_line'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a path. Use to explore the project structure.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path like / or /src' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_project_tree',
    description: 'Get the full project tree structure.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Root path (default: /)' },
      },
      required: [],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by filename pattern across the project.',
    input_schema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern like *.tsx or *test*' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'search_content',
    description: 'Search file contents across all project files.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search for' },
        file_pattern: { type: 'string', description: 'Optional glob pattern like *.tsx' },
      },
      required: ['query'],
    },
  },
  {
    name: 'write_file',
    description: 'Create a new file or completely overwrite an existing file. Parent directories are created automatically. Use for new files or complete rewrites.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path like /src/components/Button.tsx' },
        content: { type: 'string', description: 'Complete file content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Make a surgical edit to a specific part of an existing file. ALWAYS prefer this over write_file when modifying existing files. Provide the exact text to find and the replacement.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        old_text: { type: 'string', description: 'Exact text to find (must match exactly, including whitespace)' },
        new_text: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    name: 'patch_file',
    description: 'Alias for edit_file - make a surgical edit to a specific part of an existing file.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file' },
        old_text: { type: 'string', description: 'Exact text to find' },
        new_text: { type: 'string', description: 'Replacement text' },
      },
      required: ['path', 'old_text', 'new_text'],
    },
  },
  {
    name: 'create_file',
    description: 'Create a new file. Fails if the file already exists. Use write_file for overwriting existing files.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'create_directory',
    description: 'Create a directory and all parent directories needed.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path like /src/components' },
      },
      required: ['path'],
    },
  },
  {
    name: 'delete_file',
    description: 'Delete a file. Use with caution.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
      },
      required: ['path'],
    },
  },
  {
    name: 'rename_file',
    description: 'Rename/move a file from old_path to new_path.',
    input_schema: {
      type: 'object',
      properties: {
        old_path: { type: 'string', description: 'Current path' },
        new_path: { type: 'string', description: 'New path' },
      },
      required: ['old_path', 'new_path'],
    },
  },
  {
    name: 'compile_and_preview',
    description: 'Compile the current project and update the browser preview. Call after making code changes to verify.',
    input_schema: {
      type: 'object',
      properties: {
        entry_point: { type: 'string', description: 'Entry file, default is /src/main.tsx' },
      },
      required: [],
    },
  },
  {
    name: 'update_todos',
    description: 'Update the task list. Call this after completing each task and before starting the next.',
    input_schema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              task: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'blocked'] },
              notes: { type: 'string' },
            },
            required: ['id', 'task', 'status'],
          },
        },
      },
      required: ['todos'],
    },
  },
  {
    name: 'save_memory',
    description: 'Save a memory/note about a decision or lesson learned during this session.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Memory content/note to save' },
      },
      required: ['content'],
    },
  },
  {
    name: 'write_message',
    description: 'Write a status message visible to the user. Use to report progress, explain decisions, or ask questions.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to show to the user' },
      },
      required: ['message'],
    },
  },
];
