"use client";

// Posts kept off the job board because they look like an artisan advertising
// themselves (lib/job-screen.js). Nobody has been emailed about these.

import { useState } from "react";

export default function AdminHeldPosts({ posts }) {
  const [done, setDone] = useState({}); // id -> message
  const [busy, setBusy] = useState(null);

  async function review(id, decision) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/jobs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json().catch(() => ({}));
      const msg = !res.ok
        ? data.error || "Could not save."
        : decision === "reject"
        ? "Rejected — stays off the board."
        : `Approved — on the board, ${data.notified?.emailed ?? 0} artisans emailed.`;
      setDone((d) => ({ ...d, [id]: msg }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="held-posts" className="mt-8">
      <h2 className="text-lg font-bold">Held posts ({posts.length})</h2>
      <p className="text-sm text-gray-500">
        These look like artisans advertising themselves, not customers needing work. They are not on the job
        board and no artisan was emailed. Approve only a real job.
      </p>
      {posts.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Nothing waiting.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{p.title}</p>
                  <p className="text-xs text-gray-600">
                    {p.category?.name} · {p.city} · by {p.customer?.name} (
                    {p.customer?.role === "ARTISAN" ? "artisan account" : "customer account"}) ·{" "}
                    {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{String(p.description).slice(0, 400)}</p>
                </div>
                {done[p.id] ? (
                  <p className="text-sm font-medium text-gray-700">{done[p.id]}</p>
                ) : (
                  <div className="flex gap-2">
                    <button disabled={busy === p.id} onClick={() => review(p.id, "approve")} className="btn-primary">
                      Approve &amp; send
                    </button>
                    <button disabled={busy === p.id} onClick={() => review(p.id, "reject")} className="btn-outline">
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
