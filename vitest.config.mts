import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * `.mts` so the config loads as ESM natively.
 *
 * Path aliases come from `resolve.tsconfigPaths`, which Vite now supports
 * directly — the `vite-tsconfig-paths` plugin is no longer needed.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // One in-memory mongod shared by the whole run; never a real Atlas cluster.
    globalSetup: ["tests/global-setup.ts"],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/{unit,integration}/**/*.test.ts", "src/**/*.test.ts"],
          setupFiles: ["tests/setup/env.ts"],
          // The first run downloads the mongod binary.
          hookTimeout: 180_000,
          testTimeout: 30_000,
        },
        // Server modules import "server-only", which throws unless the
        // "react-server" condition is applied — that is how the package tells a
        // server module graph from a client one. Vitest's node environment
        // resolves through the SSR pipeline, so the condition belongs here.
        ssr: {
          resolve: {
            conditions: ["react-server", "node", "import", "default"],
          },
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/components/**/*.test.tsx"],
          setupFiles: ["tests/setup/env.ts", "tests/setup/dom.ts"],
        },
      },
    ],
  },
});
