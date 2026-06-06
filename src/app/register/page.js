"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CITIES } from "@/lib/constants";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();

  const [role, setRole] = useState(params.get("role") === "artisan" ? "ARTISAN" : "CUSTOMER");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", city: "", bio: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.email && !form.phone) {
      setError("Enter an email or a phone number.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join NaijaArtisans in under a minute.</p>

        {/* Role toggle */}
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setRole("CUSTOMER")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${role === "CUSTOMER" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
          >
            I need a service
          </button>
          <button
            type="button"
            onClick={() => setRole("ARTISAN")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${role === "ARTISAN" ? "bg-white shadow text-brand-700" : "text-gray-500"}`}
          >
            I'm an artisan
          </button>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Email <span className="text-gray-400">(optional)</span></label>
              <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label className="label">Phone <span className="text-gray-400">(optional)</span></label>
              <input className="input" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="0803..." />
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-400">Provide at least one — email or phone.</p>

          <div>
            <label className="label">City</label>
            <select className="input" value={form.city} onChange={(e) => update("city", e.target.value)}>
              <option value="">Select your city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {role === "ARTISAN" && (
            <div>
              <label className="label">Short bio <span className="text-gray-400">(what do you do?)</span></label>
              <textarea
                className="input"
                rows={3}
                value={form.bio}
                onChange={(e) => update("bio", e.target.value)}
                placeholder="e.g. Experienced plumber serving Lagos for 8 years."
              />
            </div>
          )}

          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-center text-gray-500">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
