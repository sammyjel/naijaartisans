"use client";

// "My transactions" — the deals the logged-in user is party to, on either side.
//
// The buttons come from the server (availableActions), not from logic repeated
// here. That matters more than it looks: the one rule this feature depends on is
// that an artisan cannot confirm their own completion, and a client-side copy of
// that rule is a copy that can drift out of step with the API that enforces it.

import { useEffect, useState } from "react";

const STATUS_STYLE = {
  IN_PROGRESS: { label: "Transaction in process", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  AWAITING_CONFIRMATION: {
    label: "Waiting for customer to confirm",
    cls: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  COMPLETED: { label: "Completed", cls: "bg-green-50 text-green-700 ring-green-200" },
  CANCELLED: { label: "Cancelled", cls: "bg-gray-100 text-gray-500 ring-gray-200" },
};

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.IN_PROGRESS;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function DealsPanel() {
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [noteFor, setNoteFor] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/deals");
      if (!res.ok) {
        setDeals([]);
        return;
      }
      const data = await res.json();
      setDeals(data.deals || []);
    } catch {
      setError("Could not load your transactions.");
      setDeals([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(dealId, action) {
    // Confirming is what moves a real number on someone's public profile, so it
    // asks once rather than firing on a stray click.
    if (action === "confirm" && !window.confirm("Confirm this job was completed? This adds to the artisan's public completed-jobs count and cannot be undone.")) {
      return;
    }
    setError("");
    setBusyId(dealId + action);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: noteFor === dealId ? note : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "That did not work.");
        return;
      }
      setNoteFor("");
      setNote("");
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId("");
    }
  }

  if (deals === null) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-bold">My transactions</h2>
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">My transactions</h2>
      <p className="text-sm text-gray-500">
        Every job you are working on or had done. A job only counts as completed once the customer
        confirms it.
      </p>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {deals.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No transactions yet. A transaction starts when a customer accepts a quote on their job.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {deals.map((d) => {
            const other = d.you === "customer" ? d.artisan : d.customer;
            return (
              <div key={d.id} id={`deal-${d.id}`} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{d.title}</div>
                    <div className="mt-0.5 text-sm text-gray-500">
                      {d.you === "customer" ? "Artisan" : "Customer"}: {other?.name}
                      {d.agreedPrice ? ` · agreed ${naira(d.agreedPrice)}` : ""}
                    </div>
                  </div>
                  <Badge status={d.status} />
                </div>

                {/* Contact details, so the two sides can actually reach each other. */}
                {other && (other.phone || other.email) && d.status !== "CANCELLED" && (
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {other.phone && (
                      <a href={`tel:${other.phone}`} className="font-medium text-brand-700">
                        📞 {other.phone}
                      </a>
                    )}
                    {other.email && (
                      <a href={`mailto:${other.email}`} className="font-medium text-brand-700">
                        ✉️ Email
                      </a>
                    )}
                  </div>
                )}

                {d.lastNote && (
                  <p className="mt-2 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    “{d.lastNote}”
                  </p>
                )}

                {/* The artisan is told plainly why they cannot finish it themselves. */}
                {d.status === "AWAITING_CONFIRMATION" && d.you === "artisan" && (
                  <p className="mt-2 text-sm text-amber-700">
                    Waiting for {other?.name} to confirm. It counts towards your completed-jobs
                    record once they do — which is why the number on your profile is worth something.
                  </p>
                )}

                {d.status === "COMPLETED" && (
                  <p className="mt-2 text-sm text-green-700">
                    Confirmed{d.completedAt ? ` on ${new Date(d.completedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
                    {d.you === "customer" && !d.review && " You can rate this artisan on their profile."}
                  </p>
                )}

                {noteFor === d.id && (
                  <input
                    className="input mt-3"
                    placeholder="Add a short note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                  />
                )}

                {d.actions?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {d.actions.map((a) => (
                      <button
                        key={a.action}
                        className={a.action === "confirm" ? "btn-primary" : "btn-outline"}
                        disabled={busyId !== ""}
                        onClick={() => {
                          if ((a.action === "dispute" || a.action === "cancel") && noteFor !== d.id) {
                            setNoteFor(d.id);
                            setNote("");
                            return;
                          }
                          act(d.id, a.action);
                        }}
                      >
                        {busyId === d.id + a.action ? "Working…" : a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
