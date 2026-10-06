"use client";

import { useState } from "react";

import { TRACKING_CODE_PREFIX } from "@/validations/shipment";

import type { StartInput } from "./chat-api";

/**
 * Client because it submits over `fetch` rather than navigating. Part of
 * `chat-launcher`'s island.
 */

/**
 * Name is the only required field. An inbox of anonymous threads is unusable,
 * but asking for more than a name before someone can describe their problem is
 * friction that loses the support request.
 *
 * The tracking code is the reason this exists rather than dropping the visitor
 * straight into a composer: a resolved code puts the consignment beside the
 * thread for the admin, which is the thing a hosted widget cannot do.
 */
export type ChatPrechatFormProps = {
  busy: boolean;
  error: string | null;
  onStart: (input: StartInput) => void;
};

const FIELD =
  "min-h-11 w-full rounded-xl bg-surface-container-low px-space-sm py-2.5 text-body-sm text-on-surface placeholder:text-text-muted focus:bg-white focus:ring-2 focus:ring-primary-container focus:outline-hidden";
const LABEL = "block pb-1 text-label-sm font-semibold text-on-surface-variant";

export function ChatPrechatForm({ busy, error, onStart }: ChatPrechatFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  return (
    <form
      className="flex flex-col gap-space-sm overflow-y-auto px-space-md py-space-md"
      onSubmit={(event) => {
        event.preventDefault();
        if (busy || name.trim() === "") return;
        onStart({
          name: name.trim(),
          email: email.trim() || undefined,
          trackingCode: trackingCode.trim() || undefined,
        });
      }}
    >
      <p className="text-body-sm text-on-surface-variant">
        {/* Static, honest copy rather than a presence dot. Presence is recorded
            per conversation, so before one exists there is nothing truthful to
            show — the same instinct as the admin bell refusing a fabricated
            count. */}
        Tell us who you are and we will pick this up as soon as we can.
      </p>

      <div>
        <label htmlFor="chat-name" className={LABEL}>
          Your name
        </label>
        <input
          id="chat-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="chat-email" className={LABEL}>
          Email <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          id="chat-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={160}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="chat-code" className={LABEL}>
          Tracking code <span className="font-normal text-text-muted">(optional)</span>
        </label>
        <input
          id="chat-code"
          name="trackingCode"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          placeholder={`${TRACKING_CODE_PREFIX}-8F3K2QD7`}
          value={trackingCode}
          onChange={(event) => setTrackingCode(event.target.value)}
          className={FIELD}
        />
      </div>

      {error ? (
        <p role="alert" className="text-label-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || name.trim() === ""}
        className="mt-space-xs flex min-h-11 w-full items-center justify-center rounded-xl bg-primary-container px-space-md font-display text-title-sm font-bold text-white transition-colors hover:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:outline-none disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start chat"}
      </button>
    </form>
  );
}
