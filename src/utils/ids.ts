let _globalCounter = 0;

export function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++_globalCounter}`;
}
