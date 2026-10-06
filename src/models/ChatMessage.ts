import "server-only";

import { Schema, type InferSchemaType, type Model } from "mongoose";

import { connection } from "@/lib/db";
import { CHAT_AUTHORS } from "@/validations/chat";

/**
 * One message in a support conversation. Immutable once written.
 *
 * Lives in its own collection rather than embedded in `ChatConversation` — see
 * that file for why, and for the deletion ordering that choice forces.
 *
 * Indexes are declared here but NOT created implicitly — `lib/db.ts` sets
 * `autoIndex: false` in production. Run `npm run db:indexes` after changing any
 * index (rule 16).
 */

/**
 * A Cloudinary-hosted attachment. Optional as a whole — most messages are text —
 * but every field inside is required, exactly like `photoSchema`: a record with
 * no `url` would render as a broken image, which is worse than no attachment.
 *
 * `publicId` is stored but mapped into NO DTO. Nothing in the UI needs it (both
 * sides render a plain `<img>`), and it is the handle a future orphan sweep
 * diffs against the `sendly/chat` folder — `db.chatmessages.distinct(
 * "image.publicId")` reads it straight from Mongo, not through a service.
 *
 * `width`/`height` describe the ORIGINAL upload, not the transformed delivery
 * URL the service's mapper produces, so they are usable for aspect ratio and
 * never as pixel dimensions.
 */
const chatImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const chatMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, required: true },
    /**
     * The cursor: per-conversation, gap-free, strictly increasing, allocated by
     * `$inc: { lastSeq: 1 }` on the parent conversation (rule 44).
     *
     * `min: 1` is load-bearing beyond sanity-checking. The client's optimistic
     * entries use NEGATIVE seqs, so this guarantees a real message can never
     * collide with one and the poll's dedupe-by-seq cannot double-render.
     */
    seq: { type: Number, required: true, min: 1 },
    author: { type: String, enum: CHAT_AUTHORS, required: true },
    /** The admin user id on an admin message. Never mapped into any DTO. */
    authorId: { type: String },
    /**
     * Optional ONLY because an image-only message is legal — and only once the
     * visitor has sent at least one text message. "At least one of body or
     * image" is enforced by the service, which is the only layer that sees both.
     */
    body: { type: String, trim: true },
    image: { type: chatImageSchema },
    sentAt: { type: Date, required: true, default: () => new Date() },
  },
  {
    /**
     * No `timestamps`, unlike every other schema here. A message is immutable:
     * `sentAt` is the single authority on when it happened, and an `updatedAt`
     * on a record nothing updates is a lie waiting to be believed. `createdAt`
     * would also simply duplicate `sentAt`.
     */
    timestamps: false,
    /** Pinned explicitly — see the note in ChatConversation.ts. */
    collection: "chatmessages",
  },
);

/**
 * One index doing two jobs: it serves the cursor poll
 * (`{ conversationId, seq: { $gt: n } }` sorted by `seq`, a covered range scan),
 * and being UNIQUE it turns a duplicate `seq` into a hard 11000 rather than a
 * silently reordered thread.
 *
 * `conversationId` alone needs no index — this compound's prefix already covers
 * the `deleteMany({ conversationId })` that deletion runs.
 */
chatMessageSchema.index(
  { conversationId: 1, seq: 1 },
  { name: "chat_message_conversation_seq_uidx", unique: true },
);

export type ChatMessageDocument = InferSchemaType<typeof chatMessageSchema>;

export const ChatMessage: Model<ChatMessageDocument> =
  (connection.models.ChatMessage as Model<ChatMessageDocument> | undefined) ??
  connection.model<ChatMessageDocument>("ChatMessage", chatMessageSchema);
