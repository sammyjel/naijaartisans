"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

// Right-side "Send a quote" panel. Server renders the job; this handles the
// logged-in artisan workflow and shows clear messaging for every other case.
export default function JobQuotePanel({ jobId, status, customerId, quotedArtisanIds }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendQuote(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/quotes`, {
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
      setSent(true);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  let body;
  if (loading) {
    body = <p className="mt-3 text-sm text-gray-400">Checking your account…</p>;
  } else if (!user) {
    body = (
      <div className="mt-3">
        <p className="text-sm text-gray-500">Log in as an artisan to send a quote and win this job.</p>
        <Link href={`/login?next=/jobs/${jobId}`} className="btn-primary mt-3 w-full">Log in</Link>
        <Link href="/register?role=artisan" className="btn-outline mt-2 w-full">Register as an artisan</Link>
      </div>
    );
  } else if (user.id === customerId) {
    body = <p className="mt-3 text-sm text-gray-500">This is your job posting. You&apos;ll see quotes here as artisans respond.</p>;
  } else if (user.role !== "ARTISAN") {
    body = <p className="mt-3 text-sm text-gray-500">Only artisans can send quotes. Register as an artisan to bid on jobs.</p>;
  } else if (status !== "OPEN") {
    body = <p className="mt-3 text-sm text-gray-500">This job is closed and no longer accepting quotes.</p>;
  } else if (sent || quotedArtisanIds.includes(user.id)) {
    body = <p className="mt-3 text-sm font-medium text-brand-700">✓ You&apos;ve already sent a quote for this job.</p>;
  } else {
    body = (
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
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Send a quote</h2>
      {body}
    </div>
  );
}
