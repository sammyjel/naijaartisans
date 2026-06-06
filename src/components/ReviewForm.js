"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import Link from "next/link";

export default function ReviewForm({ targetId }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!user)
    return (
      <p className="text-sm text-gray-500">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link> to leave a review.
      </p>
    );
  if (user.id === targetId) return <p className="text-sm text-gray-400">This is your profile.</p>;

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit review.");
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <p className="text-sm font-medium text-brand-700">Thanks for your review! ✓</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-2xl ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="input"
        rows={3}
        placeholder="Share your experience with this artisan…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <button className="btn-primary" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
