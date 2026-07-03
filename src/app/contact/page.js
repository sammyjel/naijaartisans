import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

export const metadata = {
  title: "Contact Us — NaijaArtisans",
  description: "Get in touch with the NaijaArtisans team. Questions, support, feedback or partnerships — we're here to help.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-page py-12">
      <JsonLd data={breadcrumbLd([{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }])} />

      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-lg text-gray-600">
          Have a question, need support, or want to work with us? Send us a message and our team will
          get back to you. We usually reply within 1–2 business days.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {/* Details */}
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="font-bold">Email</h2>
              <a href="mailto:support@naijaartisans.com" className="mt-1 block text-brand-700 hover:underline">
                support@naijaartisans.com
              </a>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Help &amp; FAQ</h2>
              <p className="mt-1 text-sm text-gray-600">
                Many questions are answered on our{" "}
                <Link href="/help" className="text-brand-700 hover:underline">Help &amp; FAQ page</Link>.
              </p>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Location</h2>
              <p className="mt-1 text-sm text-gray-600">NaijaArtisans · Nigeria 🇳🇬</p>
              <p className="mt-1 text-xs text-gray-400">Serving customers and artisans across all 36 states and the FCT.</p>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">For artisans</h2>
              <p className="mt-1 text-sm text-gray-600">
                Want to list your business?{" "}
                <Link href="/join" className="text-brand-700 hover:underline">Join free here</Link>.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-6">
            <h2 className="text-lg font-bold">Send us a message</h2>
            <p className="mt-1 text-sm text-gray-500">We'd love to hear from you.</p>
            <div className="mt-4">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
