// Nigerian phone normalisation for the admin follow-up links.
//
// A wa.me link built from a badly normalised number does not error — WhatsApp
// shows "the phone number shared via url is invalid", which reads as a WhatsApp
// problem rather than ours. So the shapes members actually type are pinned here.

import test from "node:test";
import assert from "node:assert/strict";
import { toInternationalNG, whatsAppLink } from "../src/lib/phone.js";

test("the everyday local form drops the trunk zero", () => {
  assert.equal(toInternationalNG("08012345678"), "2348012345678");
  assert.equal(toInternationalNG("0803 123 4567"), "2348031234567");
  assert.equal(toInternationalNG("0803-123-4567"), "2348031234567");
});

test("a number written without the trunk zero still works", () => {
  assert.equal(toInternationalNG("8012345678"), "2348012345678");
});

test("an already-international number is left alone", () => {
  assert.equal(toInternationalNG("2348012345678"), "2348012345678");
  assert.equal(toInternationalNG("+234 801 234 5678"), "2348012345678");
  assert.equal(toInternationalNG("+234-801-234-5678"), "2348012345678");
});

test("a trunk zero typed in front of the country code is dropped", () => {
  assert.equal(toInternationalNG("02348012345678"), "2348012345678");
});

test("junk returns null rather than a guess", () => {
  // A link to the wrong person is worse than no link.
  assert.equal(toInternationalNG(""), null);
  assert.equal(toInternationalNG(null), null);
  assert.equal(toInternationalNG(undefined), null);
  assert.equal(toInternationalNG("not a phone"), null);
  assert.equal(toInternationalNG("12345"), null, "too short to be anyone's number");
});

test("a whatsapp link carries the prefilled message", () => {
  const link = whatsAppLink("08012345678", "Hi there");
  assert.equal(link, "https://wa.me/2348012345678?text=Hi%20there");
});

test("no number means no link, not a broken one", () => {
  assert.equal(whatsAppLink("nonsense", "Hi"), null);
  assert.equal(whatsAppLink(null), null);
});

test("a link without a message is still valid", () => {
  assert.equal(whatsAppLink("08012345678"), "https://wa.me/2348012345678");
});
