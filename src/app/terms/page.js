import Link from "next/link";

export const metadata = {
  title: "Terms of Service — NaijaArtisans",
  description: "The terms governing your use of the NaijaArtisans marketplace.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "26 June 2026";

export default function TermsPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-700">← Back to home</Link>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {UPDATED}</p>

        <p className="mt-6 text-gray-700">
          Welcome to NaijaArtisans. These Terms of Service (“Terms”) govern your use of
          naijaartisans.com and our services. By creating an account or using the platform, you agree
          to these Terms. If you do not agree, please do not use the service.
        </p>

        <Section title="1. What NaijaArtisans is">
          <p className="text-gray-700">
            NaijaArtisans is an online marketplace that helps customers discover and contact skilled
            artisans (e.g. plumbers, electricians, tailors, carpenters) across Nigeria. We are a
            <strong> platform that connects people</strong> — we are not the employer of any artisan and
            we do not perform the services ourselves.
          </p>
        </Section>

        <Section title="2. Your account">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>You must be at least 18 years old to use NaijaArtisans.</li>
            <li>You agree to provide accurate information and keep it up to date.</li>
            <li>You are responsible for keeping your password secure and for activity on your account.</li>
            <li>One person or business per account; impersonation is not allowed.</li>
          </ul>
        </Section>

        <Section title="3. For artisans">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>You confirm you are skilled and legally able to offer the services you list.</li>
            <li>You agree to represent your services, prices and availability honestly.</li>
            <li>You are solely responsible for the quality, safety and legality of the work you perform.</li>
            <li>Any photos you upload must be your own work or content you have the right to use.</li>
          </ul>
        </Section>

        <Section title="4. For customers">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>You agree to use the platform to find and contact artisans in good faith.</li>
            <li>You are responsible for vetting an artisan and agreeing terms and price before work begins.</li>
            <li>Reviews you leave must be genuine and based on real experiences.</li>
          </ul>
        </Section>

        <Section title="5. Transactions happen between users">
          <p className="text-gray-700">
            Any agreement, payment or work arranged between a customer and an artisan is{" "}
            <strong>strictly between those two parties</strong>. NaijaArtisans is not a party to that
            agreement, does not guarantee any artisan’s work, and is not responsible for disputes,
            losses, damages or injuries arising from it. We strongly encourage agreeing scope and price
            in writing and using safe payment practices.
          </p>
        </Section>

        <Section title="6. Paid features">
          <p className="text-gray-700">
            Artisans may purchase optional <strong>Featured</strong> or <strong>Pro</strong> listings to
            increase visibility. These are billed as shown on our{" "}
            <Link href="/pricing" className="text-brand-700 hover:underline">Pricing</Link> page and
            processed securely via Paystack. Paid features improve placement only — they do not
            guarantee jobs, leads or income.
          </p>
        </Section>

        <Section title="7. Acceptable use">
          <p className="text-gray-700">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            <li>Post false, misleading, illegal or offensive content.</li>
            <li>Harass, defraud or harm other users.</li>
            <li>Scrape, copy or misuse other users’ personal data.</li>
            <li>Attempt to disrupt, hack or overload the platform.</li>
            <li>Post fake reviews or manipulate ratings.</li>
          </ul>
          <p className="mt-2 text-gray-700">We may suspend or remove accounts that breach these Terms.</p>
        </Section>

        <Section title="8. Reviews &amp; content">
          <p className="text-gray-700">
            You keep ownership of content you post, but grant NaijaArtisans a licence to display it on
            the platform. We may remove content that violates these Terms.
          </p>
        </Section>

        <Section title="9. Disclaimer &amp; limitation of liability">
          <p className="text-gray-700">
            The platform is provided “as is”. To the fullest extent permitted by law, NaijaArtisans is
            not liable for any indirect or consequential loss, or for the acts, omissions, conduct or
            work of any user. Our total liability to you for any claim is limited to the amount you paid
            us (if any) in the 3 months before the claim.
          </p>
        </Section>

        <Section title="10. Termination">
          <p className="text-gray-700">
            You may close your account at any time. We may suspend or terminate access if you breach
            these Terms or use the service unlawfully.
          </p>
        </Section>

        <Section title="11. Governing law">
          <p className="text-gray-700">
            These Terms are governed by the laws of the Federal Republic of Nigeria.
          </p>
        </Section>

        <Section title="12. Contact">
          <p className="text-gray-700">
            Questions about these Terms? Email{" "}
            <a href="mailto:support@naijaartisans.com" className="text-brand-700 hover:underline">support@naijaartisans.com</a>.
          </p>
        </Section>

        <p className="mt-10 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
          These Terms are provided for transparency and are not legal advice. Have them reviewed by a
          qualified Nigerian legal practitioner before relying on them commercially.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold" dangerouslySetInnerHTML={{ __html: title }} />
      <div className="mt-2">{children}</div>
    </section>
  );
}
