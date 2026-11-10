// Real posts from the site's history: which are jobs, which are adverts.

import test from "node:test";
import assert from "node:assert/strict";
import { screenJobPost, holdReasonText, HELD } from "../src/lib/job-screen.js";

const C = "CUSTOMER";

test("anything an ARTISAN account posts is held for the owner", () => {
  const r = screenJobPost({ posterRole: "ARTISAN", title: "Pile breaker", description: "Pile breakers needed at Eko Atlantic" });
  assert.deepEqual(r, { hold: true, reason: "artisan_poster" });
});

test("adverts from customer accounts are held", () => {
  const adverts = [
    ["Pop plaster of Paris", "I am a skilled POP (Plaster of Paris) worker with experience in ceiling installation"],
    ["Dealing with plumbing fixtures such as tap fa", "I am professional plumber"],
    ["Plumbing Technician", "Professional Plumbing Technician experienced in pipe installation, repairs, bathroom fitting"],
    ["Portrait drawing", "Hey there! Just a quick shoutout - I'm Gerald.o, a passionate realism pencil artist"],
    ["Phone repairs", "I am a phone repair technician based in Maiduguri. Call me on 0906..."],
  ];
  for (const [title, description] of adverts) {
    assert.equal(screenJobPost({ posterRole: C, title, description }).hold, true, title);
  }
});

test("real customer jobs go straight out", () => {
  const jobs = [
    ["Range of carpentry work", "I need a carpenter for a range of carpentry work including fixing protective nets"],
    ["Electrical service needed", "My lamp holder is bad"],
    ["Painting and screen of house", "From November"],
    ["Fix leaking kitchen sink", "Sink has been leaking under the cabinet since Monday."],
    ["Plumber", "I am a landlord looking for a plumber for my flats in Yaba"],
    ["Professional cleaning needed", "End of tenancy clean for a 3-bed flat in Lekki"],
  ];
  for (const [title, description] of jobs) {
    assert.deepEqual(screenJobPost({ posterRole: C, title, description }), { hold: false, reason: null }, title);
  }
});

test("missing input does not crash and is not held", () => {
  assert.deepEqual(screenJobPost(undefined), { hold: false, reason: null });
});

test("every hold reason has owner-facing text", () => {
  assert.equal(HELD, "HELD");
  assert.ok(holdReasonText("artisan_poster"));
  assert.ok(holdReasonText("reads_like_advert"));
});
