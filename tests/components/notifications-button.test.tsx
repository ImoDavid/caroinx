import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationsButton } from "@/components/admin/notifications-button";

/**
 * The admin's only notification surface.
 *
 * `usePathname` is mocked because the component needs it for a real reason —
 * Next rewrites `document.title` from the new route's metadata on every client
 * navigation, so the title effect has to re-run — and there is no app-router
 * context under jsdom. `fetch` is stubbed because the point of each case is what
 * the component does with a count, not how it fetches one.
 *
 * Deliberately NOT covered: polling cadence. Every scheduling decision lives in
 * `nextPollDelay` and is covered in `tests/unit/chat-poll-schedule.test.ts`
 * (rule 43).
 */

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

function stubUnread(unread: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ unread }),
        }) as unknown as Promise<Response>,
    ),
  );
}

beforeEach(() => {
  document.title = "Overview · Admin";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NotificationsButton", () => {
  it("renders no badge at all when nothing is waiting", async () => {
    // The principle the old doc comment protected: never suggest activity that
    // does not exist. Zero is silence, not a "0".
    stubUnread(0);
    render(<NotificationsButton />);

    const bell = await screen.findByRole("button", { name: "Notifications" });
    await waitFor(() => {
      expect(bell.textContent).toBe("");
    });
  });

  it("puts the count in the accessible name, not only in a coloured badge", async () => {
    stubUnread(3);
    render(<NotificationsButton />);

    const bell = await screen.findByRole("button", { name: "Notifications, 3 unread" });
    expect(bell.textContent).toContain("3");
  });

  it("caps the badge at 9+ so a long number cannot break the trigger", async () => {
    stubUnread(42);
    render(<NotificationsButton />);

    const bell = await screen.findByRole("button", { name: "Notifications, 42 unread" });
    // The visual badge is capped; the real number stays in the label.
    await waitFor(() => {
      expect(bell.textContent).toContain("9+");
    });
  });

  it("prefixes the document title, so a backgrounded tab shows the count", async () => {
    stubUnread(2);
    render(<NotificationsButton />);

    await waitFor(() => {
      expect(document.title).toBe("(2) Overview · Admin");
    });
  });

  it("strips its own prefix first, so the title cannot stack '(1) (2) '", async () => {
    // Next rewrites the title on every client navigation and the effect re-runs
    // on `pathname`; without the strip, each run would prepend again.
    document.title = "(7) Overview · Admin";
    stubUnread(2);
    render(<NotificationsButton />);

    await waitFor(() => {
      expect(document.title).toBe("(2) Overview · Admin");
    });
  });

  it("removes the prefix entirely once nothing is waiting", async () => {
    document.title = "(5) Overview · Admin";
    stubUnread(0);
    render(<NotificationsButton />);

    await waitFor(() => {
      expect(document.title).toBe("Overview · Admin");
    });
  });

  it("offers a route to the conversations that need a reply", async () => {
    stubUnread(4);
    render(<NotificationsButton />);

    await userEvent.click(await screen.findByRole("button", { name: /4 unread/ }));

    expect(screen.getByText("4 conversations are waiting for a reply.")).toBeInTheDocument();
    // Pre-filtered, so the click lands on exactly what the badge counted.
    expect(screen.getByRole("link", { name: "Open the inbox" })).toHaveAttribute(
      "href",
      "/admin/inbox?unread=1",
    );
  });

  it("says something honest in the panel when there is nothing to show", async () => {
    stubUnread(0);
    render(<NotificationsButton />);

    await userEvent.click(await screen.findByRole("button", { name: "Notifications" }));

    expect(screen.getByText(/Nothing waiting/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open the inbox" })).toBeNull();
  });

  it("stops polling instead of looping when the session has gone", async () => {
    // The handler answers 401 rather than redirecting (rule 64), precisely so
    // the client can tell "signed out" from "transient error" and give up.
    const fetchMock = vi.fn(
      () => Promise.resolve({ ok: false, status: 401 }) as unknown as Promise<Response>,
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationsButton />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const callsAfterFirst = fetchMock.mock.calls.length;

    // No badge, no title prefix, and no second attempt scheduled.
    expect(document.title).toBe("Overview · Admin");
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
