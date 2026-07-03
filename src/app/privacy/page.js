import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — NaijaArtisans",
  description: "How NaijaArtisans collects, uses and protects your personal data, in line with the Nigeria Data Protection Act 2023.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "26 June 2026";

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl prose-naija">
        <Link href="/" className="text-sm text-gray-500 hover:text-brand-700">← Back to home</Link>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {UPDATED}</p>

        <p className="mt-6 text-gray-700">
          NaijaArtisans (“we”, “us”, “our”) respects your privacy. This policy explains what
          personal data we collect, why we collect it, and your rights under the{" "}
          <strong>Nigeria Data Protection Act 2023 (NDPA)</strong>. By using naijaartisans.com you
          agree to this policy.
        </p>

        <Section title="1. Information we collect">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li><strong>Account details</strong> — your name, email address and/or phone number, and password (stored encrypted).</li>
            <li><strong>Profile details (artisans)</strong> — your trade, services, prices, bio, working hours, profile photo and business location.</li>
            <li><strong>Location data</strong> — approximate or precise coordinates, only if you choose to share them, to help customers find artisans nearby.</li>
            <li><strong>Activity</strong> — jobs you post, quotes, reviews and ratings you submit.</li>
            <li><strong>Technical data</strong> — device, browser and usage analytics collected to keep the service secure and improve it.</li>
          </ul>
        </Section>

        <Section title="2. How we use your information">
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            <li>To create and manage your account.</li>
            <li>To connect customers with artisans and display profiles, services and reviews.</li>
            <li>To process payments for Featured and Pro listings.</li>
            <li>To send service messages (e.g. password resets) and, where you opt in, updates.</li>
            <li>To keep the platform safe, prevent fraud and comply with the law.</li>
          </ul>
        </Section>

        <Section title="3. Sharing your information">
          <p className="text-gray-700">
            We do <strong>not</strong> sell your personal data. We share limited data only with trusted
            providers who help us run the service:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            <li><strong>Paystack</strong> — to process payments securely.</li>
            <li><strong>Resend</strong> — to send transactional emails.</li>
            <li><strong>Vercel &amp; Neon</strong> — secure hosting and database.</li>
          </ul>
          <p className="mt-2 text-gray-700">
            Your public artisan profile (name, trade, city, services, reviews and any photo you upload)
            is visible to other users — that is the purpose of the marketplace. Your exact coordinates
            are never shown publicly; only a general map area is displayed.
          </p>
        </Section>

        <Section title="4. Contact between users">
          <p className="text-gray-700">
            When you choose to contact an artisan (by phone, WhatsApp or email), you share information
            directly with them. Any transaction you arrange is between you and the other party —
            see our <Link href="/terms" className="text-brand-700 hover:underline">Terms of Service</Link>.
          </p>
        </Section>

        <Section title="5. Data security &amp; retention">
          <p className="text-gray-700">
            Passwords are hashed and never stored in plain text. We keep your data only as long as your
            account is active or as needed to provide the service and meet legal obligations. You can
            request deletion at any time.
          </p>
        </Section>

        <Section title="6. Your rights under the NDPA">
          <p className="text-gray-700">You have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Object to or restrict certain processing.</li>
            <li>Withdraw consent (e.g. for location sharing) at any time.</li>
          </ul>
          <p className="mt-2 text-gray-700">
            To exercise any of these rights, email{" "}
            <a href="mailto:support@naijaartisans.com" className="text-brand-700 hover:underline">support@naijaartisans.com</a>.
          </p>
        </Section>

        <Section title="7. Cookies, analytics &amp; advertising">
          <p className="text-gray-700">
            We use essential cookies to keep you signed in, and analytics cookies to understand how the
            site is used so we can improve it.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>
              <strong>Third-party advertising.</strong> We may use third-party advertising companies,
              including <strong>Google</strong>, to serve ads when you visit NaijaArtisans. These
              companies may use cookies and similar technologies to serve ads based on your prior visits
              to this and other websites.
            </li>
            <li>
              <strong>Google&apos;s advertising cookies.</strong> Google&apos;s use of advertising
              cookies (including the DoubleClick DART cookie) enables it and its partners to serve ads
              to you based on your visit to our site and/or other sites on the internet.
            </li>
            <li>
              <strong>Your choices.</strong> You may opt out of personalised advertising by visiting{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">Google Ads Settings</a>.
              You can also opt out of some third-party vendors&apos; use of cookies at{" "}
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">aboutads.info/choices</a>.
            </li>
            <li>
              Learn more about how Google uses data from sites that use its services at{" "}
              <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">policies.google.com/technologies/partner-sites</a>.
            </li>
          </ul>
          <p className="mt-3 text-gray-700">
            You can also manage or disable cookies in your browser settings at any time, though some
            features of the site may not work as intended without them.
          </p>
        </Section>

        <Section title="8. Children">
          <p className="text-gray-700">
            NaijaArtisans is not intended for anyone under 18. We do not knowingly collect data from children.
          </p>
        </Section>

        <Section title="9. Changes to this policy">
          <p className="text-gray-700">
            We may update this policy from time to time. We’ll post the new version here with an updated date.
          </p>
        </Section>

        <Section title="10. Contact us">
          <p className="text-gray-700">
            Questions about your privacy? Email{" "}
            <a href="mailto:support@naijaartisans.com" className="text-brand-700 hover:underline">support@naijaartisans.com</a>.
          </p>
        </Section>

        <p className="mt-10 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
          This policy is provided for transparency and is not legal advice. For full regulatory
          compliance, have it reviewed by a qualified Nigerian legal practitioner.
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
