"use client";

// Admin view of the automatic follow-ups (src/lib/followups.js). They send by
// themselves every morning; this panel previews today's list and can send now.

import { useState } from "react";

const KIND_LABEL = {
  no_quotes: "No quotes yet",
  pick_quote: "Quoted, nobody hired",
  deal_check_in: "Hired, not marked done",
  confirm_done: "Done, not confirmed",
};

export default function FollowUpPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function run(send) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cron/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not run follow-ups.");
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 card p-5">
      <h2 className="text-lg font-bold">Automatic follow-ups</h2>
      <p className="mt-1 text-sm text-gray-500">
        Every morning at 9am (Lagos), anyone whose job has been stuck for a day and a half gets one
        reminder email, and you get the list. Nobody is reminded twice about the same stage.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => run(false)} disabled={busy} className="btn btn-outline disabled:opacity-50">
          {busy ? "Working…" : "Preview today's list"}
        </button>
        <button type="button" onClick={() => run(true)} disabled={busy} className="btn btn-primary disabled:opacity-50">
          Send now
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-4 text-sm">
          <p className="font-semibold">
            {result.dryRun
              ? `${result.stalled} reminder(s) due, ${result.wouldSend} not yet sent.`
              : `Sent ${result.emailed ?? 0} email(s)${result.failed ? `, ${result.failed} failed` : ""}${result.skipped ? `, ${result.skipped} skipped (no email address)` : ""}.`}
          </p>
          {result.items?.length > 0 && (
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {result.items.map((it, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>
                    <a href={`/jobs/${it.jobId}`} className="font-medium text-brand-700 hover:underline">{it.jobTitle}</a>
                    <span className="text-gray-400"> · {it.city}</span>
                  </span>
                  <span className="text-gray-500">
                    {KIND_LABEL[it.kind] || it.kind} → {it.to}
                    {it.already === "SENT" ? " · already reminded" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
