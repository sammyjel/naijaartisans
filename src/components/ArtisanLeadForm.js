"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CITIES } from "@/lib/constants";

// Founding-Artisan opt-in. Captures WhatsApp-first (Nigeria), low friction.
export default function ArtisanLeadForm({ source = "founding-artisan" }) {
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
    if (!form.trade) return setError("Please choose your trade.");
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, side: "ARTISAN", source, magnet: "founding-artisan" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      router.push(`/founding-artisan/thanks?name=${encodeURIComponent(form.name.trim().split(" ")[0])}`);
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
        <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Samuel O." required />
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
        <p className="mt-1 text-xs text-gray-400">This is how we send you job leads. We never share it publicly.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Your trade</label>
          <select className="input" value={form.trade} onChange={(e) => update("trade", e.target.value)} required>
            <option value="">Select your trade</option>
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
        <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="So we can send your free guide" />
      </div>
      <button className="btn-primary w-full py-3 text-base" disabled={loading}>
        {loading ? "Claiming your spot…" : "🔒 Claim my Founding Artisan spot — FREE"}
      </button>
      <p className="text-center text-xs text-gray-400">No payment. No spam. Just job leads.</p>
    </form>
  );
}
