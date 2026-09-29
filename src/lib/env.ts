import "server-only";

import { z } from "zod";

/**
 * Server environment, validated once at module load so a misconfiguration fails
 * the build or the first request rather than surfacing as a confusing runtime
 * error deep inside the database driver.
 *
 * `ADMIN_EMAIL` / `ADMIN_PASSWORD` are deliberately absent: they are seed-time
 * only, and requiring them here would stop the web app booting on any host that
 * has no business knowing them. `scripts/seed-admin.ts` validates its own input.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Named MONGO_URI (not MONGODB_URI) to match the key already in use locally.
  MONGO_URI: z
    .string()
    .min(1)
    .refine(
      (value) => /^mongodb(\+srv)?:\/\//.test(value),
      "must be a mongodb:// or mongodb+srv:// connection string",
    )
    // lib/db.ts resolves the database from the URI via client.db(). Without a
    // path segment the driver silently falls back to a database called "test".
    .refine(
      (value) => /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(value),
      "must include a database name, e.g. mongodb+srv://host/sendly",
    ),

  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("must be an absolute URL, e.g. http://localhost:3000"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Key names and reasons only — this message reaches build logs and terminals.
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n  ");
  throw new Error(`Invalid environment configuration:\n  ${issues}\n\nSee .env.example.`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
