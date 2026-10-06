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
 *
 * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is deliberately absent too: it is inlined
 * into the client bundle at build time, so asserting it here — in a server-only
 * module — would prove nothing about the bundle that actually needs it.
 * `lib/cloudinary.ts` cross-checks it against CLOUDINARY_URL at upload time,
 * which is the one place that knows both.
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

  /**
   * cloudinary://<api_key>:<api_secret>@<cloud_name>. Holds an API SECRET.
   *
   * OPTIONAL on purpose. This module is evaluated during `next build`, so a
   * required key would fail the build on any host that has no reason to hold an
   * upload credential — and every shipment field except the photo works without
   * image hosting. `lib/cloudinary.ts` raises a clear error if an upload is
   * attempted while this is absent, which is the only moment it matters.
   *
   * The format is still validated when present, so a typo fails loudly at boot
   * rather than as an opaque 401 from Cloudinary on the first upload.
   */
  CLOUDINARY_URL: z
    .string()
    .refine(
      (value) => /^cloudinary:\/\/[^:@/]+:[^@/]+@[^/]+$/.test(value),
      "must look like cloudinary://api_key:api_secret@cloud_name",
    )
    .optional(),
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
