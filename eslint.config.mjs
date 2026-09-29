import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Server-only modules. Importing any of these from a Client Component would pull
 * database/auth code — and the connection string — toward the browser bundle. The
 * `server-only` package makes that a build error; this rule makes it a lint error
 * with a clearer message, and catches it before a build is run.
 */
const SERVER_ONLY_IMPORTS = [
  {
    name: "mongoose",
    message: "Mongoose is server-only. Call a service from a Server Component instead.",
  },
  {
    name: "@/lib/env",
    message: "Server-only env. Client components may only read NEXT_PUBLIC_* via process.env.",
  },
];

const SERVER_ONLY_PATTERNS = [
  {
    group: ["@/lib/db", "@/lib/db/*"],
    message:
      "Database access is server-only. Use a service from a Server Component or Server Action.",
  },
  {
    group: ["@/models", "@/models/*"],
    message: "Mongoose models are server-only. Never import them into a Client Component.",
  },
  {
    group: ["@/services", "@/services/*"],
    message: "Services are server-only. Pass their plain-data results in as props instead.",
  },
  {
    group: ["@/lib/auth/auth", "@/lib/auth/guards"],
    message: "Server-side auth. Client components use @/lib/auth/auth-client.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Type-aware linting. This is the reason TypeScript is pinned to 5.9.x:
  // typescript-eslint@8 peer-caps TypeScript at <6.1.0, so a "helpful" bump to
  // TypeScript 7 would silently disable every rule in this block.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "tests/**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Catches unawaited connectToDatabase(), server actions and revalidate calls.
      "@typescript-eslint/no-floating-promises": "error",
      // Catches onClick={asyncFn} and `if (promise)`.
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "error",
    },
  },

  // Everything in src/ logs through lib/logger.ts so that redaction is unavoidable.
  //
  // NOTE: the server-only import restrictions deliberately do NOT apply here.
  // They target client-side code, and applying them across all of src/** would
  // forbid lib/db.ts from importing lib/env.ts, or a Server Component from
  // calling a guard — i.e. it would make the server layer unwritable. The
  // authoritative boundary is the `server-only` package imported at the top of
  // env.ts / db.ts / logger.ts / auth.ts / guards.ts, which turns a client import
  // into a build error; the lint block below is the faster-feedback duplicate.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },

  // Client-side code must not reach server-only modules at all.
  // Keep this list in step with every "use client" module.
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/lib/auth/auth-client.ts",
      "src/lib/forms.ts",
      "src/app/**/*-form.tsx",
      "src/app/**/*.client.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        { paths: SERVER_ONLY_IMPORTS, patterns: SERVER_ONLY_PATTERNS },
      ],
    },
  },

  // Services stay framework-free so they are testable under Vitest without a
  // request context. Anything needing headers()/cookies()/redirect() belongs in
  // the page or action that calls the service.
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message:
                "Services must not import next/*. Resolve request state in the page or Server Action and pass it in.",
            },
          ],
        },
      ],
    },
  },

  // Scripts are operator tools run from a terminal; console output is the point.
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-restricted-imports": "off",
    },
  },

  {
    files: ["tests/**/*.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-restricted-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // Must come last: switches off stylistic rules that would fight Prettier.
  prettier,

  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
