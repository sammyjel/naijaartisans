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
            <div className="container-page flex flex-col items-center justify-between gap-3 py-8 text-sm text-gray-500 sm:flex-row">
              <p>© {new Date().getFullYear()} NaijaArtisans. Made for Nigeria 🇳🇬</p>
              <div className="flex gap-4">
                <Link href="/browse" className="hover:text-brand-700">Find Artisans</Link>
                <Link href="/jobs" className="hover:text-brand-700">Job Board</Link>
                <Link href="/register" className="hover:text-brand-700">Become an Artisan</Link>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
