import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { activePackages, splitPrice, nairaK } from "@/lib/dfy-catalog";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Done-for-you design & marketing — logos, flyers, CVs, social media",
  description:
    "Fixed-price logo design, social media posts, flyers and ads, CV writing and digital marketing for Nigerian businesses. Pay half to start, the rest when you're happy.",
  alternates: { canonical: "/done-for-you" },
  openGraph: {
    title: "Done-for-you design & marketing | NaijaArtisans",
    description: "Logos, social media packs, adverts, CVs and digital marketing at fixed prices. Pay half to start.",
    type: "website",
  },
};

export default function DoneForYouPage() {
  const packages = activePackages();
  const ld = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "NaijaArtisans done-for-you services",
    itemListElement: packages.map((p) => ({
      "@type": "Offer",
      name: p.title,
      description: p.summary,
      price: p.priceKobo / 100,
      priceCurrency: "NGN",
      url: `${SITE.url}/done-for-you/${p.slug}`,
      seller: { "@type": "Organization", name: SITE.name },
    })),
  };

  return (
    <div className="container-page py-10">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Done-for-you", url: "/done-for-you" }])} />
      <JsonLd data={ld} />

      <div className="mx-auto max-w-2xl text-center">
        <span className="badge">New</span>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">We do it for you</h1>
        <p className="mt-3 text-gray-600">
          Fixed prices, no haggling. Tell us what you need, pay half to start, and get your work in days.
          You pay the rest only when you are happy with it.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => {
          const { depositKobo } = splitPrice(p);
          return (
            <Link key={p.slug} href={`/done-for-you/${p.slug}`} className="card flex flex-col p-6 transition hover:shadow-md">
              <div className="text-3xl">{p.icon}</div>
              <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
              <p className="mt-1 flex-1 text-sm text-gray-600">{p.summary}</p>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-extrabold text-brand-700">{nairaK(p.priceKobo)}</span>
                <span className="text-xs text-gray-500">
                  {p.turnaroundDays >= 30 ? "1 month" : `${p.turnaroundDays} days`}
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">Start with {nairaK(depositKobo)}</div>
              <span className="btn-primary mt-4 text-center">See details →</span>
            </Link>
          );
        })}
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 text-center sm:grid-cols-3">
        {[
          ["1. Tell us what you need", "Answer a few quick questions — takes 2 minutes."],
          ["2. Pay half to start", "Secure payment by Paystack. Work starts the same day."],
          ["3. Approve, then pay the rest", "Review your work, ask for changes, and pay the balance when you're happy."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <div className="font-bold">{t}</div>
            <p className="mt-1 text-sm text-gray-600">{d}</p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray-500">
        Need something not listed?{" "}
        <a href={`mailto:${SITE.email}`} className="font-semibold text-brand-700 hover:underline">Email us</a> and we&apos;ll quote you.
      </p>
    </div>
  );
}
