"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/constants";

// "No-Wahala Hiring Kit" opt-in for customers. WhatsApp-first capture.
export default function CustomerLeadForm({ source = "hiring-kit" }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", whatsapp: "", trade: "", city: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Please enter your name.");
    if (form.whatsapp.replace(/\D/g, "").length < 7) return setError("Enter a valid WhatsApp number.");
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, side: "CUSTOMER", source, magnet: "hiring-kit" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      router.push(`/hiring-kit/thanks?name=${encodeURIComponent(form.name.trim().split(" ")[0])}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label">Your name</label>
        <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Grace A." required />
      </div>
      <div>
        <label className="label">WhatsApp number</label>
        <input
          className="input"
          value={form.whatsapp}
          onChange={(e) => update("whatsapp", e.target.value)}
          placeholder="e.g. 0803 123 4567"
          inputMode="tel"
          required
        />
        <p className="mt-1 text-xs text-gray-400">We send your kit here. We never share it or spam you.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Service you need <span className="text-gray-400">(optional)</span></label>
          <select className="input" value={form.trade} onChange={(e) => update("trade", e.target.value)}>
            <option value="">Any service</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">City <span className="text-gray-400">(optional)</span></label>
          <select className="input" value={form.city} onChange={(e) => update("city", e.target.value)}>
            <option value="">Select city</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Email <span className="text-gray-400">(optional)</span></label>
        <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="So we can email your kit too" />
      </div>
      <button className="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? "Sending your kit…" : "📩 Send me the free Hiring Kit"}
      </button>
      <p className="text-center text-xs text-gray-400">Free. No spam. Unsubscribe anytime.</p>
    </form>
  );
}
