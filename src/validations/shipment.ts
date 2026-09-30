import { z } from "zod";

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

/* -------------------------------------------------------------------------- */
/* Sections — mirrored by the three fieldsets in the create/edit form           */
/* -------------------------------------------------------------------------- */

export const senderSchema = z.object({
  name: requiredText(NAME_MAX, "Sender name"),
  location: requiredText(LOCATION_MAX, "Sender location"),
  phone: optionalText(PHONE_MAX, "Phone number is too long"),
});

export const receiverSchema = z.object({
  name: requiredText(NAME_MAX, "Receiver name"),
  location: requiredText(LOCATION_MAX, "Receiver location"),
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

export const shipmentStatusUpdateSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES, { message: "Choose a status" }),
  note: optionalText(STATUS_NOTE_MAX, "Note is too long"),
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
