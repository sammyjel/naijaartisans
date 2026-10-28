import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import DfyOrderForm from "@/components/DfyOrderForm";
import { activePackages, packageBySlug, splitPrice, nairaK } from "@/lib/dfy-catalog";
import { SITE, breadcrumbLd } from "@/lib/seo";

export function generateStaticParams() {
  return activePackages().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const p = packageBySlug(params.slug);
  if (!p) return {};
  return {
    title: `${p.title} — ${nairaK(p.priceKobo)} fixed price`,
    description: `${p.summary} Pay half to start, the rest when you're happy. Delivered in ${p.turnaroundDays >= 30 ? "one month" : `${p.turnaroundDays} days`}.`,
    alternates: { canonical: `/done-for-you/${p.slug}` },
  };
}

export default function PackagePage({ params }) {
  const p = packageBySlug(params.slug);
  if (!p) notFound();
  const { depositKobo, balanceKobo } = splitPrice(p);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: p.title,
    description: p.description,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: { "@type": "Country", name: "Nigeria" },
    offers: { "@type": "Offer", price: p.priceKobo / 100, priceCurrency: "NGN", url: `${SITE.url}/done-for-you/${p.slug}` },
  };

  return (
    <div className="container-page py-10">
      <JsonLd data={breadcrumbLd([
        { name: "Home", url: "/" },
        { name: "Done-for-you", url: "/done-for-you" },
        { name: p.title, url: `/done-for-you/${p.slug}` },
      ])} />
      <JsonLd data={ld} />
      <Link href="/done-for-you" className="text-sm font-medium text-brand-700 hover:underline">← All packages</Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="text-4xl">{p.icon}</div>
          <h1 className="mt-2 text-3xl font-extrabold">{p.title}</h1>
          <p className="mt-3 text-gray-600">{p.description}</p>

          <div className="card mt-6 p-5">
            <div className="text-3xl font-extrabold text-brand-700">{nairaK(p.priceKobo)}</div>
            <div className="mt-1 text-sm text-gray-600">
              {nairaK(depositKobo)} to start · {nairaK(balanceKobo)} when you approve the work
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              {p.deliverables.map((d) => (
                <li key={d} className="flex gap-2"><span className="text-brand-600">✓</span>{d}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="badge">⏱ {p.turnaroundDays >= 30 ? "1 month" : `${p.turnaroundDays} days`}</span>
              <span className="badge">🔁 {p.revisions} round{p.revisions === 1 ? "" : "s"} of changes</span>
              <span className="badge">🔒 Paystack</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card p-6">
            <h2 className="text-lg font-bold">Order now</h2>
            <p className="mt-1 text-sm text-gray-500">Answer these and we start as soon as your deposit is paid.</p>
            <DfyOrderForm slug={p.slug} questions={p.questions} depositLabel={nairaK(depositKobo)} />
          </div>
        </div>
      </div>
    </div>
  );
}
