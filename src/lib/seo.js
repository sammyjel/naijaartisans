// Shared site constants + JSON-LD builders for SEO / LLM optimization.

export const SITE = {
  name: "NaijaArtisans",
  url: "https://naijaartisans.vercel.app",
  description:
    "NaijaArtisans is a service marketplace that connects skilled Nigerian artisans — plumbers, electricians, tailors, caterers, mechanics and more — with customers who need their services.",
  email: "sammyjel.ng@gmail.com",
  logo: "https://naijaartisans.vercel.app/images/hero.jpg",
};

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: SITE.logo,
    description: SITE.description,
    email: SITE.email,
    areaServed: { "@type": "Country", name: "Nigeria" },
    contactPoint: {
      "@type": "ContactPoint",
      email: SITE.email,
      contactType: "customer support",
      areaServed: "NG",
    },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/browse?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE.url}${it.url}`,
    })),
  };
}
