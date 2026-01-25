// Empty module stub for Turbopack resolveAlias workaround
// Provides stub for node:module imports in browser context
export function createRequire() {
  throw new Error('createRequire is not supported in browser environment');
}
