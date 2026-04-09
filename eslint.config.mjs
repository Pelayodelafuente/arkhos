import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // These new react-hooks rules are too strict for valid patterns
      // (setState for initialization in useEffect, local accumulators in useMemo)
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      // Allow _-prefixed variables to be intentionally unused
      "@typescript-eslint/no-unused-vars": ["warn", { "varsIgnorePattern": "^_", "argsIgnorePattern": "^_" }],
    },
  },
]);

export default eslintConfig;
