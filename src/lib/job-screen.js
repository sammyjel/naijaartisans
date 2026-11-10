// Is a "job" a job, or an artisan advertising themselves?
//
// DB-free so it can be unit-tested (tests/job-screen.test.mjs).
//
// ── WHY ────────────────────────────────────────────────────────────────────
//
// On 2026-11-10 Gerald.oArt signed up as an artisan and, 22 minutes later,
// posted "Hey there! Just a quick shoutout - I'm Gerald.o, a passionate realism
// pencil artist…" through /post-job. The site treated it as a job: every
// matching artisan was emailed and the owner got "New job posted" for what was
// really a new artisan joining. Valentine (a CUSTOMER account) did the same on
// 2026-10-29 with "I am a skilled POP worker…". The intent fork on /post-job
// (hire vs promote) was not enough on its own.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
//
// A post is HELD (not broadcast, not on the board) for the owner to approve if:
//   - the poster is an ARTISAN account (artisans hiring artisans is real but
//     rare; one click in /admin releases it), or
//   - the text reads like an advert ("I am a skilled…", "my services",
//     "contact me") and does not also say what the poster needs.
// Being wrong costs a real job a short wait for approval. Being wrong the other
// way emails every artisan an advert and tells the owner a job was posted.

/** Status of a job waiting for the owner's approval. Never broadcast, never listed. */
export const HELD = "HELD";

const ADVERT = [
  /\bi\s*(?:am|'m|’m)\s+(?:an?\s+)?(?:skilled|professional|passionate|experienced|certified|qualified|expert|talented|creative|reliable|trusted|seasoned)\b/i,
  /\bi\s*(?:am|'m|’m)\s+(?:an?\s+)?[a-z ]{0,30}\b(?:worker|artisan|technician|designer|artist|painter|plumber|electrician|carpenter|tiler|mechanic|tailor|welder|mason|builder|contractor|stylist|photographer|cleaner|installer)\b/i,
  /\bmy name is\b/i,
  /\b(?:i|we)\s+(?:offer|provide|render|specialize|specialise|handle|deliver)\b/i,
  /\b(?:my|our)\s+(?:services|work|business|company|portfolio|page|brand)\b/i,
  /\b(?:contact|call|hire|message|dm|whatsapp)\s+(?:me|us)\b/i,
  /\byears? of experience\b/i,
  /\bexperienced in\b/i,
  // Titles like "Professional Plumbing Technician" name the poster, not the job.
  /^\s*(?:professional|skilled|experienced|certified|expert|quality)\b/i,
  /\bshout\s*-?out\b/i,
  /\bwe\s+(?:are|'re)\s+(?:a|an|the)\b/i,
];

const NEED = [
  /\b(?:i|we)\s+(?:need|want|require|am looking|are looking|'m looking)\b/i,
  /\blooking for (?:a|an|someone|somebody)\b/i,
  /\b(?:needed|wanted|required)\b/i,
  /\bwho can\b/i,
];

/**
 * @param {{ posterRole?: string, title?: string, description?: string }} post
 * @returns {{ hold: boolean, reason: "artisan_poster" | "reads_like_advert" | null }}
 */
export function screenJobPost(post) {
  if (post?.posterRole === "ARTISAN") return { hold: true, reason: "artisan_poster" };
  const text = `${post?.title || ""}\n${post?.description || ""}`;
  const advert = ADVERT.some((re) => re.test(text));
  const need = NEED.some((re) => re.test(text));
  if (advert && !need) return { hold: true, reason: "reads_like_advert" };
  return { hold: false, reason: null };
}

/** Plain-English reason for the owner's email and the admin list. */
export function holdReasonText(reason) {
  if (reason === "artisan_poster") return "Posted by an ARTISAN account — usually an artisan advertising themselves, not a customer job.";
  if (reason === "reads_like_advert") return "The wording reads like someone advertising their own services, not asking for work to be done.";
  return "";
}
