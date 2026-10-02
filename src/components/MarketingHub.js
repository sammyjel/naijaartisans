"use client";

// NAIJA ARTISANS MARKETING HUB — attribution.
//
// The question this answers is the one from the brief: which content actually
// sent people to naijaartisans.com. Not likes, not reach — conversions.
//
// It deliberately does NOT show visitor counts. Nothing is written on a visit
// (see the Attribution model in schema.prisma), because a row per pageview on a
// site with 174 crawled URLs is what exhausted the database quota on 1 October.
// Visit volume is already answered by Vercel Analytics and Search Console; this
// panel answers what those two cannot.

import { useEffect, useState } from "react";

const CONVERSION_LABELS = {
  signup: "Signed up",
  lead_captured: "Lead captured",
  job_posted: "Job posted",
  quote_sent: "Quote sent",
  deal_started: "Artisan hired",
  deal_completed: "Job completed",
};

const OBJECTIVES = ["TRAFFIC", "AWARENESS", "DISCOVERY", "LEADS", "DEALS"];
const AUDIENCES = ["NIGERIA", "DIASPORA", "ARTISANS", "CUSTOMERS"];

function Fig({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className={`text-2xl font-extrabold ${accent || "text-gray-900"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default function MarketingHub() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState(null);
  const [copied, setCopied] = useState("");
  const [form, setForm] = useState({
    name: "",
    destination: "/browse",
    objective: "TRAFFIC",
    audience: "NIGERIA",
  });

  async function load() {
    try {
      const res = await fetch("/api/admin/campaigns");
      if (!res.ok) return setData({ campaigns: [], summary: null });
      setData(await res.json());
    } catch {
      setError("Could not load marketing data.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error || "Could not create the campaign.");
      setLinks(d.links);
      setForm({ ...form, name: "" });
      setOpen(false);
      await load();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url, key) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  if (!data) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-bold">Marketing Hub</h2>
        <p className="mt-2 text-sm text-gray-500">Loading…</p>
      </section>
    );
  }

  const s = data.summary;
  const campaigns = data.campaigns || [];

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Marketing Hub</h2>
        <button className="btn-outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "+ New campaign"}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Which content actually sends people to NaijaArtisans — counted by what they did, not by
        likes.
      </p>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {open && (
        <form onSubmit={create} className="mt-3 rounded-lg border border-gray-200 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Campaign name</label>
              <input
                className="input"
                placeholder="Nigerian Artisans Awareness"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Send people to</label>
              <input
                className="input"
                placeholder="/browse"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Objective</label>
              <select
                className="input"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value })}
              >
                {OBJECTIVES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select
                className="input"
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-3" disabled={busy}>
            {busy ? "Creating…" : "Create and generate links"}
          </button>
        </form>
      )}

      {/* Ready-to-paste tagged links, one per platform. */}
      {links && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-900">
            Campaign created. Paste the matching link into each platform — that is what makes the
            report below work.
          </p>
          <div className="mt-3 space-y-1.5">
            {links.map((l) => (
              <div key={l.source} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-20 shrink-0 font-semibold capitalize">{l.source}</span>
                <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs text-gray-700">
                  {l.url}
                </code>
                <button type="button" className="btn-outline !py-1 !px-2 text-xs" onClick={() => copy(l.url, l.source)}>
                  {copied === l.source ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-outline mt-3" onClick={() => setLinks(null)}>
            Done
          </button>
        </div>
      )}

      {/* The report. */}
      <div className="mt-4 rounded-lg border border-gray-200 p-4">
        {s && s.total === 0 ? (
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900">No conversions recorded yet.</p>
            <p className="mt-1">
              This fills up as people sign up, post jobs, send quotes and complete deals. Nothing is
              recorded for ordinary visits — only for the things that are actually worth money.
            </p>
            <p className="mt-1">
              Create a campaign above and use its tagged links everywhere you post, or the source
              will just read “direct”.
            </p>
          </div>
        ) : (
          s && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Fig label="Conversions (90d)" value={s.total} accent="text-brand-700" />
                <Fig
                  label="Jobs completed"
                  value={s.byConversion.find((c) => c.conversion === "deal_completed")?.count || 0}
                  accent="text-green-700"
                />
                <Fig
                  label="Jobs posted"
                  value={s.byConversion.find((c) => c.conversion === "job_posted")?.count || 0}
                />
                <Fig label="Campaigns" value={campaigns.length} />
              </div>

              {s.bySource.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-bold">Where customers actually came from</h3>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Source</th>
                          <th className="px-3 py-2 font-semibold">Medium</th>
                          <th className="px-3 py-2 font-semibold">Conversions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {s.bySource.map((r) => (
                          <tr key={r.source + r.medium}>
                            <td className="px-3 py-2 font-medium capitalize">{r.source}</td>
                            <td className="px-3 py-2 text-gray-500">{r.medium}</td>
                            <td className="px-3 py-2 font-semibold">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {s.recent.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                    Recent conversions ({s.recent.length})
                  </summary>
                  <div className="mt-2 space-y-1 text-sm">
                    {s.recent.map((r) => (
                      <div key={r.id} className="flex flex-wrap gap-2 border-b border-gray-100 py-1.5">
                        <span className="font-medium">
                          {CONVERSION_LABELS[r.conversion] || r.conversion}
                        </span>
                        <span className="text-gray-500">
                          via {r.campaign?.name || r.campaignTag || r.source}
                        </span>
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )
        )}
      </div>

      {campaigns.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Campaign</th>
                <th className="px-3 py-2 font-semibold">Tag</th>
                <th className="px-3 py-2 font-semibold">Goes to</th>
                <th className="px-3 py-2 font-semibold">Objective</th>
                <th className="px-3 py-2 font-semibold">Conversions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2"><code className="text-xs text-gray-600">{c.slug}</code></td>
                  <td className="px-3 py-2 text-gray-500">{c.destination}</td>
                  <td className="px-3 py-2 text-gray-500">{c.objective}</td>
                  <td className="px-3 py-2 font-semibold">{c._count?.attributions ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
