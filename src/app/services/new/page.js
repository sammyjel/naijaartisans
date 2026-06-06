"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CITIES } from "@/lib/constants";

export default function NewServicePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", categoryId: "", city: "", priceMin: "", priceMax: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    if (user?.city) setForm((f) => ({ ...f, city: f.city || user.city }));
  }, [user]);

  useEffect(() => {
    if (!loading && user && user.role !== "ARTISAN") router.push("/dashboard");
  }, [loading, user, router]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create listing.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="container-page py-12 text-center text-gray-500">Loading…</div>;

  if (!user)
    return (
      <div className="container-page py-12">
        <div className="card mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Log in to list a service</h1>
          <Link href="/login" className="btn-primary mt-4">Log in</Link>
        </div>
      </div>
    );

  return (
    <div className="container-page py-10">
      <div className="card mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">List a service</h1>
        <p className="mt-1 text-gray-500">Show customers what you offer so they can find and hire you.</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Service title</label>
            <input
              className="input"
              placeholder="e.g. Expert plumbing & pipe repairs"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.categoryId} onChange={(e) => update("categoryId", e.target.value)} required>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <select className="input" value={form.city} onChange={(e) => update("city", e.target.value)} required>
              <option value="">Select city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Price from <span className="text-gray-400">(₦, optional)</span></label>
              <input className="input" type="number" min="0" value={form.priceMin} onChange={(e) => update("priceMin", e.target.value)} placeholder="5000" />
            </div>
            <div>
              <label className="label">Price up to <span className="text-gray-400">(₦, optional)</span></label>
              <input className="input" type="number" min="0" value={form.priceMax} onChange={(e) => update("priceMax", e.target.value)} placeholder="50000" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Describe what you offer, your experience, and the areas you cover."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish service"}
          </button>
        </form>
      </div>
    </div>
  );
}
