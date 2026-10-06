import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * The shipment photo rides in the create form's own POST, and the default
       * limit is 1 MB. Coupled to PHOTO_MAX_BYTES (4 MB) in
       * src/validations/shipment.ts: the extra 0.25 MB covers the multipart
       * boundaries and part headers the Next docs budget 10–20 KB for, plus the
       * text fields. Raising PHOTO_MAX_BYTES without raising this turns a
       * friendly field error into an opaque 413.
       *
       * It cannot go much higher: Vercel's request-body ceiling is ~4.5 MB and is
       * not configurable, so 4 MB is the largest image this design can accept.
       */
      bodySizeLimit: "4.25mb",
    },
  },
};

/**
 * Deliberately NO `images.remotePatterns` entry for res.cloudinary.com.
 *
 * <CldImage> hands next/image a custom `loader`, and a custom loader bypasses
 * Next's optimizer completely — the browser fetches the Cloudinary URL directly,
 * so `/_next/image` is never hit and there is nothing for remotePatterns to
 * gate. Adding one would be dead configuration (CLAUDE.md rule 7). It becomes
 * necessary the moment anything renders `photo.url` through plain next/image,
 * and the failure then is loud and self-describing.
 */
export default nextConfig;
