import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import type { DBFieldAttribute } from "@better-auth/core/db";
import type { Db } from "mongodb";

/**
 * better-auth configuration, kept framework-free and dependency-injected.
 *
 * This module must import ONLY from node_modules: `scripts/seed-admin.ts` imports
 * it by relative path under plain `node`, which does not resolve the `@/*`
 * tsconfig alias. Keeping it alias-free is what lets the seed script and the web
 * application share one configuration instead of duplicating better-auth's
 * document shapes.
 */
export type AuthLogLevel = "debug" | "info" | "warn" | "error";

export type AuthDeps = {
  db: Db;
  baseURL: string;
  secret: string;
  logLevel: AuthLogLevel;
  log: (level: AuthLogLevel, message: string, ...args: unknown[]) => void;
  rateLimitEnabled: boolean;
};

/**
 * NOTE: the return type is deliberately not annotated.
 *
 * Annotating it `BetterAuthOptions` — or assigning it through a variable of that
 * type — widens the literal types and `role` disappears from
 * `auth.$Infer.Session`. Verified by running the compiler over both variants.
 */
export function createAuthOptions(deps: AuthDeps) {
  return {
    appName: "sendly",
    baseURL: deps.baseURL,
    secret: deps.secret,
    basePath: "/api/auth",

    // No `client` is passed on purpose, so the adapter runs with
    // transaction: false. Standalone mongod and single-node
    // mongodb-memory-server both require that, and uniform behaviour across
    // dev/test/prod is worth more here than atomicity on a sign-up path the
    // application never uses (only the supervised, self-repairing seed does).
    database: mongodbAdapter(deps.db),

    emailAndPassword: {
      enabled: true,
      // There is no public sign-up. Returns 400 EMAIL_PASSWORD_SIGN_UP_DISABLED.
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // No mail transport exists in this foundation.
      requireEmailVerification: false,
    },

    // Belt and braces: a hard 404 at the router, so these endpoints are absent
    // rather than merely disabled. Paths are relative to basePath (no /api/auth
    // prefix). This only affects the mounted HTTP handler, not direct
    // auth.api.* calls — which is exactly right: the seed stays unaffected.
    disabledPaths: ["/sign-up/email", "/forget-password", "/reset-password"],

    user: {
      additionalFields: {
        // `satisfies DBFieldAttribute<["admin"]>` is load-bearing: without the
        // contextual type, ["admin"] widens to string[] and role becomes
        // `string` instead of the literal "admin".
        //
        // input: false combined with a defaultValue makes better-auth's
        // parseInputData silently overwrite any caller-supplied role, so a
        // request carrying role: "superadmin" still yields "admin".
        role: {
          type: ["admin"],
          required: true,
          defaultValue: "admin",
          input: false,
          returned: true,
        } satisfies DBFieldAttribute<["admin"]>,
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // cookieCache is deliberately left off. `database` is set, so better-auth
      // does not force-enable the JWE cookie cache, and every guard call reads
      // the session collection — which means revocation takes effect
      // immediately. React cache() dedupes within a render pass, and
      // scripts/sync-indexes.ts creates session_token_uidx so it is one indexed
      // lookup.
    },

    rateLimit: {
      enabled: deps.rateLimitEnabled,
      // Database storage rather than memory so the limit holds across instances.
      // Adds a `rateLimit` collection; no Redis, no extra infrastructure.
      //
      // Caveat recorded in CLAUDE.md: this only applies to requests through the
      // mounted /api/auth/* handler, NOT to a direct auth.api.* call from a
      // Server Action.
      storage: "database" as const,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/get-session": false as const,
      },
    },

    advanced: {
      // cookiePrefix intentionally omitted: the default
      // `better-auth.session_token` lets src/proxy.ts call getSessionCookie()
      // with no configuration, so there is no second place to keep in sync.
      // useSecureCookies is derived from baseURL/NODE_ENV.
    },

    logger: { level: deps.logLevel, log: deps.log },
    telemetry: { enabled: false },

    // MUST remain last. Its `after` hook copies Set-Cookie into next/headers
    // cookies(), which is the only reason a Server Action login can establish a
    // session. better-auth warns at runtime if any plugin follows it.
    plugins: [nextCookies()],
  };
}
