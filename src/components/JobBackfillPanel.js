"use client";

// Admin control for the one-off "catch up the old jobs" send.
//
// It lives in the dashboard rather than being a terminal command because the
// send needs a credential (RESEND_API_KEY) that only exists on Vercel, and the
// admin session cookie is the one form of authorisation the operator already
// holds. Preview is always available; sending requires typing SEND, because it
// dispatches real email to the whole artisan roster and cannot be undone.

import { useState } from "react";

export default function JobBackfillPanel() {
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
        body: JSON.stringify({ send }),
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
      <h2 className="text-lg font-bold">Catch up the old jobs</h2>
      <p className="text-sm text-gray-500">
        Jobs posted before alerts existed never reached anyone. This sends every artisan one digest
        covering all the currently open jobs, with their own trade at the top.
      </p>

      <div className="mt-3 rounded-lg border border-gray-200 p-4">
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {!p && !result && (
          <button className="btn-outline" onClick={() => call(false)} disabled={busy !== ""}>
            {busy === "previewing" ? "Checking…" : "Preview what would be sent"}
          </button>
        )}

        {result && result.emailsFailed > 0 && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {result.emailsFailed} email{result.emailsFailed === 1 ? "" : "s"} did not go out. Preview
            again and re-send — only the ones that failed will be retried.
          </div>
        )}

        {p && !result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Fig label="Open jobs" value={p.openJobs} />
              <Fig label="Emails to send" value={p.withEmail} accent="text-brand-700" />
              <Fig label="Already emailed" value={p.alreadyEmailed || 0} accent="text-green-700" />
              <Fig label="No email address" value={p.withoutEmail} accent="text-amber-600" />
            </div>

            {p.perJob?.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Job</th>
                      <th className="px-3 py-2 font-semibold">Trade / city</th>
                      <th className="px-3 py-2 font-semibold">Age</th>
                      <th className="px-3 py-2 font-semibold">Quotes</th>
                      <th className="px-3 py-2 font-semibold">On-trade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {p.perJob.map((j) => (
                      <tr key={j.jobId}>
                        <td className="px-3 py-2">{j.title}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {j.category} · {j.city}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{j.ageDays}d</td>
                        <td className={`px-3 py-2 ${j.quotes === 0 ? "font-semibold text-red-600" : ""}`}>
                          {j.quotes}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{j.onTrade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-4 text-sm text-gray-600">
              {p.alreadyEmailed > 0 ? (
                <>
                  {p.alreadyEmailed} artisan{p.alreadyEmailed === 1 ? " has" : "s have"} already had
                  their digest and {p.alreadyEmailed === 1 ? "is" : "are"} excluded. This sends only
                  the {p.withEmail} still owed one.
                </>
              ) : (
                <>
                  {p.withEmail} emails, one per artisan, instead of {p.openJobs} × {p.withEmail} ={" "}
                  {p.openJobs * p.withEmail} separate messages.
                </>
              )}{" "}
              Safe to run again — anyone who already received it is skipped.
            </p>

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
                {busy === "sending" ? "Sending…" : `Send ${p.withEmail} digests`}
              </button>
              <button className="btn-outline" onClick={() => setPreview(null)} disabled={busy !== ""}>
                Cancel
              </button>
            </div>
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
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {result.error}
              </div>
            )}
            <p className="mt-3 text-sm text-gray-600">
              A summary has been emailed to you. Watch the job board over the next few days — if
              quotes stay at zero, the problem is artisan responsiveness, not delivery.
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

function Fig({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className={`text-2xl font-extrabold ${accent || "text-gray-900"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}
