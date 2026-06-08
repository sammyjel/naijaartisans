export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Don't waste crawl budget on auth-only / action pages
      disallow: ["/dashboard", "/post-job", "/services/new", "/login", "/api/"],
    },
    sitemap: "https://naijaartisans.vercel.app/sitemap.xml",
    host: "https://naijaartisans.vercel.app",
  };
}
