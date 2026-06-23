"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Login failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page flex justify-center py-20">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold">Admin access</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your admin password to view members.</p>
        {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <input
          type="password"
          className="input mt-4"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
        <button className="btn-primary mt-4 w-full" disabled={loading}>
          {loading ? "Checking…" : "Enter dashboard"}
        </button>
      </form>
    </div>
  );
}
