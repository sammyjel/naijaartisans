"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY = { name: "", phone: "", email: "", categoryId: "", city: "", title: "", description: "", budget: "", source: "facebook", consent: false };

// "Post a job for a customer": the owner types in a request the customer agreed
// to share, and it goes out to artisans like any other job.
export default function AdminPostJobForm({ categories }) {
  const router = useRouter();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed.");
      const n = data.notified || {};
      setMsg({
        ok: true,
        text: `Posted. ${n.emailed || 0} artisan(s) emailed${n.eligible === 0 ? " — no artisan on the site lists this trade yet" : ""}. ${data.customerCreated ? "A customer account was created for them." : "Added to their existing account."}`,
        jobId: data.job?.id,
      });
      setF(EMPTY);
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card mt-5 space-y-3 p-5">
      <h2 className="font-bold">Post a job for a customer</h2>
      <p className="text-sm text-gray-600">
        For someone who replied to you on WhatsApp, Facebook or X and agreed to have their job posted. Only enter details
        they gave you themselves. Never copy them from someone else's post.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input className="input" placeholder="Customer name *" value={f.name} onChange={set("name")} />
        <input className="input" placeholder="Customer phone * (0803…)" value={f.phone} onChange={set("phone")} />
        <input className="input" placeholder="Customer email (optional)" value={f.email} onChange={set("email")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="input" value={f.categoryId} onChange={set("categoryId")}>
          <option value="">Trade *</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" placeholder="City / area * (e.g. Lekki, Lagos)" value={f.city} onChange={set("city")} />
        <input className="input" placeholder="Budget in ₦ (optional)" value={f.budget} onChange={set("budget")} inputMode="numeric" />
      </div>
      <input className="input w-full" placeholder="Job title * (e.g. Fix leaking kitchen sink)" value={f.title} onChange={set("title")} />
      <textarea className="input w-full" rows={3} placeholder="What needs doing, and when? *" value={f.description} onChange={set("description")} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Found on{" "}
          <select className="input py-1" value={f.source} onChange={set("source")}>
            <option value="facebook">Facebook</option>
            <option value="x">X (Twitter)</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="nairaland">Nairaland</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={f.consent} onChange={set("consent")} />
        <span>The customer agreed to this job being posted on NaijaArtisans and to artisans contacting them about it.</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Posting and alerting artisans…" : "Post job and alert artisans"}</button>
        {msg && (
          <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>
            {msg.text} {msg.jobId && <a href={`/jobs/${msg.jobId}`} className="font-semibold underline">Open job</a>}
          </span>
        )}
      </div>
    </form>
  );
}
