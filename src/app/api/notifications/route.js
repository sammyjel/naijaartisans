import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
} from "@/lib/notifications";

// Every read and write here is scoped to the logged-in user inside the lib
// functions, so there is no id in the query string that could be swapped for
// someone else's.

// GET /api/notifications - the current user's inbox + unread count
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const [notifications, unread] = await Promise.all([
    listNotifications(user.id),
    unreadNotificationCount(user.id),
  ]);

  return NextResponse.json({ notifications, unread });
}

// POST /api/notifications - mark one as read, or all of them
// body: { id?: string, all?: boolean }
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : null;

  if (!id && !body.all)
    return NextResponse.json({ error: "Pass an id, or all: true." }, { status: 400 });

  const updated = await markNotificationsRead(user.id, id);
  const unread = await unreadNotificationCount(user.id);
  return NextResponse.json({ updated, unread });
}
