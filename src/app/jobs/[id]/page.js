"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { naira, timeAgo } from "@/lib/format";

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [job, setJob] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // quote form
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/jobs/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => {
        setJob(d.job);
        setIsOwner(d.isOwner);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendQuote(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${id}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, price }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send quote.");
        return;
      }
      setMessage("");
      setPrice("");
      load();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(status) {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (loading || authLoading) return <div className="container-page py-12 text-center text-gray-500">Loading…</div>;
  if (notFound || !job)
    return (
      <div className="container-page py-12 text-center">
        <p className="text-lg font-semibold">Job not found</p>
        <Link href="/jobs" className="btn-primary mt-4">Back to job board</Link>
      </div>
    );

  const alreadyQuoted = user && job.quotes.some((q) => q.artisan.id === user.id);

  return (
    <div className="container-page py-8">
      <Link href="/jobs" className="text-sm text-gray-500 hover:text-brand-700">← Back to job board</Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Job */}
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="badge">{job.category.icon} {job.category.name}</span>
              <span className={`text-xs font-semibold ${job.status === "OPEN" ? "text-brand-600" : "text-gray-400"}`}>
                {job.status}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>📍 {job.city}</span>
              {job.budget ? <span>💰 Budget {naira(job.budget)}</span> : null}
              <span>Posted by {job.customer.name}</span>
              <span className="text-gray-400">· {timeAgo(job.createdAt)}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-gray-700">{job.description}</p>

            {isOwner && (
              <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                {job.status === "OPEN" ? (
                  <button onClick={() => setStatus("CLOSED")} className="btn-outline">Mark as closed</button>
                ) : (
                  <button onClick={() => setStatus("OPEN")} className="btn-outline">Reopen job</button>
                )}
              </div>
            )}
          </div>

          {/* Quotes */}
          <div className="card p-6">
            <h2 className="text-lg font-bold">Quotes ({job.quotes.length})</h2>
            <div className="mt-4 space-y-4">
              {job.quotes.length === 0 ? (
                <p className="text-gray-500">No quotes yet.</p>
              ) : (
                job.quotes.map((q) => (
                  <div key={q.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/artisans/${q.artisan.id}`} className="font-semibold text-brand-700 hover:underline">
                        {q.artisan.name}
                      </Link>
                      {q.price ? <span className="font-semibold">{naira(q.price)}</span> : <span className="text-sm text-gray-400">Price on request</span>}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{q.message}</p>
                    <p className="mt-1 text-xs text-gray-400">{q.artisan.city} · {timeAgo(q.createdAt)}</p>
                    {/* Owner sees contact details of quoting artisans */}
                    {isOwner && (
                      <div className="mt-2 flex gap-3 text-sm">
                        {q.artisan.phone && <a href={`tel:${q.artisan.phone}`} className="font-medium text-brand-700">📞 {q.artisan.phone}</a>}
                        {q.artisan.email && <a href={`mailto:${q.artisan.email}`} className="font-medium text-brand-700">✉️ Email</a>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Send a quote</h2>
            {!user ? (
              <div className="mt-3">
                <p className="text-sm text-gray-500">Log in as an artisan to send a quote.</p>
                <Link href="/login" className="btn-primary mt-3 w-full">Log in</Link>
              </div>
            ) : isOwner ? (
              <p className="mt-3 text-sm text-gray-500">This is your job posting. You'll see quotes here as artisans respond.</p>
            ) : user.role !== "ARTISAN" ? (
              <p className="mt-3 text-sm text-gray-500">Only artisans can send quotes. Register as an artisan to bid on jobs.</p>
            ) : job.status !== "OPEN" ? (
              <p className="mt-3 text-sm text-gray-500">This job is closed.</p>
            ) : alreadyQuoted ? (
              <p className="mt-3 text-sm font-medium text-brand-700">✓ You've already sent a quote for this job.</p>
            ) : (
              <form onSubmit={sendQuote} className="mt-3 space-y-3">
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div>
                  <label className="label">Your price <span className="text-gray-400">(₦, optional)</span></label>
                  <input className="input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 12000" />
                </div>
                <div>
                  <label className="label">Message</label>
                  <textarea
                    className="input"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself and how you'll handle the job."
                    required
                  />
                </div>
                <button className="btn-primary w-full" disabled={submitting}>
                  {submitting ? "Sending…" : "Send quote"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
