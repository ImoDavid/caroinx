import { z } from "zod";

import { COUNTRY_CODES } from "@/lib/countries";

/* -------------------------------------------------------------------------- */
/* Enumerations                                                                */
/* -------------------------------------------------------------------------- */

// Plain const arrays rather than TS `enum`: scripts/ runs under bare node, which
// does not support enum (see CLAUDE.md rule 19), and these are shared with it.
export const TRANSPORT_TYPES = ["air", "sea", "road", "rail"] as const;
export type TransportType = (typeof TRANSPORT_TYPES)[number];

export const TRANSPORT_TYPE_LABELS: Record<TransportType, string> = {
  air: "Air freight",
  sea: "Ocean freight",
  road: "Road freight",
  rail: "Rail freight",
};

/**
 * Ordered from first to last. The order is meaningful — the public timeline
 * renders it as progress — but transitions are NOT restricted to going forward:
 * a shipment can legitimately return to "On the way" after "Customs held", and
 * an operator must be able to correct a mistake.
 */
export const SHIPMENT_STATUSES = [
  "order_confirmed",
  "picked_by_courier",
  "on_the_way",
  "customs_held",
  "delivered",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  order_confirmed: "Order confirmed",
  picked_by_courier: "Picked up by courier",
  on_the_way: "On the way",
  customs_held: "Held at customs",
  delivered: "Delivered",
};

export const DEFAULT_SHIPMENT_STATUS: ShipmentStatus = "order_confirmed";

/* -------------------------------------------------------------------------- */
/* Tracking code                                                               */
/* -------------------------------------------------------------------------- */

export const TRACKING_CODE_PREFIX = "TGR";
export const TRACKING_CODE_BODY_LENGTH = 8;

/**
 * Crockford-style alphabet: no I, L, O or U. Removes the read-aloud ambiguity
 * between 1/I/L and 0/O, which matters because customers retype these by hand
 * from a printed label or a phone call.
 */
export const TRACKING_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const TRACKING_CODE_PATTERN = new RegExp(
  `^${TRACKING_CODE_PREFIX}-[${TRACKING_CODE_ALPHABET}]{${TRACKING_CODE_BODY_LENGTH}}$`,
);

/**
 * Accepts what a customer is likely to type — lower case, surrounding spaces,
 * and a missing hyphen — and normalises it before matching.
 */
export const trackingCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/\s+/g, ""))
  .transform((value) =>
    value.startsWith(`${TRACKING_CODE_PREFIX}-`)
      ? value
      : value.replace(new RegExp(`^${TRACKING_CODE_PREFIX}`), `${TRACKING_CODE_PREFIX}-`),
  )
  .refine((value) => TRACKING_CODE_PATTERN.test(value), "That is not a valid tracking code");

/* -------------------------------------------------------------------------- */
/* Field helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * An untouched optional input arrives as "" from FormData and as undefined from
 * a JSON client. Both must mean "absent" so the field is not persisted as an
 * empty string.
 */
// `.optional()` must be OUTERMOST. Applying it before `.transform()` produces a
// schema whose output includes undefined but whose object KEY is still required,
// forcing every caller to write `note: undefined`. Outermost keeps the key
// genuinely optional.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value ? value : undefined))
    .optional();

const requiredText = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const NAME_MAX = 120;
const LOCATION_MAX = 240;
const PHONE_MAX = 32;

/**
 * The default country on a new shipment's form. A required <select> with no
 * blank option always posts something, so the default must be a deliberate
 * choice rather than "whatever sorts first" — Nigeria is this operator's base.
 */
export const DEFAULT_COUNTRY = "NG";

/* -------------------------------------------------------------------------- */
/* Sections — mirrored by the three fieldsets in the create/edit form           */
/* -------------------------------------------------------------------------- */

export const senderSchema = z.object({
  name: requiredText(NAME_MAX, "Sender name"),
  country: z.enum(COUNTRY_CODES, { message: "Choose a country" }),
  location: requiredText(LOCATION_MAX, "Sender city or address"),
  phone: optionalText(PHONE_MAX, "Phone number is too long"),
});

export const receiverSchema = z.object({
  name: requiredText(NAME_MAX, "Receiver name"),
  country: z.enum(COUNTRY_CODES, { message: "Choose a country" }),
  location: requiredText(LOCATION_MAX, "Receiver city or address"),
  phone: optionalText(PHONE_MAX, "Phone number is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => (value ? value : undefined))
    .pipe(z.email("Enter a valid email address").optional())
    .optional(),
});

/** Kilograms. The upper bound is a sanity guard, not a business rule. */
export const WEIGHT_MIN = 0.01;
export const WEIGHT_MAX = 1_000_000;

export const shipmentDetailsSchema = z.object({
  transportType: z.enum(TRANSPORT_TYPES, { message: "Choose a transport type" }),
  weightKg: z.coerce
    .number({ message: "Enter the weight in kilograms" })
    .positive("Weight must be greater than zero")
    .min(WEIGHT_MIN, "Weight must be greater than zero")
    .max(WEIGHT_MAX, "That weight looks wrong"),
  shipDate: z.coerce.date({ message: "Enter a valid shipping date" }),
  /**
   * Optional: an arrival date is not always known at booking, and a guess
   * printed on a customer-facing tracking page is worse than an absent row.
   *
   * `preprocess` rather than `.transform().pipe()` — `z.coerce.date()` accepts
   * `unknown`, which will not pipe from a string schema. The blank-to-undefined
   * step has to run BEFORE coercion either way, because `z.coerce.date("")` is
   * an Invalid Date rather than a failure. Same wall the `amount` field hit.
   *
   * The OUTER `.optional()` is rule 22: a ZodPipe's object key stays REQUIRED
   * even when its output includes undefined, which would force every caller to
   * write `expectedDelivery: undefined`. Note this makes the key OMITTABLE — a
   * key that is present but blank still comes back present with an undefined
   * value, which is what both `createShipment` (Mongoose drops undefined paths)
   * and `updateShipment` (truthiness picks $set vs $unset) actually test for.
   */
  expectedDelivery: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.coerce.date({ message: "Enter a valid expected delivery date" }).optional(),
    )
    .optional(),
});

/* -------------------------------------------------------------------------- */
/* Photo                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Coupled to `experimental.serverActions.bodySizeLimit` in next.config.ts, which
 * must stay a little larger to cover multipart boundaries and the text fields.
 * Raising this without raising that turns a friendly field error into an opaque
 * platform 413 — and neither may exceed Vercel's ~4.5 MB request-body ceiling,
 * which cannot be configured away.
 */
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export const PHOTO_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;

/** The file input's `accept` attribute, so the picker and the server agree. */
export const PHOTO_ACCEPT = PHOTO_MIME_TYPES.join(",");

/**
 * Validates the *metadata* of an uploaded file rather than a `File` instance.
 *
 * This module is imported by client components and by scripts/ under bare node,
 * so it stays zod-only: `z.instanceof(File)` would couple it to a runtime global
 * for no benefit, and it would make these cases untestable without constructing
 * a File. The Server Action narrows FormData to a File and passes what it finds.
 *
 * Note this trusts the browser-reported MIME type, which is why it is a
 * convenience guard rather than the real boundary — Cloudinary itself rejects
 * anything that is not a decodable image.
 */
export const shipmentPhotoSchema = z.object({
  type: z.enum(PHOTO_MIME_TYPES, { message: "Upload a PNG, JPEG, WebP or AVIF image" }),
  size: z
    .number()
    .int()
    .positive("That file is empty")
    .max(PHOTO_MAX_BYTES, "That image is larger than 4 MB"),
});

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Shared by the client form (via zodResolver) and the Server Action. The
 * server-side parse is the authoritative one.
 *
 * `trackingCode` is absent on purpose: it is generated server-side, so a client
 * cannot choose or overwrite it.
 */
export const shipmentCreateSchema = z.object({
  sender: senderSchema,
  receiver: receiverSchema,
  details: shipmentDetailsSchema,
  status: z.enum(SHIPMENT_STATUSES).default(DEFAULT_SHIPMENT_STATUS),
});

export type ShipmentCreateInput = z.input<typeof shipmentCreateSchema>;
export type ShipmentCreateValues = z.output<typeof shipmentCreateSchema>;

/** Editing never changes status — that has its own audited flow. */
export const shipmentUpdateSchema = shipmentCreateSchema.omit({ status: true });

export type ShipmentUpdateValues = z.output<typeof shipmentUpdateSchema>;

export const STATUS_NOTE_MAX = 280;

/**
 * The customs charge, in USD. The currency is fixed rather than stored: there is
 * exactly one, so a column holding the same three letters on every row would be
 * noise — and formatting lives in `lib/format.ts` alongside the other units.
 */
export const AMOUNT_MAX = 10_000_000;

/**
 * Only a shipment held at customs has an amount, so the key is rejected outright
 * on every other status rather than quietly ignored: silently dropping a figure
 * an operator typed is worse than telling them it does not belong there.
 *
 * On `customs_held` the amount stays optional, and an empty field CLEARS it. That
 * is safe because the form pre-fills the current value, so what is on screen is
 * what gets saved — and it is the only way to correct a figure entered by mistake.
 */
export const AMOUNT_STATUS: ShipmentStatus = "customs_held";

export const shipmentStatusUpdateSchema = z
  .object({
    status: z.enum(SHIPMENT_STATUSES, { message: "Choose a status" }),
    note: optionalText(STATUS_NOTE_MAX, "Note is too long"),
    // `preprocess` rather than `.transform().pipe()`: z.coerce.number() accepts
    // `unknown`, which will not pipe from a string schema. The blank-to-undefined
    // step has to run BEFORE coercion either way, because coercing "" yields 0 —
    // and a cleared field must mean "no charge", never "zero charge".
    amount: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.coerce
        .number({ message: "Enter the amount in USD" })
        .nonnegative("Amount cannot be negative")
        .max(AMOUNT_MAX, "That amount looks wrong")
        .optional(),
    ),
  })
  .refine((value) => value.status === AMOUNT_STATUS || value.amount === undefined, {
    message: "An amount can only be set while the shipment is held at customs",
    path: ["amount"],
  });

export type ShipmentStatusUpdateValues = z.output<typeof shipmentStatusUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* Listing                                                                     */
/* -------------------------------------------------------------------------- */

export const SHIPMENT_PAGE_SIZE = 20;

/**
 * Parsed from URL search params, which are attacker-controlled: every field
 * falls back to a safe default rather than throwing, so a hand-edited query
 * string renders page 1 instead of an error page.
 */
export const shipmentListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : undefined))
    .catch(undefined),
  status: z.enum(SHIPMENT_STATUSES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

export type ShipmentListQuery = z.output<typeof shipmentListQuerySchema>;
