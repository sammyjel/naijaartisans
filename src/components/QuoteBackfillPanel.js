"use client";

// Admin control for the one-off "tell customers about the quotes they never
// saw" send.
//
// Same discipline as the job backfill: preview runs the identical code path as
// the send, and sending needs SEND typed, because these are real emails to real
// customers and cannot be recalled.

import { useState } from "react";

function Fig({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className={`text-2xl font-extrabold ${accent || "text-gray-900"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default function QuoteBackfillPanel() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState("");

  async function call(send) {
    setError("");
    setBusy(send ? "sending" : "previewing");
    try {
      const res = await fetch("/api/admin/notifications/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "quotes", send }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.error || "Request failed.");
        return;
      }
      if (send) {
        setResult(data);
        setConfirm("");
      } else {
        setPreview(data);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy("");
    }
  }

  const p = preview;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Quotes the customer never saw</h2>
      <p className="text-sm text-gray-500">
        Artisans replied to these jobs before notifications were running, so nobody told the customer.
        This sends each customer one email listing the quotes waiting on their job.
      </p>

      <div className="mt-3 rounded-lg border border-gray-200 p-4">
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {result && result.emailsFailed > 0 && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {result.emailsFailed} email{result.emailsFailed === 1 ? "" : "s"} did not go out. Preview
            again and re-send — only the ones still owed are retried.
          </div>
        )}

        {!p && !result && (
          <button className="btn-outline" onClick={() => call(false)} disabled={busy !== ""}>
            {busy === "previewing" ? "Checking…" : "Preview what would be sent"}
          </button>
        )}

        {p && !result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fig label="Quotes never notified" value={p.pendingQuotes} accent="text-red-600" />
              <Fig label="Customers to tell" value={p.withEmail} accent="text-brand-700" />
              <Fig label="No email address" value={p.withoutEmail} accent="text-amber-600" />
              <Fig label="Quotes in total" value={p.totalQuotes} />
            </div>

            {p.perCustomer?.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 font-semibold">Jobs</th>
                      <th className="px-3 py-2 font-semibold">Quotes waiting</th>
                      <th className="px-3 py-2 font-semibold">Reachable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.perCustomer.map((c) => (
                      <tr key={c.name}>
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2 text-gray-500">{c.jobs}</td>
                        <td className="px-3 py-2 font-semibold">{c.quotes}</td>
                        <td className="px-3 py-2">
                          {c.hasEmail ? (
                            <span className="text-green-700">email</span>
                          ) : (
                            <span className="text-amber-600">no email</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-sm text-gray-600">
              One email each, covering all their waiting quotes — nobody gets two emails about the
              same job. Safe to run again: anyone already emailed is skipped.
            </p>

            {p.pendingQuotes > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  className="input max-w-[12rem]"
                  placeholder="Type SEND to confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <button
                  className="btn-primary"
                  onClick={() => call(true)}
                  disabled={confirm.trim().toUpperCase() !== "SEND" || busy !== ""}
                >
                  {busy === "sending" ? "Sending…" : `Send ${p.withEmail} email${p.withEmail === 1 ? "" : "s"}`}
                </button>
                <button className="btn-outline" onClick={() => setPreview(null)} disabled={busy !== ""}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        {result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fig label="Emails sent" value={result.emailsSent} accent="text-green-700" />
              <Fig label="Failed" value={result.emailsFailed} accent={result.emailsFailed ? "text-red-600" : ""} />
              <Fig label="Notifications created" value={result.notificationsCreated} />
              <Fig label="Unreachable" value={result.withoutEmail} accent="text-amber-600" />
            </div>
            {result.error && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{result.error}</div>
            )}
            <p className="mt-3 text-sm text-gray-600">
              Watch these jobs over the next few days — a customer who now hires someone will move the
              job into a transaction you can follow up on above.
            </p>
            <div className="mt-3">
              <button
                className="btn-outline"
                onClick={() => {
                  setResult(null);
                  setPreview(null);
                }}
              >
                Check again
              </button>
            </div>
            {result.log?.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-gray-500">Run log</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
                  {result.log.join("\n")}
                </pre>
              </details>
            )}
          </>
        )}
      </div>
    </section>
  );
}
