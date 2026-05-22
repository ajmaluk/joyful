// ── Engine: Modular Agentic AI Development Core ────────────────────
//
// The engine replaces the old monolithic services with a modular,
// validated, agent-driven architecture.
//
// Migration path:
//   1. New code imports from /src/engine/*
//   2. Old services are refactored to delegate to engine modules
//   3. Old code removed once migration is complete

// Types
export type * from './types';

// File System
export {
  normalizePath,
  getDirectory,
  getFileName,
  getExtension,
  validateFilePath,
  validateFileOperation,
  applyFileOperations,
  buildFileTree,
  detectDuplicateFiles,
  describeFileOperations,
} from './fileSystem';
export type {
  PathValidationResult,
  ApplyResult,
  ApplyOperationResult,
  ApplyError,
  VirtualFileEntry,
  FileTreeNode,
  DuplicateInfo,
} from './fileSystem';

// Scanner
export {
  scanProject,
  buildRecentChanges,
  readFileChunk,
  getRelevantChunks,
  buildProjectTree,
} from './scanner';
export type { ScanResult } from './scanner';

// Context
export {
  buildAgentContext,
  selectRelevantFiles,
  formatFileContentsForPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from './context';
export type { ContextOptions } from './context';

// Tasks
export { TaskManager, resetTaskCounter } from './tasks';

// Memory
export {
  SessionMemory,
  ProjectMemory,
  InMemoryProjectStorage,
  LocalStorageProjectStorage,
} from './memory';
export type {
  MemoryEntry,
  MemoryType,
  ProjectMemoryData,
  DecisionRecord,
  ErrorRecord,
  ProjectMemoryStorage,
} from './memory';

// Model
export {
  registerProvider,
  getProvider,
  getAvailableProviders,
  createOpenAICompatibleProvider,
  createNoOpProvider,
  parseAgentResponse,
} from './model';
export type {
  ModelRequest,
  ModelTool,
  ModelResult,
  ModelToolCall,
  ModelProvider,
  ModelStreamChunk,
  OpenAICompatibleConfig,
  OpenAIClient,
} from './model';

// Agent
export { Agent } from './agent';
export type { AgentOptions } from './agent';

// Sandbox
export { MockSandbox, createSandbox, createBuilderOutput } from './sandbox';
export type { SandboxConfig, SandboxProvider, SandboxResult } from './sandbox';

// Prompts
export { getSystemPrompt, PROMPTS } from './prompts';

// Storage
export { StorageManager, storageManager, IndexedDbAdapter, runMigrations, createOpfsAdapter } from './storage';
export type {
  StorageAdapter,
  StorageQuota,
  ProjectRecord,
  ChatRecord,
  GenerationStateRecord,
  UserSkillRecord,
  StorageEventType,
} from './storage';

// Errors
export { ErrorCollector, errorCollector } from './errors';
export type { EnrichedError, SourceLocation } from './errors';

// Safety
export { SafetyMonitor, StaleReadDetector, ErrorTracker, RateLimiter } from './safety';
