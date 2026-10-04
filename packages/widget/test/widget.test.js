import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";

const window = new Window({ url: "https://school.example/" });
for (const name of ["window", "document", "HTMLElement", "customElements", "CSS", "requestAnimationFrame", "createImageBitmap"]) {
  globalThis[name] = name === "window" ? window : window[name];
}
globalThis.CSS = { supports: () => true };
const { KwaziChat, mount } = await import("../dist/index.js");

const answer = {
  answerId: "a1",
  understoodQuestion: "What is 1/2 + 1/4?",
  topic: "Fractions",
  steps: [
    { title: "Same denominator <img src=x onerror=alert(1)>", explanation: "Make the bottoms equal.", math: "1/2 = 2/4" },
    { title: "Add", explanation: "Add the tops.", math: "2/4 + 1/4 = 3/4" }
  ],
  finalAnswer: "3/4",
  checkYourself: { prompt: "1/3 + 1/3?", choices: ["2/3", "2/6"], correctIndex: 0 },
  followUps: ["Why do denominators need to match?"],
  citations: [{ title: "Notes", url: "https://school.example/notes", kind: "web" }, { title: "Bad", url: "javascript:alert(1)", kind: "web" }],
  confidence: "high",
  model: "m",
  safety: { allowed: true, categories: [] }
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("renders, starts a session with the token and shows an animated, text-only answer", async () => {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method, auth: init.headers?.authorization, body: init.body ? JSON.parse(init.body) : null });
    if (url.endsWith("/v1/widget/session")) {
      return new Response(JSON.stringify({ expiresAt: "2026-10-04T12:00:00Z", sources: [{ id: "s1", title: "Term 2 notes" }], grade: "7", subject: "mathematics" }));
    }
    return new Response(JSON.stringify(answer));
  };
  const element = mount({ getToken: async () => "kwz_ws_test", open: true, apiBase: "https://api.example" });
  assert.ok(element instanceof KwaziChat);
  await settle();
  const root = element.shadowRoot;
  assert.equal(calls[0].url, "https://api.example/v1/widget/session");
  assert.equal(calls[0].auth, "Bearer kwz_ws_test");
  assert.match(root.querySelector(".sources").textContent, /Term 2 notes/);
  assert.equal(root.querySelector(".pickers").hidden, true);

  root.querySelector("textarea").value = "1/2 + 1/4?";
  await element.submit();
  await settle();
  assert.deepEqual(calls[1].body, { grade: 7, subject: "mathematics", question: "1/2 + 1/4?", inputMode: "text", attachments: [], purpose: "question" });
  assert.equal(root.querySelectorAll(".step").length, 1, "steps reveal one at a time");
  assert.equal(root.querySelector("img[src=x]"), null, "model text is never parsed as HTML");
  assert.match(root.querySelector(".step strong").textContent, /<img/);
  [...root.querySelectorAll(".ghost")].find((node) => node.textContent === "Show all").click();
  assert.equal(root.querySelectorAll(".step").length, 2);
  assert.equal(root.querySelector(".final-text").textContent, "3/4");
  const links = [...root.querySelectorAll("a.citation")];
  assert.deepEqual(links.map((link) => link.getAttribute("href")), ["https://school.example/notes"]);
  assert.equal(links[0].getAttribute("rel"), "noopener noreferrer");

  root.querySelector(".choice").click();
  assert.match(root.querySelector(".result").textContent, /got it/);
  element.remove();
});

test("breaks a step down with the breakdown purpose and nests the smaller steps", async () => {
  const bodies = [];
  globalThis.fetch = async (url, init = {}) => {
    if (url.endsWith("/v1/widget/session")) return new Response(JSON.stringify({ expiresAt: "x", sources: [], grade: null, subject: null }));
    bodies.push(JSON.parse(init.body));
    return new Response(JSON.stringify(answer));
  };
  const element = mount({ getToken: async () => "kwz_ws_test", open: true });
  await settle();
  const root = element.shadowRoot;
  assert.equal(root.querySelector(".pickers").hidden, false, "grade and subject pickers appear when the session leaves them open");
  await element.submit("What is 1/2 + 1/4?");
  await settle();
  root.querySelector(".breakdown").click();
  await settle();
  assert.equal(bodies[1].purpose, "breakdown");
  assert.match(bodies[1].question, /stuck on step 1/);
  assert.ok(root.querySelector(".answer.nested"));
  element.remove();
});

test("refreshes an expired token once and shows the server's message on failure", async () => {
  let tokens = 0;
  globalThis.fetch = async (url) => {
    if (url.endsWith("/v1/widget/session")) {
      return tokens < 2
        ? new Response(JSON.stringify({ message: "expired" }), { status: 401 })
        : new Response(JSON.stringify({ expiresAt: "x", sources: [], grade: "9", subject: "mathematics" }));
    }
    return new Response(JSON.stringify({ message: "You've used your 20 free credits." }), { status: 402 });
  };
  const element = mount({ getToken: async () => `kwz_ws_${++tokens}`, open: true });
  await settle();
  await settle();
  await element.submit("hello");
  await settle();
  assert.match(element.shadowRoot.querySelector(".notice:last-of-type").textContent, /20 free credits/);
  element.remove();
});
