"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CITIES } from "@/lib/constants";

function PostJobForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();

  // Context passed in from an artisan's "Request a quote" button.
  const fromName = params.get("name") || "";
  const fromCategory = params.get("category") || "";
  const fromCity = params.get("city") || "";

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", categoryId: "", city: "", budget: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  // Pre-fill city from the artisan's city (or the user's), and title from the trade.
  useEffect(() => {
    const city = (fromCity && CITIES.includes(fromCity) && fromCity) || user?.city || "";
    setForm((f) => ({
      ...f,
      city: f.city || city,
      title: f.title || (fromCategory ? `${fromCategory} service needed` : ""),
    }));
  }, [user, fromCity, fromCategory]);

  // Pre-select the category once categories load and we have a trade name.
  useEffect(() => {
    if (!fromCategory || !categories.length) return;
    const match = categories.find((c) => c.name.toLowerCase() === fromCategory.toLowerCase());
    if (match) setForm((f) => ({ ...f, categoryId: f.categoryId || match.id }));
  }, [categories, fromCategory]);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not post job.");
        return;
      }
      router.push(`/jobs/${data.job.id}`);
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
          <h1 className="text-xl font-bold">Log in to post a job</h1>
          <p className="mt-2 text-gray-500">You need an account to post a job and receive quotes.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/login?next=${encodeURIComponent("/post-job")}`} className="btn-outline">Log in</Link>
            <Link href="/register" className="btn-primary">Sign up</Link>
          </div>
        </div>
      </div>
    );

  return (
    <div className="container-page py-10">
      <div className="card mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Post a job</h1>
        <p className="mt-1 text-gray-500">Describe what you need. Artisans near you will send quotes.</p>

        {fromName && (
          <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Requesting a quote{fromCategory ? ` for ${fromCategory}` : ""}{fromCity ? ` in ${fromCity}` : ""}. <strong>{fromName}</strong> and other nearby artisans will be able to send you quotes.
          </div>
        )}

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Job title</label>
            <input
              className="input"
              placeholder="e.g. Fix leaking kitchen sink"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">City</label>
              <select className="input" value={form.city} onChange={(e) => update("city", e.target.value)} required>
                <option value="">Select city</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Budget <span className="text-gray-400">(₦, optional)</span></label>
              <input
                className="input"
                type="number"
                min="0"
                placeholder="e.g. 15000"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={5}
              placeholder="Give details: what's the problem, where exactly, and when you need it done."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              required
            />
          </div>
          <button className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Posting…" : "Post job"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-center text-gray-500">Loading…</div>}>
      <PostJobForm />
    </Suspense>
  );
}
