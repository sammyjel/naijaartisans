"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { PLANS, ngn } from "@/lib/monetization";
import { isFeatured } from "@/lib/format";

function until(date) {
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function UpgradeCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const needsEmail = user && !user.email;
  const featuredActive = isFeatured(user?.featuredUntil);
  const proActive = isFeatured(user?.proUntil);

  async function buy(plan) {
    setError("");
    if (needsEmail && (!email || !email.includes("@"))) {
      setError("Enter an email to receive your receipt.");
      return;
    }
    setLoading(plan);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start payment.");
        setLoading("");
        return;
      }
      window.location.href = data.authorization_url;
    } catch {
      setError("Network error. Try again.");
      setLoading("");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Boost your profile 🚀</h2>
      <p className="mt-1 text-sm text-gray-500">Rank above other artisans and win more jobs.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {featuredActive && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            ⭐ Featured until {until(user.featuredUntil)}
          </span>
        )}
        {proActive && (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
            ✦ Pro until {until(user.proUntil)}
          </span>
        )}
      </div>

      {needsEmail && (
        <input
          type="email"
          className="input mt-4"
          placeholder="Your email (for the receipt)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => buy(plan.id)}
            disabled={Boolean(loading)}
            className={`rounded-lg border p-4 text-left transition hover:border-brand-300 ${plan.highlight ? "border-brand-300 bg-brand-50" : "border-gray-200"}`}
          >
            <div className="font-semibold">{plan.name}</div>
            <div className="text-sm text-brand-700">{ngn(plan.price)} <span className="text-gray-400">{plan.period}</span></div>
            <div className="mt-2 text-xs font-semibold text-brand-700">
              {loading === plan.id ? "Starting payment…" : `Pay with Paystack →`}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-400">Secure payment by Paystack. Your plan activates automatically after payment.</p>
    </div>
  );
}
