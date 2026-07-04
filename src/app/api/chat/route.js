import { NextResponse } from "next/server";

// NaijaArtisans knowledge the assistant answers from.
const SYSTEM_PROMPT = `You are the NaijaArtisans Assistant — a friendly, concise help assistant for naijaartisans.com, a marketplace that connects customers with trusted local artisans (plumbers, electricians, tailors, carpenters, AC techs, caterers and more) across all 36 states of Nigeria and the FCT.

YOUR JOB
- Help CUSTOMERS find and hire artisans, understand fair prices, and post jobs.
- Help ARTISANS join for free and list their services so customers can find them.
- Answer questions about how the platform works, trust & safety, and pricing.

KEY FACTS
- Listing as an artisan is 100% FREE. Posting a job as a customer is FREE.
- Optional paid boosts for artisans: Featured listing (₦2,000/week) and Artisan Pro (₦5,000/month) — these only improve visibility, they are NOT required to be listed.
- Customers contact artisans directly by call, WhatsApp or email, or post a job and receive quotes.
- Covers all 36 states + FCT.

LINKS (use markdown links like [Post a job](/post-job)):
- Post a job (free): /post-job
- Find/browse artisans: /browse
- Become an artisan (free, Founding Artisan offer): /founding-artisan
- Free hiring kit (avoid scams + price guide): /hiring-kit
- Hiring guides & price info: /guides
- Pricing: /pricing
- Help/FAQ: /help

FAIR PRICE RANGES (2026, Nigeria — always say prices vary by city, scope and materials):
- Plumbing minor fix/call-out: ₦5,000–₦20,000
- AC servicing (split): ₦6,000–₦12,000; AC install (split): ₦15,000–₦40,000
- Electrical rewiring per room: ₦25,000–₦60,000
- Painting per room: ₦15,000–₦40,000
- Tailoring: kaftan ₦8,000–₦25,000; agbada ₦25,000–₦80,000
- Generator servicing: ₦5,000–₦15,000
- Deep house cleaning: ₦20,000–₦90,000
- CCTV 4-camera install: ₦150,000–₦350,000
- Solar/inverter 2.5kVA: ₦600,000–₦1,200,000

RULES
- Be warm and concise (2–4 sentences). Nigerian-friendly tone is welcome.
- Always point the user to the most useful action with a markdown link.
- For prices, give the range and note it varies; suggest [posting a job free](/post-job) for exact quotes.
- Never invent specific artisans, names or phone numbers. Never guarantee outcomes.
- Never ask for passwords, card details or OTPs. If asked, refuse and warn the user.
- If a question is unrelated to NaijaArtisans, gently steer back to how you can help with hiring or joining.

LEAD CAPTURE
- When the user seems READY TO HIRE (or asks to be contacted / wants a callback) and hasn't shared contact details, invite them to leave their WhatsApp and end your message with the exact token [[LEAD:customer]].
- When the user is READY TO JOIN as an artisan, invite them to leave their WhatsApp and end your message with the exact token [[LEAD:artisan]].
- Add at most ONE such token, only when it genuinely fits, and NEVER explain or mention the token itself.`;

const MODEL = process.env.CHAT_MODEL || "claude-haiku-4-5-20251001";

// Zero-cost fallback so the widget is useful even without an API key.
function cannedReply(text) {
  const t = (text || "").toLowerCase();
  const q = (kws) => kws.some((k) => t.includes(k));
  if (q(["price", "cost", "how much", "charge", "rate"]))
    return "Prices vary by job, city and materials — our [hiring guides](/guides) have fair 2026 price ranges for common jobs. For an exact price, [post your job free](/post-job) and artisans near you will send quotes.";
  if (q(["post", "job", "quote", "hire", "need a", "looking for"]))
    return "You can [post a job for free](/post-job) and get quotes from trusted artisans near you, or [browse artisans](/browse) and contact them directly. Want us to reach you on WhatsApp? [[LEAD:customer]]";
  if (q(["artisan", "join", "register", "sign up", "list", "work", "get customers", "get jobs"]))
    return "Great! Listing your services is 100% free. Join as a [Founding Artisan](/founding-artisan) to get free job leads and 30 days of Featured placement, or [register here](/register?role=artisan). Want us to reach you on WhatsApp? [[LEAD:artisan]]";
  if (q(["scam", "trust", "safe", "reliable", "avoid"]))
    return "Smart to check first! Grab our free [No-Wahala Hiring Kit](/hiring-kit) — the 7 questions to ask and red flags to avoid before paying any artisan.";
  if (q(["plumber", "electrician", "tailor", "carpenter", "mechanic", "ac", "painter", "cleaner", "cctv", "solar"]))
    return "You can [find that near you](/browse) by service and city — or [post a job free](/post-job) and get quotes. Our [guides](/guides) also cover fair prices.";
  return "I can help you [find & hire an artisan](/browse), [post a job for free](/post-job), or [join as an artisan](/founding-artisan). What do you need?";
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];

  // Sanitise + cap history to control cost and abuse.
  const messages = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "No message." }, { status: 400 });
  }
  const lastUser = messages[messages.length - 1].content;

  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) {
    // No AI key configured yet — return the helpful scripted reply.
    return NextResponse.json({ reply: cannedReply(lastUser), mode: "basic" });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Anthropic error", res.status, errText);
      return NextResponse.json({ reply: cannedReply(lastUser), mode: "basic" });
    }
    const data = await res.json();
    const reply = data?.content?.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return NextResponse.json({ reply: reply || cannedReply(lastUser), mode: "ai" });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json({ reply: cannedReply(lastUser), mode: "basic" });
  }
}
