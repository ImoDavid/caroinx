/**
 * Creates (or repairs) the first administrator. There is no public sign-up, so
 * this script is the only way an account comes into existence.
 *
 * It drives better-auth's own `internalAdapter` rather than writing MongoDB
 * documents directly. That matters: the password hash lives on the `account`
 * collection keyed by `providerId: "credential"` with `accountId === user.id`,
 * and the adapter coerces `_id`/`userId` to ObjectId while `accountId` stays a
 * hex string. Hand-writing those shapes is how you create an administrator who
 * cannot sign in.
 *
 * It does not use `auth.api.signUpEmail` either: that endpoint is disabled by
 * configuration, runs inside a transaction (which standalone mongod rejects),
 * creates a throwaway session, and — decisively — returns a generic *success*
 * for a duplicate email, so it cannot distinguish "created" from "already there".
 *
 *   npm run db:seed-admin                      # create, or report no change
 *   npm run db:seed-admin -- --rotate-password # replace the existing password
 *
 * Exit codes: 0 ok · 1 bad environment · 2 operator conflict · 3 database failure
 */
import { betterAuth } from "better-auth/minimal";
import mongoose from "mongoose";
import { z } from "zod";

// Relative, with an explicit .ts extension: plain `node` strips types but does
// not resolve the "@/*" tsconfig alias.
import { createAuthOptions } from "../src/lib/auth/options.ts";

const SENSITIVE = /pass(word)?|secret|token|cookie|authorization|hash|salt|uri|credential/i;

/** Mirrors src/lib/logger.ts. Duplicated (~8 lines) rather than imported, because
 *  importing it would drag "@/" alias resolution into a plain-node script. */
function scrub(value: unknown): unknown {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : scrub(v)]),
    );
  }
  if (typeof value === "string") {
    return value.replace(/(mongodb(?:\+srv)?:\/\/)[^:/@\s]+:[^@/\s]+@/gi, "$1[redacted]@");
  }
  return value;
}

const envSchema = z.object({
  MONGO_URI: z
    .string()
    .refine(
      (v) => /^mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(v),
      "must be a mongodb URI including a database name",
    ),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("must be an absolute URL").default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().pipe(z.email("must be a valid email address")),
  ADMIN_PASSWORD: z.string().min(12, "must be at least 12 characters"),
  ADMIN_NAME: z.string().min(1).default("Administrator"),
});

export type SeedOutcome =
  "created" | "repaired" | "password rotated" | "already exists — no changes";

export type SeedDeps = {
  db: mongoose.mongo.Db;
  secret: string;
  baseURL: string;
  email: string;
  password: string;
  name: string;
  rotatePassword: boolean;
  log?: (message: string) => void;
};

/**
 * Exported so the integration tests can drive it directly against an in-memory
 * MongoDB without spawning a process.
 */
export async function seedAdmin(deps: SeedDeps): Promise<SeedOutcome> {
  const noop = () => {};
  const log = deps.log ?? noop;

  // The real production options, verbatim — sign-up stays disabled. Only direct
  // internalAdapter calls are used below, which `disabledPaths` does not gate.
  const auth = betterAuth(
    createAuthOptions({
      db: deps.db,
      baseURL: deps.baseURL,
      secret: deps.secret,
      logLevel: "warn",
      log: (level, message, ...args) => {
        log(`[better-auth:${level}] ${message} ${JSON.stringify(scrub(args))}`);
      },
      rateLimitEnabled: false,
    }),
  );

  const ctx = await auth.$context;
  const email = deps.email.trim().toLowerCase();

  const existing = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });

  // --- No user yet: create it, then attach the credential account. ------------
  if (!existing) {
    // `role` is not passed: the adapter applies the "admin" defaultValue from the
    // shared options. Passing it explicitly would be ignored anyway (input:false).
    const user = await ctx.internalAdapter.createUser(
      { email, name: deps.name, emailVerified: true },
      { method: "email-password" },
    );

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(deps.password),
    });

    await assertSignable(ctx, email, deps.password);
    return "created";
  }

  const user = existing.user as typeof existing.user & { role?: string };

  // --- Never silently escalate someone else's account. ------------------------
  if (user.role !== "admin") {
    throw new SeedConflictError(
      `A user with email ${email} already exists with role "${String(user.role)}", not "admin". ` +
        `Refusing to change it. Resolve this manually, or seed a different address.`,
    );
  }

  const credential = await ctx.internalAdapter.findCredentialAccount(user.id);

  // --- Repair a half-created admin. Reachable because transaction: false means
  //     createUser and linkAccount are not atomic. --------------------------
  if (!credential) {
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: await ctx.password.hash(deps.password),
    });
    await assertSignable(ctx, email, deps.password);
    return "repaired";
  }

  if (deps.rotatePassword) {
    await ctx.internalAdapter.updatePassword(user.id, await ctx.password.hash(deps.password));
    await assertSignable(ctx, email, deps.password);
    return "password rotated";
  }

  // Two reads, zero writes.
  return "already exists — no changes";
}

class SeedConflictError extends Error {}

/**
 * Derived from our actual options rather than from the generic `betterAuth`:
 * the generic form widens to `BetterAuthOptions`, which produces a context type
 * incompatible with the literal-typed one this script builds.
 */
type SeedContext = Awaited<
  ReturnType<typeof betterAuth<ReturnType<typeof createAuthOptions>>>["$context"]
>;

/**
 * Round-trip check: re-read the user and verify the stored hash accepts the
 * password. Turns a regression in better-auth's default-application or hashing
 * into a loud seed failure instead of an administrator who cannot log in.
 */
async function assertSignable(ctx: SeedContext, email: string, password: string): Promise<void> {
  const check = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
  const role = (check?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    throw new Error(`Verification failed: stored role is "${String(role)}", expected "admin".`);
  }

  const account = check?.accounts.find(
    (candidate) => candidate.providerId === "credential" && candidate.accountId === check.user.id,
  );
  if (!account?.password) {
    throw new Error("Verification failed: no credential account with a password was stored.");
  }

  const ok = await ctx.password.verify({ password, hash: account.password });
  if (!ok) {
    throw new Error("Verification failed: the stored hash does not accept the seeded password.");
  }
}

async function main(): Promise<number> {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Key names and reasons only. Never values.
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    console.error("\nSee .env.example.");
    return 1;
  }

  const env = parsed.data;
  const rotatePassword = process.argv.includes("--rotate-password");

  const connection = mongoose.createConnection(env.MONGO_URI, { serverSelectionTimeoutMS: 30_000 });

  try {
    await connection.asPromise();
    const db = connection.getClient().db();

    const outcome = await seedAdmin({
      db,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
      name: env.ADMIN_NAME,
      rotatePassword,
      log: (message) => console.log(message),
    });

    // The password is never echoed, on any path.
    console.log(`\nadmin ${env.ADMIN_EMAIL.toLowerCase()} on "${db.databaseName}": ${outcome}`);
    if (outcome === "already exists — no changes" && !rotatePassword) {
      console.log("Pass -- --rotate-password to replace the stored password.");
    }
    return 0;
  } catch (error) {
    if (error instanceof SeedConflictError) {
      console.error(`\n${error.message}`);
      return 2;
    }
    console.error("\nSeeding failed:", (error as Error).message);
    if ((error as Error).stack) console.error((error as Error).stack);
    return 3;
  } finally {
    await connection.close();
  }
}

// Only run when executed directly, so tests can import seedAdmin().
if (process.argv[1] && import.meta.filename === process.argv[1]) {
  process.exit(await main());
}
