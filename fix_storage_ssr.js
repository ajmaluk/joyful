const fs = require('fs');
let code = fs.readFileSync('lib/services/storage.ts', 'utf8');

// safeSetItem
code = code.replace(
  'function safeSetItem(key: string, value: string): boolean {\n  try {',
  "function safeSetItem(key: string, value: string): boolean {\n  if (typeof window === 'undefined') return false;\n  try {"
);

// tryEvictOldest
code = code.replace(
  'function tryEvictOldest(excludeKey: string): void {\n  const chatKeys: string[] = [];',
  "function tryEvictOldest(excludeKey: string): void {\n  if (typeof window === 'undefined') return;\n  const chatKeys: string[] = [];"
);

// getProject
code = code.replace(
  'export function getProject(projectId: string): Project | null {\n  try {',
  "export function getProject(projectId: string): Project | null {\n  if (typeof window === 'undefined') return null;\n  try {"
);

// getChatHistory
code = code.replace(
  'export function getChatHistory(projectId: string): ChatMessage[] {\n  try {',
  "export function getChatHistory(projectId: string): ChatMessage[] {\n  if (typeof window === 'undefined') return [];\n  try {"
);

// getSavedGenerationState
code = code.replace(
  'export function getSavedGenerationState(projectId: string): SavedGenerationState | null {\n  try {',
  "export function getSavedGenerationState(projectId: string): SavedGenerationState | null {\n  if (typeof window === 'undefined') return null;\n  try {"
);

// clearGenerationState
code = code.replace(
  'export function clearGenerationState(projectId: string): void {\n  localStorage.removeItem',
  "export function clearGenerationState(projectId: string): void {\n  if (typeof window === 'undefined') return;\n  localStorage.removeItem"
);

// getSettings
code = code.replace(
  '  try {\n    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);',
  "  if (typeof window === 'undefined') return defaults;\n  try {\n    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);"
);

// getUserSkills
code = code.replace(
  'export function getUserSkills(): UserSkill[] {\n  try {',
  "export function getUserSkills(): UserSkill[] {\n  if (typeof window === 'undefined') return [];\n  try {"
);

// isAuthenticated
code = code.replace(
  'export function isAuthenticated(): boolean {\n  return localStorage.getItem',
  "export function isAuthenticated(): boolean {\n  if (typeof window === 'undefined') return false;\n  return localStorage.getItem"
);

// deleteProject
code = code.replace(
  'export function deleteProject(projectId: string): void {\n  const projects',
  "export function deleteProject(projectId: string): void {\n  if (typeof window === 'undefined') return;\n  const projects"
);

fs.writeFileSync('lib/services/storage.ts', code);
