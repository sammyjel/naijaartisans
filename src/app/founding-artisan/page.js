import Link from "next/link";
import ArtisanLeadForm from "@/components/ArtisanLeadForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Founding Artisan — Get free job leads near you | NaijaArtisans",
  description:
    "Join the first 100 Founding Artisans on NaijaArtisans. Get free job leads near you, 30 days of Featured placement free, and our guide to getting more customers without ad spend.",
  alternates: { canonical: "/founding-artisan" },
  openGraph: {
    title: "Become a Founding Artisan — free job leads near you",
    description: "First 100 artisans get 30 days Featured free + job leads. No ad spend.",
    type: "website",
  },
};

const BENEFITS = [
  { icon: "📩", title: "Free job leads near you", text: "Customers post jobs every day — get matched to work in your trade and city." },
  { icon: "⭐", title: "30 days Featured — FREE", text: "Founding Artisans appear at the top of search results for a full month, on us." },
  { icon: "📘", title: "Free growth guide", text: "“How to get 10+ customers a month as an artisan in Nigeria” — no ad spend required." },
  { icon: "🇳🇬", title: "Build your online name", text: "A free profile with your photos, prices, reviews and location — your mini-website." },
];

const STEPS = [
  { n: "1", t: "Claim your spot", d: "Drop your name, WhatsApp and trade below. Takes 30 seconds." },
  { n: "2", t: "We reach you", d: "You get your free guide instantly and we set up your Founding Artisan perks." },
  { n: "3", t: "Start getting jobs", d: "Complete your free profile and start receiving job leads near you." },
];

export default function FoundingArtisanPage() {
  return (
    <div>
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Founding Artisan", url: "/founding-artisan" }])} />

      <section className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:items-center">
          {/* Pitch */}
          <div>
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
              🔥 First 100 artisans only
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              Get free job leads near you — grow without spending on ads
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Join the first <strong>100 Founding Artisans</strong> on NaijaArtisans. Free job leads,
              30 days of Featured placement free, and a free guide to winning more customers — no ad
              spend, no fees.
            </p>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <span>
                    <span className="block font-semibold">{b.title}</span>
                    <span className="text-sm text-brand-50">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Opt-in card */}
          <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-xl sm:p-8">
            <h2 className="text-xl font-bold">Claim your Founding Artisan spot</h2>
            <p className="mt-1 text-sm text-gray-500">Free forever to join. No payment required.</p>
            <div className="mt-5">
              <ArtisanLeadForm source="founding-artisan-landing" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-14">
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {s.n}
              </div>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link>
        </p>
      </section>
    </div>
  );
}
