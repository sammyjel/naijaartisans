import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { allGuides } from "@/lib/guides";
import { breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Hiring Guides — Prices, Tips & Checklists for Nigeria | NaijaArtisans",
  description:
    "Free, practical guides to hiring artisans in Nigeria — fair prices for 2026, the right questions to ask, and how to avoid getting scammed. Plumbing, electrical, AC, tailoring and more.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Hiring Guides for Nigeria — prices, tips & checklists",
    description: "Fair prices, the right questions, and how to hire artisans with confidence.",
    type: "website",
  },
};

export default function GuidesIndexPage() {
  const guides = allGuides();

  return (
    <div className="container-page py-12">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Guides", url: "/guides" }])} />

      <div className="mx-auto max-w-2xl text-center">
        <span className="badge">📚 Free hiring guides</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Hire artisans with confidence</h1>
        <p className="mt-3 text-lg text-gray-600">
          Practical, no-nonsense guides for hiring in Nigeria — what jobs really cost in 2026, the
          questions to ask, and how to avoid getting scammed.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Link key={g.slug} href={`/guides/${g.slug}`} className="card flex flex-col p-5 transition hover:shadow-md">
            <div className="flex items-center gap-2">
              <span className="badge">{g.trade}</span>
              {g.city && <span className="text-xs text-gray-400">{g.city}</span>}
            </div>
            <h2 className="mt-3 font-bold leading-snug">{g.title}</h2>
            <p className="mt-2 flex-1 text-sm text-gray-500">{g.description}</p>
            <span className="mt-3 text-xs text-gray-400">{g.readMins} min read · Updated {g.updated}</span>
          </Link>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-2xl bg-brand-50 p-6 text-center">
        <h2 className="text-lg font-bold text-brand-800">Ready to hire?</h2>
        <p className="mt-1 text-sm text-brand-700">Post your job free and get quotes from trusted artisans near you.</p>
        <Link href="/post-job" className="btn-primary mt-4 inline-flex px-6 py-3">📝 Post a job free</Link>
      </div>
    </div>
  );
}
