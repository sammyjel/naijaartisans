// Page titles must not carry the brand suffix twice.
//
// src/app/layout.js sets `title.template = "%s | NaijaArtisans"`, which Next
// applies to every page's top-level `title`. A page that also writes the suffix
// into its own title ships as "... | NaijaArtisans | NaijaArtisans".
//
// Nothing catches this: the build passes, the page renders, and the only place
// it shows is the <title> and the search result. Roughly 20 pages — every guide
// plus the lead-magnet pages — shipped that way until 2026-09-29.
//
// `openGraph.title` is the exception and must keep its suffix: the template is
// NOT applied to og:title, so dropping it there would lose the brand from every
// social share card.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP = "src/app";
const SUFFIX = "| NaijaArtisans";

function pageFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pageFiles(full, acc);
    else if (entry === "page.js" || entry === "layout.js") acc.push(full);
  }
  return acc;
}

/**
 * Top-level `title:` lines — i.e. those NOT nested inside an openGraph/twitter
 * block. Tracked by brace depth relative to the block rather than by regex,
 * because a nested-object heuristic based on indentation alone would miss a
 * reformatted file.
 */
function topLevelTitleLines(source) {
  const hits = [];
  let inCard = false;
  let depth = 0;

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();

    if (!inCard && /^(openGraph|twitter)\s*:\s*\{/.test(line)) {
      inCard = true;
      depth = 1;
      continue;
    }
    if (inCard) {
      depth += (line.match(/\{/g) || []).length;
      depth -= (line.match(/\}/g) || []).length;
      if (depth <= 0) inCard = false;
      continue;
    }
    if (/^title\s*:/.test(line)) hits.push(line);
  }
  return hits;
}

const files = pageFiles(APP);

test("the app has page files to check", () => {
  assert.ok(files.length > 10, `only found ${files.length} page/layout files`);
});

test("no page title hardcodes the brand suffix the template already adds", () => {
  const offenders = [];
  for (const file of files) {
    if (file.replace(/\\/g, "/").endsWith("src/app/layout.js")) continue; // defines the template
    for (const line of topLevelTitleLines(readFileSync(file, "utf8"))) {
      if (line.includes(SUFFIX)) offenders.push(`${file}: ${line}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    "these titles would render as '| NaijaArtisans | NaijaArtisans':\n" + offenders.join("\n")
  );
});

test("openGraph titles KEEP the suffix, because the template is not applied there", () => {
  // The inverse guard. Someone fixing the bug above by a blind find-and-replace
  // would strip the brand from every share card, which is harder to notice.
  const og = readFileSync(join(APP, "join", "page.js"), "utf8");
  assert.match(
    og,
    /openGraph:\s*\{[^}]*title:\s*["'`][^"'`]*\| NaijaArtisans/s,
    "join's og:title should still carry the brand"
  );
});

test("the title template is defined exactly once, in the root layout", () => {
  const layout = readFileSync(join(APP, "layout.js"), "utf8");
  assert.match(layout, /template:\s*["'`]%s \| NaijaArtisans["'`]/);

  const others = files.filter(
    (f) => !f.replace(/\\/g, "/").endsWith("src/app/layout.js") && /template:\s*["'`]%s/.test(readFileSync(f, "utf8"))
  );
  assert.deepEqual(others, [], "a second title template would fight the root one");
});
