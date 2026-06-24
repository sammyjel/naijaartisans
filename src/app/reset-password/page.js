"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | done

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setState("saving");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        setState("idle");
        return;
      }
      setState("done");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Network error. Try again.");
      setState("idle");
    }
  }

  if (!token) {
    return (
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-gray-500">This link is missing or broken. Please request a new one.</p>
        <Link href="/forgot-password" className="btn-primary mt-4">Request a new link</Link>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-brand-700">Password updated ✓</h1>
        <p className="mt-2 text-sm text-gray-500">You can now log in with your new password. Redirecting…</p>
        <Link href="/login" className="btn-primary mt-4">Go to log in</Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="mt-1 text-sm text-gray-500">Choose a new password for your account.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <button className="btn-primary w-full" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-page flex justify-center py-12">
      <Suspense fallback={<div className="py-12 text-center text-gray-500">Loading…</div>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
