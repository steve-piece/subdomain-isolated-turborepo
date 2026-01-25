// Browser stub for Node.js built-in modules that are referenced by @supabase/supabase-js
// This is needed because Turbopack can't handle node:module in browser bundles
// Tracked issue: https://github.com/vercel/next.js/issues/64525

// Return a no-op function that returns another no-op - this prevents errors during module evaluation
export const createRequire = () => () => ({});
export default { createRequire };
