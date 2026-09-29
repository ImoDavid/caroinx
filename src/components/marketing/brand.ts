/**
 * Constants shared across more than one marketing section, so a change to an
 * email address or the wordmark is a single edit.
 *
 * Section-specific content lives as a module-level const in that section's own
 * file rather than here.
 */
export const BRAND = {
  name: "TRUE GLOBAL ROUTE",
  legalName: "True Global Route Logistics",
  tagline: "Multimodal Freight Architecture",
  supportEmail: "support@trueglobalroute.com",
  dispatchEmail: "dispatch@trueglobalroute.com",
  // Hardcoded rather than derived from `new Date()`: during static prerender
  // that would silently bake in the build year.
  copyright:
    "© 2026 True Global Route Logistics. All rights reserved. Registered International Freight Forwarder & Multimodal Transport Operator.",
} as const;
