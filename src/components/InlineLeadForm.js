"use client";

import Link from "next/link";
import { useState } from "react";

// Compact WhatsApp-first lead capture, reused by the exit-intent popup and the
// end-of-guide opt-in. Posts to /api/leads and shows its own success state.
export default function InlineLeadForm({
  side = "CUSTOMER",
  source = "inline",
  magnet = "hiring-kit",
  cta = "Send it to me",
  successText,
  onDone,
}) {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setErr("Please enter your name.");
    if (whatsapp.replace(/\D/g, "").length < 7) return setErr("Enter a valid WhatsApp number.");
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, whatsapp, side, source, magnet }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Something went wrong. Try again.");
        return;
      }
      setDone(true);
      onDone?.();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-brand-50 p-4 text-center text-sm text-brand-800">
        ✅ {successText || "Done! We'll reach you on WhatsApp shortly."}{" "}
        <Link href="/post-job" className="font-semibold underline">Post a job free →</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="WhatsApp number" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      </div>
      <button disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : cta}</button>
      <p className="text-center text-[11px] text-gray-400">Free. No spam. We&apos;ll only WhatsApp you about this.</p>
    </form>
  );
}
