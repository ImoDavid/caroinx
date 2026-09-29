import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/auth";

/**
 * better-auth's own HTTP surface. This is the one place in the application where
 * a Route Handler is the right tool rather than a Server Action: the endpoints
 * are defined by the library and are consumed as conventional HTTP.
 *
 * `toNextJsHandler` returns five methods in this version, not two — exporting
 * only GET and POST would leave PATCH/PUT/DELETE endpoints silently 405.
 *
 * Sign-up and password-reset paths are removed by `disabledPaths` in
 * lib/auth/options.ts and return 404 here.
 */
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);

// Sessions are per-request; nothing here may be cached or prerendered.
export const dynamic = "force-dynamic";
