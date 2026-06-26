import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { PLANS, ngn } from "@/lib/monetization";
import { SITE, breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Pricing — Promote your artisan business",
  description:
    "Get more jobs on NaijaArtisans. Feature your listing or go Pro to rank higher, earn a verified badge and reach more customers across Nigeria. Simple, affordable plans.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "NaijaArtisans Pricing — Promote your artisan business",
    description: "Feature your listing or go Pro to win more jobs across Nigeria.",
    type: "website",
  },
};

export default function PricingPage() {
  const offersLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "NaijaArtisans artisan promotion plans",
    description: "Featured listings and Pro membership for artisans on NaijaArtisans.",
    brand: { "@type": "Brand", name: SITE.name },
    offers: PLANS.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.price,
      priceCurrency: "NGN",
      url: `${SITE.url}/pricing`,
      availability: "https://schema.org/InStock",
    })),
  };

  return (
    <div className="container-page py-10">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Pricing", url: "/pricing" }])} />
      <JsonLd data={offersLd} />

      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Get more jobs. Grow your business.</h1>
        <p className="mt-3 text-gray-600">
          Listing on NaijaArtisans is free. When you&apos;re ready for more customers, promote your
          profile so you show up first and stand out from the crowd.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card relative flex flex-col p-6 ${plan.highlight ? "border-brand-400 ring-2 ring-brand-200" : ""}`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-brand-700">{ngn(plan.price)}</span>
              <span className="text-sm text-gray-500">{plan.period}</span>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-gray-700">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-600">✓</span>
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className={`mt-6 w-full text-center ${plan.highlight ? "btn-primary" : "btn-outline"}`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-2xl text-center text-sm text-gray-500">
        <p>
          Not an artisan yet?{" "}
          <Link href="/register?role=artisan" className="font-semibold text-brand-700 hover:underline">
            Create a free profile
          </Link>{" "}
          first, then come back to promote it. Need help choosing?{" "}
          <a href="mailto:support@naijaartisans.com" className="font-semibold text-brand-700 hover:underline">
            Contact us
          </a>.
        </p>
      </div>
    </div>
  );
}
