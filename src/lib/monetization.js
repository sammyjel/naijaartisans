// Monetization config — pricing plans + Paystack payment links.
//
// Phase 1 (no backend needed): create a Payment Link in your Paystack
// dashboard for each plan and paste the URL into the matching env var.
// Until then, the buttons fall back to a WhatsApp/email enquiry so you
// never lose a paying customer.
//
// 💡 Change the prices below to whatever you want — they're just defaults.

export const CONTACT_WHATSAPP = "2348030000000"; // TODO: your WhatsApp number (intl format, no +)
export const CONTACT_EMAIL = "sammyjel.ng@gmail.com";

export const PLANS = [
  {
    id: "featured",
    name: "Featured Listing",
    price: 2000,
    days: 7,
    period: "per week",
    tagline: "Get seen first by customers searching in your city.",
    perks: [
      "Top placement in search & category pages",
      "A bright “Featured” badge on your listing",
      "Up to 5× more profile views",
      "Priority over free listings",
    ],
    cta: "Get Featured",
    // Paystack Payment Link, e.g. https://paystack.com/pay/xxxxxxx
    link: process.env.NEXT_PUBLIC_PAYSTACK_FEATURED_LINK || "",
    highlight: false,
  },
  {
    id: "pro",
    name: "Artisan Pro",
    price: 5000,
    days: 30,
    period: "per month",
    tagline: "Everything you need to win more jobs, every month.",
    perks: [
      "Verified Pro badge that builds trust",
      "Unlimited quotes on the job board",
      "Featured placement included",
      "Profile analytics (views & contacts)",
      "Priority support",
    ],
    cta: "Go Pro",
    link: process.env.NEXT_PUBLIC_PAYSTACK_PRO_LINK || "",
    highlight: true,
  },
];

// Naira formatter for prices.
export function ngn(amount) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

// Where a plan button should send the user: the Paystack link if set,
// otherwise a pre-filled WhatsApp enquiry so no lead is lost.
export function planHref(plan) {
  if (plan.link) return plan.link;
  const msg = encodeURIComponent(`Hi, I want the ${plan.name} plan on NaijaArtisans.`);
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`;
}
