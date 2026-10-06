import { randomInt } from "node:crypto";

// Mongoose 9 renamed FilterQuery to QueryFilter.
import { isValidObjectId, type QueryFilter } from "mongoose";

import { isCountryCode } from "@/lib/countries";
import { connectToDatabase } from "@/lib/db";
import { Shipment, type ShipmentDocument } from "@/models/Shipment";
import type {
  ShipmentDetail,
  ShipmentLink,
  ShipmentPage,
  ShipmentPhoto,
  ShipmentSummary,
} from "@/types/shipment";
import type { PublicShipment } from "@/types/tracking";
import {
  AMOUNT_STATUS,
  DEFAULT_SHIPMENT_STATUS,
  SHIPMENT_PAGE_SIZE,
  TRACKING_CODE_ALPHABET,
  TRACKING_CODE_BODY_LENGTH,
  TRACKING_CODE_PREFIX,
  trackingCodeSchema,
  type ShipmentListQuery,
  type ShipmentCreateValues,
  type ShipmentStatusUpdateValues,
  type ShipmentUpdateValues,
} from "@/validations/shipment";

// Re-exported so server callers can keep importing the shapes from the service
// they got them from; client code must import from "@/types/shipment".
export type {
  ShipmentDetail,
  ShipmentLink,
  ShipmentPage,
  ShipmentPhoto,
  ShipmentStatusEvent,
  ShipmentSummary,
} from "@/types/shipment";
export type { PublicShipment, TrackingEvent, TrackingParty } from "@/types/tracking";

/* -------------------------------------------------------------------------- */
/* Mapping — never return raw documents (CLAUDE.md public/private boundary)     */
/* -------------------------------------------------------------------------- */

type Lean = ShipmentDocument & { _id: unknown };

function toSummary(doc: Lean): ShipmentSummary {
  return {
    id: String(doc._id),
    trackingCode: doc.trackingCode,
    senderName: doc.sender.name,
    receiverName: doc.receiver.name,
    transportType: doc.transportType,
    weightKg: doc.weightKg,
    shipDate: doc.shipDate.toISOString(),
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Guarded rather than mapped blindly: a half-written subdocument must not reach
 * a renderer as a photo with an empty src. Shared by `toDetail` and `toPublic`
 * so the two mappers cannot drift apart.
 */
function toPhoto(doc: Lean): ShipmentPhoto | undefined {
  return doc.photo?.url && doc.photo.publicId
    ? {
        url: doc.photo.url,
        publicId: doc.photo.publicId,
        width: doc.photo.width,
        height: doc.photo.height,
      }
    : undefined;
}

/** Sender and receiver differ only by `email`, which the caller adds. */
type PartyLike = {
  name: string;
  country?: unknown;
  location: string;
  phone?: string | null;
};

function toParty(party: PartyLike) {
  return {
    name: party.name,
    // Checked, not cast: a pre-country shipment has nothing stored here.
    country: isCountryCode(party.country) ? party.country : undefined,
    location: party.location,
    phone: party.phone ?? undefined,
  };
}

function toDetail(doc: Lean): ShipmentDetail {
  return {
    ...toSummary(doc),
    sender: toParty(doc.sender),
    receiver: { ...toParty(doc.receiver), email: doc.receiver.email ?? undefined },
    statusHistory: doc.statusHistory.map((event) => ({
      status: event.status,
      changedAt: event.changedAt.toISOString(),
      changedBy: event.changedBy ?? undefined,
      note: event.note ?? undefined,
    })),
    expectedDelivery: doc.expectedDelivery?.toISOString(),
    photo: toPhoto(doc),
    amount: doc.amount ?? undefined,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * What the PUBLIC tracking page renders.
 *
 * Fields are listed explicitly rather than spread from the document: a spread
 * would leak `_id` and `statusHistory[].changedBy` — an admin user id — to
 * anyone holding a tracking code, and would silently leak whatever field is
 * added to the schema next.
 *
 * Both parties' contact details ARE included. That is a deliberate product
 * decision, not an oversight — see CLAUDE.md gap 15.
 */
function toPublic(doc: Lean): PublicShipment {
  const history = doc.statusHistory.map((event) => ({
    status: event.status,
    changedAt: event.changedAt.toISOString(),
    note: event.note ?? undefined,
  }));

  return {
    trackingCode: doc.trackingCode,
    status: doc.status,
    sender: toParty(doc.sender),
    receiver: { ...toParty(doc.receiver), email: doc.receiver.email ?? undefined },
    transportType: doc.transportType,
    weightKg: doc.weightKg,
    shipDate: doc.shipDate.toISOString(),
    expectedDelivery: doc.expectedDelivery?.toISOString(),
    amount: doc.amount ?? undefined,
    photo: toPhoto(doc),
    history,
    // "Last updated" means the last status change, not a Mongoose timestamp
    // bumped by an address correction the customer never sees.
    lastUpdatedAt: history.at(-1)?.changedAt ?? doc.updatedAt.toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Tracking codes                                                              */
/* -------------------------------------------------------------------------- */

/** `randomInt` rather than Math.random: a guessable tracking code is enumerable. */
export function generateTrackingCode(): string {
  let body = "";
  for (let i = 0; i < TRACKING_CODE_BODY_LENGTH; i += 1) {
    body += TRACKING_CODE_ALPHABET[randomInt(TRACKING_CODE_ALPHABET.length)];
  }
  return `${TRACKING_CODE_PREFIX}-${body}`;
}

/** 32^8 ≈ 1.1e12 codes, so a collision is already unlikely; the unique index is
 *  the real guarantee and this retry just turns a rare collision into a retry
 *  rather than a failed create. */
const CREATE_ATTEMPTS = 5;

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

/* -------------------------------------------------------------------------- */
/* Commands                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * `photo` is a separate argument rather than a field on `input` because the
 * upload happens at the action boundary: this service never sees a `File`, never
 * talks to Cloudinary, and stays testable with no network.
 */
export async function createShipment(
  input: ShipmentCreateValues,
  actorId: string,
  photo?: ShipmentPhoto,
): Promise<ShipmentDetail> {
  await connectToDatabase();

  const status = input.status ?? DEFAULT_SHIPMENT_STATUS;

  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt += 1) {
    try {
      const created = await Shipment.create({
        trackingCode: generateTrackingCode(),
        sender: input.sender,
        receiver: input.receiver,
        transportType: input.details.transportType,
        weightKg: input.details.weightKg,
        shipDate: input.details.shipDate,
        expectedDelivery: input.details.expectedDelivery,
        // Mongoose drops an undefined path entirely, so an absent photo writes no
        // empty subdocument.
        photo,
        status,
        // The creating status is itself the first history entry, so the timeline
        // is complete from the moment the record exists.
        statusHistory: [{ status, changedAt: new Date(), changedBy: actorId }],
      });

      return toDetail(created.toObject());
    } catch (error) {
      if (isDuplicateKeyError(error) && attempt < CREATE_ATTEMPTS - 1) continue;
      throw error;
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error("Could not allocate a unique tracking code");
}

/**
 * A photo can be ADDED to a shipment that has none, but never replaced or
 * removed: the record is the evidence of what was consigned, and an operator
 * swapping the picture afterwards would quietly rewrite that.
 *
 * The `photo: { $exists: false }` filter is what enforces it, not the hidden form
 * field — a Server Action is a public POST endpoint, so a crafted request must
 * hit the same wall as the UI. A shipment that already has one makes this a
 * silent no-op rather than an error: the field is not offered, so reaching here
 * with a photo means a stale page or a forged post, and neither deserves a
 * failed save of the text fields the operator did legitimately change.
 */
export async function updateShipment(
  id: string,
  input: ShipmentUpdateValues,
  photo?: ShipmentPhoto,
): Promise<ShipmentDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  if (photo) {
    await Shipment.updateOne({ _id: id, photo: { $exists: false } }, { $set: { photo } });
  }

  const { expectedDelivery } = input.details;

  const updated = await Shipment.findByIdAndUpdate(
    id,
    {
      $set: {
        sender: input.sender,
        receiver: input.receiver,
        transportType: input.details.transportType,
        weightKg: input.details.weightKg,
        shipDate: input.details.shipDate,
        ...(expectedDelivery ? { expectedDelivery } : {}),
      },
      // Mongoose STRIPS undefined from $set, so `expectedDelivery: undefined`
      // would be a silent no-op and a date could be set but never cleared. Mongo
      // rejects an empty $unset object, so the key is omitted entirely unless it
      // is actually needed — the same shape updateShipmentStatus uses for the
      // customs amount.
      ...(expectedDelivery ? {} : { $unset: { expectedDelivery: "" } }),
    },
    { returnDocument: "after", runValidators: true },
  ).lean<Lean>();

  return updated ? toDetail(updated) : null;
}

/**
 * The amount is touched ONLY on a move to `customs_held`, and then it is replaced
 * wholesale: a figure means "set it", an absent one means "clear it". The form
 * pre-fills the current value, so that reads as what-you-see-is-what-you-save,
 * and it is the only way to correct a mistyped charge.
 *
 * Moving to any other status leaves the amount untouched rather than clearing it
 * — it is the record of what customs actually levied, and losing it when the
 * shipment is released would destroy the only copy.
 */
export async function updateShipmentStatus(
  id: string,
  input: ShipmentStatusUpdateValues,
  actorId: string,
): Promise<ShipmentDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const setsAmount = input.status === AMOUNT_STATUS;
  const clearsAmount = setsAmount && input.amount === undefined;

  const updated = await Shipment.findByIdAndUpdate(
    id,
    {
      $set: {
        status: input.status,
        ...(setsAmount && input.amount !== undefined ? { amount: input.amount } : {}),
      },
      // Mongo rejects an empty $unset object, so the key is omitted entirely
      // unless it is actually needed.
      ...(clearsAmount ? { $unset: { amount: "" } } : {}),
      $push: {
        statusHistory: {
          status: input.status,
          changedAt: new Date(),
          changedBy: actorId,
          note: input.note,
        },
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean<Lean>();

  return updated ? toDetail(updated) : null;
}

export async function deleteShipment(id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();

  const result = await Shipment.findByIdAndDelete(id).lean<Lean>();
  return result !== null;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                     */
/* -------------------------------------------------------------------------- */

export async function getShipmentById(id: string): Promise<ShipmentDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const doc = await Shipment.findById(id).lean<Lean>();
  return doc ? toDetail(doc) : null;
}

/**
 * The public lookup, by the customer-facing handle.
 *
 * The code is normalised HERE as well as at the page boundary, mirroring
 * `getShipmentById`'s null-not-throw contract — and, more usefully, so that
 * malformed traffic on an unauthenticated route costs a regex rather than a
 * database round trip. That is the only rate limiting this route has, and it is
 * deliberate: see CLAUDE.md gap 14.
 *
 * `trackingCode` is stored `uppercase: true` and the schema uppercases, so this
 * is a plain equality hit on `shipment_trackingCode_uidx` — no regex, no scan.
 *
 * Returns `PublicShipment`, never `ShipmentDetail`: the document id and the
 * admin actor on each history entry must not cross this boundary.
 */
export async function getShipmentByTrackingCode(input: string): Promise<PublicShipment | null> {
  const parsed = trackingCodeSchema.safeParse(input);
  if (!parsed.success) return null;

  await connectToDatabase();

  const doc = await Shipment.findOne({ trackingCode: parsed.data }).lean<Lean>();
  return doc ? toPublic(doc) : null;
}

/**
 * Resolves a tracking code to just enough to point at the consignment.
 *
 * Exists for the support chat: a visitor can name a code in the pre-chat form,
 * and the conversation denormalises the result so the admin sees the consignment
 * beside the thread. `getShipmentByTrackingCode` cannot serve it because
 * `PublicShipment` deliberately has no `id`, and handing back a `ShipmentDetail`
 * would turn a public code path into a back door to the whole record.
 *
 * Projected at the database rather than mapped down from a full document, so the
 * narrow shape is enforced by the query and not by remembering to drop fields.
 * Returns null for a malformed code BEFORE connecting, like its sibling.
 */
export async function getShipmentLinkByTrackingCode(input: string): Promise<ShipmentLink | null> {
  const parsed = trackingCodeSchema.safeParse(input);
  if (!parsed.success) return null;

  await connectToDatabase();

  const doc = await Shipment.findOne({ trackingCode: parsed.data }, { trackingCode: 1 }).lean<{
    _id: unknown;
    trackingCode: string;
  } | null>();

  return doc ? { id: String(doc._id), trackingCode: doc.trackingCode } : null;
}

/** User input reaches a RegExp, so metacharacters must be neutralised or a
 *  search for "a.*" would become a wildcard scan. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listShipments(query: ShipmentListQuery): Promise<ShipmentPage> {
  await connectToDatabase();

  const filter: QueryFilter<ShipmentDocument> = {};
  if (query.status) filter.status = query.status;

  if (query.q) {
    const term = new RegExp(escapeRegExp(query.q), "i");
    filter.$or = [{ trackingCode: term }, { "sender.name": term }, { "receiver.name": term }];
  }

  const page = Math.max(1, query.page);
  const skip = (page - 1) * SHIPMENT_PAGE_SIZE;

  const [docs, total] = await Promise.all([
    Shipment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(SHIPMENT_PAGE_SIZE)
      .lean<Lean[]>(),
    Shipment.countDocuments(filter),
  ]);

  return {
    items: docs.map(toSummary),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / SHIPMENT_PAGE_SIZE)),
    pageSize: SHIPMENT_PAGE_SIZE,
  };
}
