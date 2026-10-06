import { NextResponse, type NextRequest } from "next/server";

import { verifySession } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { countUnreadConversations, pollAdminMessages } from "@/services/chat.service";
import type { AdminPoll } from "@/types/chat";
import { chatCursorSchema } from "@/validations/chat";

/**
 * The admin's half of the chat transport.
 *
 * Two jobs in one endpoint, because they share a session check and the topbar
 * bell needs only the cheaper half:
 *   - no `conversationId` → `{ unread }`, which is all the bell polls for
 *   - with one           → the thread's new messages as well
 *
 * No `export const dynamic`: Route Handlers are not cached in this version of
 * Next and this one reads a session, so it would be dead configuration
 * (rule 54).
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: AdminPoll, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(request: NextRequest): Promise<Response> {
  /**
   * `verifySession()`, NEVER `requireAdmin()` (rule 64).
   *
   * `requireAdmin()` redirects, and `fetch` follows redirects by default — so
   * this endpoint would hand the client the login page's HTML with a 200 status
   * and the poll would `JSON.parse` it. A bare 401 is something the client can
   * actually act on, and it stops polling rather than backing off forever.
   */
  const session = await verifySession();
  if (!session) return new NextResponse(null, { status: 401, headers: NO_STORE });

  const params = request.nextUrl.searchParams;
  const conversationId = params.get("conversationId");

  try {
    if (!conversationId) {
      return json({ unread: await countUnreadConversations() });
    }

    const after = chatCursorSchema.parse(params.get("after") ?? 0);

    // Sequential, not Promise.all, and the order matters: polling a thread is
    // what marks it read, so counting afterwards is what makes the bell drop to
    // zero in the same tick the admin opens the conversation. Counting first
    // would report a stale number for one whole poll interval.
    const thread = await pollAdminMessages(conversationId, after);
    const unread = await countUnreadConversations();

    if (!thread) {
      // Deleted, or a malformed id. 404 so the client stops polling a thread
      // that cannot come back, rather than treating it as a transient error.
      return NextResponse.json({ unread }, { status: 404, headers: NO_STORE });
    }

    return json({
      unread,
      status: thread.status,
      messages: thread.messages,
      cursor: thread.cursor,
      hasMore: thread.hasMore,
    });
  } catch (error) {
    logger.error("admin chat poll failed", { error, actorId: session.userId });
    return new NextResponse(null, { status: 500, headers: NO_STORE });
  }
}
