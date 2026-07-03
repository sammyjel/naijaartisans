import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ShareButtons from "@/components/ShareButtons";
import { getGuide, allGuides, GUIDE_AUTHOR } from "@/lib/guides";
import { SITE, breadcrumbLd } from "@/lib/seo";

const PUBLISHED_ISO = "2026-06-15";

export function generateStaticParams() {
  return allGuides().map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
  const guide = getGuide(params.slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: `${guide.title} | NaijaArtisans`,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.description, type: "article" },
  };
}

function Block({ block }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-8 text-xl font-bold text-gray-900">{block.text}</h2>;
    case "p":
      return <p className="mt-4 leading-relaxed text-gray-700">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-gray-700">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-gray-700">
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      );
    case "price":
      return (
        <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100">
              {block.rows.map(([job, range], i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-gray-700">{job}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-brand-700 whitespace-nowrap">{range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tip":
      return (
        <div className="mt-5 rounded-lg border-l-4 border-brand-500 bg-brand-50 p-4 text-sm text-brand-800">
          💡 {block.text}
        </div>
      );
    default:
      return null;
  }
}

export default function GuidePage({ params }) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const others = allGuides().filter((g) => g.slug !== guide.slug).slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: PUBLISHED_ISO,
    dateModified: PUBLISHED_ISO,
    author: { "@type": "Organization", name: GUIDE_AUTHOR, url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: "NaijaArtisans",
      logo: { "@type": "ImageObject", url: SITE.logo },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE.url}/guides/${guide.slug}` },
  };

  return (
    <div className="container-page py-10">
      <JsonLd data={articleLd} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", url: "/" },
          { name: "Guides", url: "/guides" },
          { name: guide.title, url: `/guides/${guide.slug}` },
        ])}
      />

      <article className="mx-auto max-w-2xl">
        <Link href="/guides" className="text-sm text-gray-500 hover:text-brand-700">← All guides</Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="badge">{guide.trade}</span>
          {guide.city && <span className="text-xs text-gray-400">{guide.city}</span>}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-3 text-sm text-gray-500">
          By {GUIDE_AUTHOR} · {guide.readMins} min read · Updated {guide.updated}
        </p>

        <div className="mt-2">
          {guide.body.map((block, i) => <Block key={i} block={block} />)}
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-2xl bg-brand-50 p-6 text-center">
          <h2 className="text-lg font-bold text-brand-800">Get free quotes from trusted artisans</h2>
          <p className="mt-1 text-sm text-brand-700">Post your job free and compare artisans near you by price and reviews.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/post-job" className="btn-primary px-6 py-3">📝 Post a job free</Link>
            <Link href="/browse" className="btn-outline px-6 py-3">Browse artisans</Link>
          </div>
        </div>

        <div className="mt-8">
          <ShareButtons url={`${SITE.url}/guides/${guide.slug}`} title={guide.title} label="Found this useful? Share 👇" />
        </div>
      </article>

      {/* Related guides */}
      {others.length > 0 && (
        <div className="mx-auto mt-12 max-w-4xl">
          <h2 className="text-lg font-bold">More guides</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {others.map((g) => (
              <Link key={g.slug} href={`/guides/${g.slug}`} className="card p-4 transition hover:shadow-md">
                <span className="badge">{g.trade}</span>
                <h3 className="mt-2 text-sm font-semibold leading-snug">{g.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
