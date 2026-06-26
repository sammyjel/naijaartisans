"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | notconfigured | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setState("error");
        return;
      }
      setState(data.configured === false ? "notconfigured" : "sent");
    } catch {
      setError("Network error. Try again.");
      setState("error");
    }
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the email you registered with and we&apos;ll send you a link to reset it.
        </p>

        {state === "sent" && (
          <div className="mt-5 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
            ✓ If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. Check your
            inbox (and spam folder). The link expires in 1 hour.
          </div>
        )}

        {state === "notconfigured" && (
          <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Password reset by email isn&apos;t available yet. Please contact support at{" "}
            <a href="mailto:support@naijaartisans.com" className="font-semibold underline">support@naijaartisans.com</a>{" "}
            and we&apos;ll help you.
          </div>
        )}

        {state !== "sent" && state !== "notconfigured" && (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn-primary w-full" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
