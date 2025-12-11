// apps/protected/eslint.config.js 
import baseConfig from "@workspace/eslint-config/next-js";

export default [
  {
    ignores: ["node_modules/**", ".next/**", "dist/**", "build/**", "coverage/**"],
  },
  ...baseConfig,
  {
    files: ["*.config.{js,mjs,ts}", "sentry.*.config.{js,mjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
];
