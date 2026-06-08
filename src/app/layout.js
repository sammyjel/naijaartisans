import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "NaijaArtisans — Find trusted artisans & service pros in Nigeria",
  description:
    "Hire plumbers, electricians, tailors, caterers and more across Nigeria. Post a job and get quotes from skilled artisans near you.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
