import { test } from "node:test";
import assert from "node:assert/strict";
import { Kwazi, KwaziError } from "../dist/index.js";

const fakeFetch = (status, body, seen) => async (url, init) => {
  seen.push({ url, init });
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
};

test("sends the secret key and JSON body to the API", async () => {
  const seen = [];
  const kwazi = new Kwazi({ apiKey: "kwz_sk_test", fetch: fakeFetch(200, { finalAnswer: "3/4" }, seen) });
  const answer = await kwazi.lessons.create({ grade: 7, subject: "mathematics", topic: "Adding fractions", sourceIds: ["s1"] });
  assert.equal(answer.finalAnswer, "3/4");
  assert.equal(seen[0].url, "https://api.kwazi.kvra.co.za/v1/lessons");
  assert.equal(seen[0].init.headers.authorization, "Bearer kwz_sk_test");
  assert.deepEqual(JSON.parse(seen[0].init.body), { grade: 7, subject: "mathematics", topic: "Adding fractions", sourceIds: ["s1"] });
});

test("unwraps lists and handles empty responses", async () => {
  const seen = [];
  const list = new Kwazi({ apiKey: "kwz_sk_test", fetch: fakeFetch(200, { sources: [{ id: "s1" }] }, seen) });
  assert.deepEqual(await list.sources.list(), [{ id: "s1" }]);
  const removed = new Kwazi({ apiKey: "kwz_sk_test", baseUrl: "https://example.test/", fetch: fakeFetch(204, undefined, seen) });
  assert.equal(await removed.sources.delete("a/b"), undefined);
  assert.equal(seen[1].url, "https://example.test/v1/sources/a%2Fb");
});

test("raises KwaziError with the server's message", async () => {
  const kwazi = new Kwazi({ apiKey: "kwz_sk_test", fetch: fakeFetch(402, { statusCode: 402, error: "Payment Required", message: "You've used your 20 free credits." }, []) });
  await assert.rejects(kwazi.questions.ask({ grade: 9, subject: "mathematics", question: "x?" }), (error) => {
    assert.ok(error instanceof KwaziError);
    assert.equal(error.status, 402);
    assert.equal(error.message, "You've used your 20 free credits.");
    return true;
  });
});

test("refuses a missing or non-secret key", () => {
  delete process.env.KWAZI_API_KEY;
  assert.throws(() => new Kwazi(), /KWAZI_API_KEY/);
  assert.throws(() => new Kwazi({ apiKey: "kwz_ws_browser" }), /kwz_sk_/);
});

test("builds attachments from bytes", () => {
  assert.deepEqual(Kwazi.attachment(new Uint8Array([1, 2, 3]), "image/png"), { mediaType: "image/png", data: "AQID" });
});

test("reads usage and limits", async () => {
  const seen = [];
  const kwazi = new Kwazi({ apiKey: "kwz_sk_test", fetch: fakeFetch(200, { limits: { tier: "free", perKeyDaily: 20 }, keyRequestsToday: 3 }, seen) });
  const usage = await kwazi.usage();
  assert.equal(usage.limits.perKeyDaily, 20);
  assert.equal(seen[0].url, "https://api.kwazi.kvra.co.za/v1/usage");
  assert.equal(seen[0].init.method, "GET");
});
