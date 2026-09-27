"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

// The in-app half of the notification system.
//
// The email gets an artisan's attention; this is what they see when they come
// back to the site, and it is the only place a notification survives a deleted
// email. Each row is a link straight to the job, because "New job available ->
// View job -> Submit quote" is the whole point: an artisan who has to go hunting
// for the job on the board is an artisan who does not quote.

export default function NotificationsPanel({ role }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
      setError("");
    } catch {
      setError("Could not load your notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    // Optimistic: the badge should clear the moment it is clicked.
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function markOneRead(id) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  if (loading) {
    return (
      <section className="card mt-6 p-5">
        <p className="text-sm text-gray-500">Loading notifications…</p>
      </section>
    );
  }

  const isArtisan = role === "ARTISAN";

  return (
    <section className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          Notifications
          {unread > 0 && (
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
              {unread} new
            </span>
          )}
        </h2>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-brand-700 hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">
          {isArtisan
            ? "No job alerts yet. You'll be emailed and notified here the moment a customer posts a job that matches the services on your profile — so keep your services and city up to date."
            : "Nothing here yet. When an artisan sends a quote on one of your jobs, it will show up here."}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((n) => {
            const isNew = !n.readAt;
            return (
              <li key={n.id} className={isNew ? "bg-brand-50/40" : ""}>
                <Link
                  href={n.url}
                  onClick={() => isNew && markOneRead(n.id)}
                  className="flex items-start gap-3 px-1 py-3 transition hover:bg-gray-50"
                >
                  <span aria-hidden className="mt-0.5 text-lg">
                    {n.type === "NEW_QUOTE" ? "💬" : "🔔"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`truncate text-sm ${isNew ? "font-bold" : "font-medium"}`}>
                        {n.title}
                      </span>
                      {isNew && (
                        <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                          New
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-gray-500">{n.body}</span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 self-center text-sm font-semibold text-brand-700">
                    {n.type === "NEW_QUOTE" ? "See quote →" : "View job →"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
