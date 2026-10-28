"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

// The brief + contact form for a done-for-you package. Submits, then sends the
// customer to Paystack for the deposit.
export default function DfyOrderForm({ slug, questions, depositLabel }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/dfy/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, phone, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start your order.");
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      {questions.map((q) => (
        <label key={q.id} className="block">
          <span className="text-sm font-medium text-gray-700">
            {q.label} {q.required && <span className="text-red-500">*</span>}
          </span>
          {q.long ? (
            <textarea
              className="input mt-1 min-h-[96px]"
              required={q.required}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          ) : (
            <input
              className="input mt-1"
              required={q.required}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          )}
        </label>
      ))}

      <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Your name <span className="text-red-500">*</span></span>
          <input className="input mt-1" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email (your files go here) <span className="text-red-500">*</span></span>
          <input className="input mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-gray-700">WhatsApp / phone (optional, for quick questions)</span>
          <input className="input mt-1" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Starting secure payment…" : `Pay ${depositLabel} deposit and start →`}
      </button>
      <p className="text-center text-xs text-gray-400">
        Secure payment by Paystack. You pay the balance only after you approve the work.
      </p>
    </form>
  );
}
