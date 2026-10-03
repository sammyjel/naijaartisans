"use client";

// The "I want customers to find me" door.
//
// Shown to an artisan who came to /post-job to advertise. It does NOT offer a
// blank listing form: 94% of artisans already have a listing, so telling them
// to create one is answering a question they did not ask. It shows the pages
// they are already on and the specific things that would add another.
//
// It states only countable facts — how many pages, which ones. No traffic
// estimates and no ranking promises, because nothing here measures either.

import { useEffect, useState } from "react";
import Link from "next/link";

const IMPACT_STYLE = {
  high: "border-brand-200 bg-brand-50",
  medium: "border-gray-200 bg-gray-50",
  low: "border-gray-200 bg-white",
};

export default function ArtisanReachPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/me/reach")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setData(d))
      .catch(() => live && setError("Could not load your listing details."));
    return () => {
      live = false;
    };
  }, []);

  if (error) {
    return (
      <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}{" "}
        <Link href="/dashboard" className="underline">
          Go to your dashboard
        </Link>
      </div>
    );
  }

  if (!data) return <p className="mt-4 text-sm text-gray-500">Loading your listings…</p>;

  const { pages = [], gaps = [], listings = 0 } = data;

  return (
    <div className="mt-6">
      {/* What they already have. This is the part that is invisible to them. */}
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
        {pages.length > 0 ? (
          <>
            <p className="text-lg font-bold text-brand-900">
              You already appear on {pages.length} public{" "}
              {pages.length === 1 ? "page" : "pages"}.
            </p>
            <p className="mt-1 text-sm text-brand-800">
              These are the pages customers land on from Google. Your {listings}{" "}
              {listings === 1 ? "listing puts" : "listings put"} you on them — you do not need to
              post on the job board to be seen.
            </p>
            <div className="mt-3 space-y-1">
              {pages.map((p) => (
                <Link
                  key={p.path}
                  href={p.path}
                  className="block truncate text-sm text-brand-700 underline hover:text-brand-900"
                >
                  {p.category} in {p.city}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-brand-900">You are not on any public page yet.</p>
            <p className="mt-1 text-sm text-brand-800">
              A service listing is what puts you on the category and city pages customers find
              through Google.
            </p>
          </>
        )}
      </div>

      {/* What would change it. */}
      {gaps.length > 0 && (
        <>
          <h3 className="mt-6 text-sm font-bold text-gray-900">
            {pages.length > 0 ? "What would widen your reach" : "Start here"}
          </h3>
          <p className="text-xs text-gray-500">
            The first items add a new page. The rest improve the pages you are already on.
          </p>
          <div className="mt-3 space-y-2">
            {gaps.map((g) => (
              <div key={g.id} className={`rounded-lg border p-4 ${IMPACT_STYLE[g.impact] || IMPACT_STYLE.low}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{g.label}</p>
                    <p className="mt-0.5 text-sm text-gray-600">{g.why}</p>
                  </div>
                  <Link href={g.href} className="btn-outline shrink-0 !py-1.5 !px-3 text-xs">
                    {g.action}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {gaps.length === 0 && pages.length > 0 && (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Your listings and profile are complete. There is nothing further to fill in here.
        </p>
      )}
    </div>
  );
}
