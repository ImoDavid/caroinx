import { randomInt } from "node:crypto";

// Mongoose 9 renamed FilterQuery to QueryFilter.
import { isValidObjectId, type QueryFilter } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { Shipment, type ShipmentDocument } from "@/models/Shipment";
import type { ShipmentDetail, ShipmentPage, ShipmentSummary } from "@/types/shipment";
import {
  DEFAULT_SHIPMENT_STATUS,
  SHIPMENT_PAGE_SIZE,
  TRACKING_CODE_ALPHABET,
  TRACKING_CODE_BODY_LENGTH,
  TRACKING_CODE_PREFIX,
  type ShipmentListQuery,
  type ShipmentCreateValues,
  type ShipmentStatusUpdateValues,
  type ShipmentUpdateValues,
} from "@/validations/shipment";

// Re-exported so server callers can keep importing the shapes from the service
// they got them from; client code must import from "@/types/shipment".
export type {
  ShipmentDetail,
  ShipmentPage,
  ShipmentStatusEvent,
  ShipmentSummary,
} from "@/types/shipment";

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

function toDetail(doc: Lean): ShipmentDetail {
  return {
    ...toSummary(doc),
    sender: {
      name: doc.sender.name,
      location: doc.sender.location,
      phone: doc.sender.phone ?? undefined,
    },
    receiver: {
      name: doc.receiver.name,
      location: doc.receiver.location,
      phone: doc.receiver.phone ?? undefined,
      email: doc.receiver.email ?? undefined,
    },
    statusHistory: doc.statusHistory.map((event) => ({
      status: event.status,
      changedAt: event.changedAt.toISOString(),
      changedBy: event.changedBy ?? undefined,
      note: event.note ?? undefined,
    })),
    updatedAt: doc.updatedAt.toISOString(),
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

export async function createShipment(
  input: ShipmentCreateValues,
  actorId: string,
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

export async function updateShipment(
  id: string,
  input: ShipmentUpdateValues,
): Promise<ShipmentDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const updated = await Shipment.findByIdAndUpdate(
    id,
    {
      $set: {
        sender: input.sender,
        receiver: input.receiver,
        transportType: input.details.transportType,
        weightKg: input.details.weightKg,
        shipDate: input.details.shipDate,
      },
    },
    { returnDocument: "after", runValidators: true },
  ).lean<Lean>();

  return updated ? toDetail(updated) : null;
}

export async function updateShipmentStatus(
  id: string,
  input: ShipmentStatusUpdateValues,
  actorId: string,
): Promise<ShipmentDetail | null> {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();

  const updated = await Shipment.findByIdAndUpdate(
    id,
    {
      $set: { status: input.status },
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
