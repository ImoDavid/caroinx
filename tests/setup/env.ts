import { randomUUID } from "node:crypto";

import { inject } from "vitest";

/**
 * Populates the environment before the test file's own static imports are
 * evaluated. This ordering is what makes `@/lib/env` usable in tests at all: it
 * validates `process.env` at module load and throws if anything is missing.
 *
 * Each test file gets its own database on the shared server, so files running in
 * parallel cannot interfere with one another.
 */
const database = `sendly_test_${randomUUID().slice(0, 8)}`;

process.env.MONGO_URI = `${inject("mongoBaseUri")}${database}`;
process.env.BETTER_AUTH_SECRET = "test-secret-at-least-32-characters-long-0000";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
// NODE_ENV is set to "test" by Vitest itself and is read-only in the Node types.
// Keep the suite output quiet; individual tests assert on the logger directly.
process.env.LOG_LEVEL = "error";
