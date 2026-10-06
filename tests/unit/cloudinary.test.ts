import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  CloudinaryUploadError,
  FOLDERS,
  parseCloudinaryUrl,
  signUploadParams,
  uploadSignaturePayload,
} from "@/lib/cloudinary";

/**
 * Covers the two pure steps of the signed upload. No network and no
 * CLOUDINARY_URL in the environment — which is the whole reason the parser takes
 * its input as an argument rather than reading `env`.
 */

describe("parseCloudinaryUrl", () => {
  it("splits a well-formed URL into its three parts", () => {
    expect(parseCloudinaryUrl("cloudinary://123456789:abcDEF-secret@demo-cloud")).toEqual({
      apiKey: "123456789",
      apiSecret: "abcDEF-secret",
      cloudName: "demo-cloud",
    });
  });

  it("percent-decodes a secret containing URL-reserved characters", () => {
    // A generated secret can legitimately contain these, and URL accessors do not
    // decode them for you.
    const { apiSecret } = parseCloudinaryUrl("cloudinary://key:a%2Fb%40c@demo");
    expect(apiSecret).toBe("a/b@c");
  });

  it("rejects anything that is not a cloudinary:// URL", () => {
    expect(() => parseCloudinaryUrl("https://api.cloudinary.com/demo")).toThrow(
      CloudinaryUploadError,
    );
    expect(() => parseCloudinaryUrl("not a url at all")).toThrow(CloudinaryUploadError);
  });

  it("rejects a URL missing the key, the secret or the cloud name", () => {
    expect(() => parseCloudinaryUrl("cloudinary://key@demo")).toThrow(CloudinaryUploadError);
    expect(() => parseCloudinaryUrl("cloudinary://:secret@demo")).toThrow(CloudinaryUploadError);
    expect(() => parseCloudinaryUrl("cloudinary://key:secret@")).toThrow(CloudinaryUploadError);
  });
});

describe("FOLDERS", () => {
  it("keeps consignment photos and chat attachments in separate folders", () => {
    expect(FOLDERS.shipments).not.toBe(FOLDERS.chat);
  });

  it("makes neither folder a prefix of the other", () => {
    // Load-bearing for the orphan sweeps (gaps 8 and 27): they match by folder
    // prefix, so if chat assets lived under the shipments path a chat retention
    // sweep could delete a consignment photo — the evidence of what was
    // consigned, which rule 29 says must never be replaceable or removable.
    expect(FOLDERS.chat.startsWith(FOLDERS.shipments)).toBe(false);
    expect(FOLDERS.shipments.startsWith(FOLDERS.chat)).toBe(false);
  });
});

describe("uploadSignaturePayload", () => {
  it("sorts the parameters alphabetically regardless of insertion order", () => {
    // Cloudinary rejects a signature computed over any other ordering, so this is
    // the part of the protocol worth pinning.
    expect(uploadSignaturePayload({ timestamp: "1700000000", folder: "sendly/shipments" })).toBe(
      "folder=sendly/shipments&timestamp=1700000000",
    );
  });

  it("produces an empty string for no parameters", () => {
    expect(uploadSignaturePayload({})).toBe("");
  });
});

describe("signUploadParams", () => {
  const params = { folder: "sendly/shipments", timestamp: "1700000000" };

  it("is the SHA-1 of the sorted payload with the secret appended", () => {
    // Asserted against the documented construction rather than a hand-pasted hex
    // constant, which nobody could verify by reading it.
    const expected = createHash("sha1")
      .update(`${uploadSignaturePayload(params)}topsecret`)
      .digest("hex");

    expect(signUploadParams(params, "topsecret")).toBe(expected);
  });

  it("returns 40 lowercase hex characters", () => {
    expect(signUploadParams(params, "topsecret")).toMatch(/^[0-9a-f]{40}$/);
  });

  it("changes when the secret changes", () => {
    expect(signUploadParams(params, "one")).not.toBe(signUploadParams(params, "two"));
  });
});
