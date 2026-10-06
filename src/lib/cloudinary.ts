import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Signed Cloudinary image upload over plain `fetch`.
 *
 * The `cloudinary` SDK is deliberately NOT a dependency (CLAUDE.md rule 15): the
 * signed-upload protocol is one SHA-1 and one multipart POST, while the SDK adds
 * a global mutable config singleton — hostile to both the serverless model and
 * Vitest — plus an admin API and a lib-es5 build nothing here calls. Writing the
 * two steps ourselves also makes them pure exported functions a unit test can
 * cover with no network, which an SDK call never is.
 *
 * `next-cloudinary` IS a dependency, for <CldImage> display only. It neither
 * uses this module nor needs the server SDK.
 */

/**
 * One folder per subject, so an orphan sweep stays cheap AND can tell a
 * consignment photo from a support attachment — which matters because a chat
 * retention sweep must never be able to reach a shipment photo, that being the
 * evidence of what was consigned (rule 29).
 *
 * Exported for assertion only. The TYPE and the uploader stay private, so the
 * folder remains a property of which exported function you called rather than a
 * decision a caller gets to make — but the separation itself is load-bearing
 * enough to be pinned by a test.
 */
export const FOLDERS = {
  shipments: "sendly/shipments",
  chat: "sendly/chat",
} as const;

type UploadFolder = keyof typeof FOLDERS;

/** A hung upload must not hold a serverless invocation to its wall clock. */
const UPLOAD_TIMEOUT_MS = 20_000;

/**
 * Every failure mode, so the caller has one thing to catch. The message is for
 * logs, never for the browser: the action substitutes its own copy.
 */
export class CloudinaryUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * Parses `cloudinary://<api_key>:<api_secret>@<cloud_name>`.
 *
 * Takes the URL as an argument rather than reading `env` so it stays pure — that
 * is what lets tests/setup/env.ts stay free of a Cloudinary key.
 */
export function parseCloudinaryUrl(value: string): CloudinaryCredentials {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CloudinaryUploadError("CLOUDINARY_URL is not a URL");
  }

  if (url.protocol !== "cloudinary:") {
    throw new CloudinaryUploadError("CLOUDINARY_URL must use the cloudinary:// scheme");
  }

  // Percent-decoding is not automatic on these accessors, and a generated API
  // secret can legitimately contain characters that must be escaped in a URL.
  const apiKey = decodeURIComponent(url.username);
  const apiSecret = decodeURIComponent(url.password);
  // `new URL` lower-cases the hostname. Cloudinary cloud names are lower-case,
  // so this is a no-op in practice rather than a normalisation we rely on.
  const cloudName = url.hostname;

  if (!apiKey || !apiSecret || !cloudName) {
    throw new CloudinaryUploadError("CLOUDINARY_URL is missing the key, secret or cloud name");
  }

  return { cloudName, apiKey, apiSecret };
}

/**
 * Cloudinary signs the alphabetically-sorted `k=v&k=v` string of every parameter
 * in the request EXCEPT `file`, `cloud_name`, `resource_type`, `api_key` and
 * `signature` itself.
 *
 * Exported separately from the digest so a test can assert the payload without a
 * hand-computed SHA-1 constant nobody can verify by reading it.
 */
export function uploadSignaturePayload(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

export function signUploadParams(params: Record<string, string>, apiSecret: string): string {
  return createHash("sha1")
    .update(`${uploadSignaturePayload(params)}${apiSecret}`)
    .digest("hex");
}

/**
 * A third-party HTTP response is untrusted input, so it is parsed rather than
 * cast. Kept here rather than in src/validations/ because it is server-only and
 * guards nothing any client shares.
 */
const uploadResponseSchema = z.object({
  secure_url: z.url(),
  public_id: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** The narrow record a shipment stores. Nothing else from the response is kept. */
export type UploadedImage = {
  url: string;
  publicId: string;
  width: number;
  height: number;
};

async function uploadImage(file: File, folder: UploadFolder): Promise<UploadedImage> {
  if (!env.CLOUDINARY_URL) {
    throw new CloudinaryUploadError("CLOUDINARY_URL is not configured");
  }

  const { cloudName, apiKey, apiSecret } = parseCloudinaryUrl(env.CLOUDINARY_URL);

  // Uploading into one cloud while <CldImage> builds URLs for another 404s every
  // image, and stays invisible until someone opens a detail page. This is the
  // only code that sees both names, so it is the only place that can catch it.
  const publicCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (publicCloudName && publicCloudName !== cloudName) {
    throw new CloudinaryUploadError(
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME does not match the cloud name in CLOUDINARY_URL",
    );
  }

  const signed = { folder: FOLDERS[folder], timestamp: String(Math.floor(Date.now() / 1000)) };

  const body = new FormData();
  body.set("file", file);
  for (const [key, value] of Object.entries(signed)) body.set(key, value);
  body.set("api_key", apiKey);
  body.set("signature", signUploadParams(signed, apiSecret));

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error("cloudinary upload request failed", { error });
    throw new CloudinaryUploadError("The upload request failed");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    // Logged as data, not narrowed: Cloudinary's error envelope is its business,
    // and logger.ts redacts by key name so nothing sensitive escapes either way.
    logger.error("cloudinary rejected the upload", { status: response.status, payload });
    throw new CloudinaryUploadError(`Cloudinary responded ${response.status}`);
  }

  const parsed = uploadResponseSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error("cloudinary returned an unexpected shape", { issues: parsed.error.issues });
    throw new CloudinaryUploadError("Cloudinary returned an unexpected response");
  }

  return {
    url: parsed.data.secure_url,
    publicId: parsed.data.public_id,
    width: parsed.data.width,
    height: parsed.data.height,
  };
}

/*
 * Two thin wrappers rather than one exported function taking a folder, so the
 * subject is fixed at the call site and `uploadShipmentPhoto` keeps the exact
 * signature `cargo/actions.ts` already calls.
 *
 * Neither is `async`: they return the promise directly, because
 * `@typescript-eslint/require-await` is an error here and an async passthrough
 * with no `await` trips it.
 */

export function uploadShipmentPhoto(file: File): Promise<UploadedImage> {
  return uploadImage(file, "shipments");
}

export function uploadChatImage(file: File): Promise<UploadedImage> {
  return uploadImage(file, "chat");
}
