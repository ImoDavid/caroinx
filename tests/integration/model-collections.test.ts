import { describe, expect, it } from "vitest";

import { ChatConversation } from "@/models/ChatConversation";
import { ChatMessage } from "@/models/ChatMessage";
import { Shipment } from "@/models/Shipment";

import { INDEXES } from "../../scripts/sync-indexes.ts";

/**
 * Ties each model's real collection name to the strings `scripts/sync-indexes.ts`
 * hard-codes.
 *
 * The failure this catches is invisible otherwise: `sync-indexes.test.ts` checks
 * that every declared index is CREATED, and counts them, but never that any of
 * them landed on a collection a model actually uses. A wrong name — a bad guess
 * at Mongoose's pluraliser, which smashes `ChatConversation` to
 * "chatconversations" rather than snake_casing it — would index an empty
 * collection, report "created", pass CI, and leave the real collection
 * unindexed in production. That is precisely the class of bug the script exists
 * to prevent, applied to the script itself.
 *
 * Separate from `sync-indexes.test.ts` because importing a model registers it on
 * the app's cached connection, where `autoIndex` is on outside production —
 * Mongoose would then create indexes in that file's database and race the script
 * under test. Nothing here does I/O: `model.collection.name` is metadata read
 * off the compiled schema.
 */

const MODELS = [
  { label: "Shipment", model: Shipment },
  { label: "ChatConversation", model: ChatConversation },
  { label: "ChatMessage", model: ChatMessage },
] as const;

describe("model collection names", () => {
  const indexed = new Set(INDEXES.map((index) => index.collection));

  it.each(MODELS)("indexes the collection $label actually writes to", ({ model }) => {
    expect(indexed).toContain(model.collection.name);
  });

  it("pins the smashed names, so a pluraliser change cannot go unnoticed", () => {
    expect(ChatConversation.collection.name).toBe("chatconversations");
    expect(ChatMessage.collection.name).toBe("chatmessages");
    expect(Shipment.collection.name).toBe("shipments");
  });

  it("declares no index for a collection no model owns", () => {
    // Catches the reverse mistake: an entry left behind after a rename. The
    // better-auth tables have no Mongoose model here, so they are exempt.
    const betterAuth = new Set(["user", "session", "account", "verification", "rateLimit"]);
    const owned = new Set(MODELS.map(({ model }) => model.collection.name));

    for (const collection of indexed) {
      if (betterAuth.has(collection)) continue;
      expect(owned).toContain(collection);
    }
  });
});
