import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { organizationLd, websiteLd, SITE_URL } from "@/lib/seo";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NaijaArtisans — Find trusted artisans & service pros in Nigeria",
    template: "%s | NaijaArtisans",
  },
  description:
    "Hire plumbers, electricians, tailors, caterers and more across Nigeria. Post a job for free and get quotes from skilled artisans near you.",
  keywords: [
    "Nigeria artisans", "find artisan Nigeria", "plumber Lagos", "electrician Abuja",
    "tailor Nigeria", "hire artisan", "service marketplace Nigeria", "handyman Nigeria",
    "post a job Nigeria", "skilled workers Nigeria",
  ],
  applicationName: "NaijaArtisans",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "NaijaArtisans",
    title: "NaijaArtisans — Find trusted artisans in Nigeria",
    description:
      "Plumbers, electricians, tailors, caterers and more. Post a job for free and get quotes from skilled hands near you.",
    images: [{ url: "/images/hero.jpg", width: 1600, height: 1000, alt: "Nigerian artisan at work" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NaijaArtisans — Find trusted artisans in Nigeria",
    description: "Hire skilled artisans across Nigeria. Post a job for free and get quotes.",
    images: ["/images/hero.jpg"],
  },
  robots: { index: true, follow: true },
  // Google Search Console verification code goes here once added:
  // verification: { google: "YOUR_CODE" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <JsonLd data={organizationLd()} />
        <JsonLd data={websiteLd()} />
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <footer className="mt-16 border-t border-gray-200 bg-white">
            <div className="container-page py-8 text-sm text-gray-500">
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p>© {new Date().getFullYear()} NaijaArtisans. Made for Nigeria 🇳🇬</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/browse" className="hover:text-brand-700">Find Artisans</Link>
                  <Link href="/jobs" className="hover:text-brand-700">Job Board</Link>
                  <Link href="/about" className="hover:text-brand-700">About</Link>
                  <a href="mailto:sammyjel.ng@gmail.com" className="font-medium text-brand-700 hover:underline">
                    Support: sammyjel.ng@gmail.com
                  </a>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-4 text-center text-xs text-gray-400">
                Built by{" "}
                <a href="https://github.com/sammyjel/naijaartisans" target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                  Sammy
                </a>{" "}
                · A full-stack portfolio project (Next.js · Prisma · PostgreSQL)
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
