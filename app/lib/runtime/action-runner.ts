import { WebContainer } from '@webcontainer/api';
import { map, type MapStore } from 'nanostores';
import type { BoltAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();

  actions: ActionsMap = map({});

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isLatest = true) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return;
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: true });

    if (data.action.type === 'shell' && !isLatest) {
      this.#updateAction(actionId, { status: 'complete' });
      return;
    }

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });
  }

  async #executeAction(actionId: string) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
      }

      this.#updateAction(actionId, { status: action.abortSignal.aborted ? 'aborted' : 'complete' });
    } catch (error) {
      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    const webcontainer = await this.#webcontainer;

    // optimize common package manager commands to use pnpm for speed and efficiency in WebContainer
    let command = action.content;

    if (command.includes('npm install') || command.includes('npm i ') || command === 'npm i') {
      command = command.replace(/\bnpm (install|i)\b/g, 'pnpm install');
    } else if (command.includes('npm run ')) {
      command = command.replace(/\bnpm run\b/g, 'pnpm run');
    } else if (command.includes('npx ')) {
      command = command.replace(/\bnpx\b/g, 'pnpm dlx');
    } else if (command.includes('npm create ')) {
      command = command.replace(/\bnpm create\b/g, 'pnpm create');
    }

    const process = await webcontainer.spawn('jsh', ['-c', command], {
      env: {
        npm_config_yes: 'true',
        npm_config_prefer_offline: 'true',
        npm_config_audit: 'false',
        npm_config_fund: 'false',
        npm_config_progress: 'false',
        npm_config_loglevel: 'error',
      },
    });

    action.abortSignal.addEventListener('abort', () => {
      process.kill();
    });

    process.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      }),
    );

    const exitCode = await process.exit;

    logger.debug(`Process terminated with code ${exitCode}`);
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await this.#webcontainer;

    let folder = dirname(action.filePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
        throw error;
      }
    }

    try {
      const formattedContent = await formatFileContent(action.filePath, action.content);
      await webcontainer.fs.writeFile(action.filePath, formattedContent);
      logger.debug(`File written ${action.filePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
      throw error;
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }
}

function dirname(path: string): string {
  const lastSlash = path.lastIndexOf('/');

  if (lastSlash === -1) {
    return '.';
  }

  if (lastSlash === 0) {
    return '/';
  }

  return path.slice(0, lastSlash);
}

/**
 * Detects the prettier parser to use based on the file extension.
 * Returns null for unsupported file types.
 */
function getPrettierParser(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'css':
    case 'scss':
    case 'less':
      return 'css';
    case 'html':
    case 'htm':
      return 'html';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'babel';
    case 'jsx':
      return 'babel';
    case 'ts':
    case 'mts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'json':
    case 'jsonc':
      return 'json';
    default:
      return null;
  }
}

/**
 * Formats file content using Prettier's standalone browser bundle.
 * Falls back to the original content if formatting fails or the file type is unsupported.
 */
async function formatFileContent(filePath: string, content: string): Promise<string> {
  const parser = getPrettierParser(filePath);

  if (!parser) {
    return content;
  }

  try {
    const [{ format }, plugins] = await Promise.all([
      import('prettier/standalone'),
      loadPrettierPlugins(parser),
    ]);

    const formatted = await format(content, {
      parser,
      plugins,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
    });

    return formatted;
  } catch (error) {
    logger.debug(`Prettier formatting skipped for ${filePath}:`, error);
    return content;
  }
}

/**
 * Dynamically loads the minimal set of Prettier plugins needed for the given parser.
 */
async function loadPrettierPlugins(parser: string): Promise<any[]> {
  switch (parser) {
    case 'css': {
      const plugin = await import('prettier/plugins/postcss');
      return [plugin];
    }
    case 'html': {
      const plugin = await import('prettier/plugins/html');
      return [plugin];
    }
    case 'babel':
    case 'json': {
      const [babel, estree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ]);
      return [babel, estree];
    }
    case 'typescript': {
      const [typescript, estree] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ]);
      return [typescript, estree];
    }
    default:
      return [];
  }
}
