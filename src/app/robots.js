import { SITE_URL } from "@/lib/seo";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Don't waste crawl budget on auth-only / action pages
      disallow: ["/admin", "/dashboard", "/post-job", "/services/new", "/login", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
