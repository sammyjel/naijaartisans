"use client";

import { useState } from "react";

// "Invite artisans to get verified": shows the exact message first, then sends
// it from the site (in-app notice + email) in batches.
export default function AdminVerifyInvite() {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function call(send) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/artisans/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed.");
      if (send) {
        setMsg(`Sent ${data.emailed} email(s)${data.failed ? `, ${data.failed} failed` : ""}${data.skipped ? `, ${data.skipped} had no email (they still see it on their dashboard)` : ""}. ${data.left ? `${data.left} still to send. Press again tomorrow to send the next batch.` : "Everyone has been invited."}`);
        setPreview(null);
      } else {
        setPreview(data);
      }
    } catch (e) {
      setMsg(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="card mt-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Invite artisans to get verified</h2>
          <p className="text-sm text-gray-600">Sent from NaijaArtisans as a dashboard notice and an email, not from your phone.</p>
        </div>
        <button className="btn-outline" disabled={busy} onClick={() => call(false)}>{busy && !preview ? "Loading…" : "Preview message"}</button>
      </div>
      {preview && (
        <div className="mt-4 rounded-lg border bg-gray-50 p-4 text-sm">
          <div className="font-bold">{preview.preview.title}</div>
          <p className="mt-2 whitespace-pre-line text-gray-700">{preview.preview.body}</p>
          <div className="mt-2 text-xs text-gray-500">Button in the email: “Get verified” → their dashboard</div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {preview.remaining > 0 ? (
              <button className="btn-primary" disabled={busy} onClick={() => call(true)}>
                {busy ? "Sending…" : `Send to ${preview.batch} artisan(s) now`}
              </button>
            ) : (
              <span className="font-semibold text-green-700">Everyone eligible has already been invited.</span>
            )}
            <span className="text-xs text-gray-500">{preview.remaining} not yet invited. Sends up to 40 a day to stay within the email limit.</span>
          </div>
        </div>
      )}
      {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}
    </div>
  );
}
