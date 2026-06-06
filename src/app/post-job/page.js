"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CITIES } from "@/lib/constants";

export default function PostJobPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", categoryId: "", city: "", budget: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    if (user?.city) setForm((f) => ({ ...f, city: f.city || user.city }));
  }, [user]);

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
            <Link href="/login" className="btn-outline">Log in</Link>
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
