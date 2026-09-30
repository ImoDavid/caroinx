import "server-only";

import { Schema, type InferSchemaType, type Model } from "mongoose";

import { connection } from "@/lib/db";
import {
  DEFAULT_SHIPMENT_STATUS,
  SHIPMENT_STATUSES,
  TRANSPORT_TYPES,
} from "@/validations/shipment";

/**
 * A consignment. Its `trackingCode` is the public handle a customer looks up, so
 * that field carries the unique index.
 *
 * Indexes are declared here but NOT created implicitly — `lib/db.ts` sets
 * `autoIndex: false` in production. Run `npm run db:indexes` after changing any
 * index (CLAUDE.md rule 16).
 */

const partySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false },
);

const receiverSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

/**
 * Append-only. A status change pushes an entry rather than overwriting, so the
 * shipment carries its own audit trail — which is also what the public timeline
 * will render. Backfilling this later would be impossible.
 */
const statusEventSchema = new Schema(
  {
    status: { type: String, enum: SHIPMENT_STATUSES, required: true },
    changedAt: { type: Date, required: true, default: () => new Date() },
    /** The admin user id. Nullable so a future system/automated change can omit it. */
    changedBy: { type: String },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const shipmentSchema = new Schema(
  {
    trackingCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    sender: { type: partySchema, required: true },
    receiver: { type: receiverSchema, required: true },
    transportType: { type: String, enum: TRANSPORT_TYPES, required: true },
    weightKg: { type: Number, required: true, min: 0 },
    shipDate: { type: Date, required: true },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      required: true,
      default: DEFAULT_SHIPMENT_STATUS,
    },
    statusHistory: { type: [statusEventSchema], default: [] },
  },
  { timestamps: true },
);

// Supports the default list view (newest first) and the status filter.
shipmentSchema.index({ createdAt: -1 }, { name: "shipment_createdAt_idx" });
shipmentSchema.index({ status: 1, createdAt: -1 }, { name: "shipment_status_createdAt_idx" });

export type ShipmentDocument = InferSchemaType<typeof shipmentSchema>;

/**
 * Registered on the cached connection rather than the global mongoose instance,
 * and reused if already compiled — `next dev` re-executes this module on hot
 * reload, and re-registering the same name would throw OverwriteModelError.
 */
export const Shipment: Model<ShipmentDocument> =
  (connection.models.Shipment as Model<ShipmentDocument> | undefined) ??
  connection.model<ShipmentDocument>("Shipment", shipmentSchema);
