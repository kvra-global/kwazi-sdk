// <kwazi-chat>: an embeddable, animated Kwazi tutor. It talks to the API only with a short-lived
// widget session token minted by your server, so no secret key ever reaches the browser.
// Everything the model says is rendered as text, never as HTML.

import { styles } from "./styles.js";

export type Grade = "R" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Answer {
  answerId: string;
  understoodQuestion: string;
  topic: string;
  steps: Array<{ title: string; explanation: string; math: string }>;
  finalAnswer: string;
  checkYourself: { prompt: string; choices: string[]; correctIndex: number } | null;
  followUps: string[];
  citations: Array<{ title: string; url: string; kind: string }>;
  confidence: "high" | "medium" | "low";
  model: string;
  safety: { allowed: boolean; categories: string[] };
}

type Session = { expiresAt: string; sources: Array<{ id: string; title: string }>; grade: string | null; subject: string | null };
type Attachment = { mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf"; data: string; name?: string };
type Purpose = "question" | "breakdown" | "practice";

export interface MountOptions {
  /** Returns a fresh widget session token (kwz_ws_…) from your server. */
  getToken: () => Promise<string>;
  /** Where to put the widget; defaults to document.body as a floating launcher. */
  target?: HTMLElement;
  /** Render as an inline panel inside target instead of a floating launcher. */
  inline?: boolean;
  apiBase?: string;
  title?: string;
  /** Any CSS colour for buttons and highlights. */
  accent?: string;
  open?: boolean;
}

const DEFAULT_API = "https://api.kwazi.kvra.co.za";
const subjects = [
  "Mathematics",
  "Mathematical Literacy",
  "Physical Sciences",
  "Life Sciences",
  "Natural Sciences",
  "Accounting",
  "Economics",
  "Business Studies",
  "Geography",
  "History",
  "English",
  "Afrikaans",
  "isiZulu",
  "isiXhosa",
  "Technology"
];
const thinking = ["Reading your question…", "Checking the sources…", "Working it out step by step…", "Making it simple…"];
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className: string, label: string, onClick: () => void, aria?: string): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  if (aria) node.setAttribute("aria-label", aria);
  node.addEventListener("click", onClick);
  return node;
}

const toBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

/** Photos are downscaled to at most 1600px so they upload quickly on mobile data. */
async function readUpload(file: File): Promise<Attachment> {
  if (file.type === "application/pdf") {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("PDFs must be smaller than 6 MB");
    return { mediaType: "application/pdf", data: toBase64(await file.arrayBuffer()), name: file.name.slice(0, 120) };
  }
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo or a PDF");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("That photo could not be read");
  return { mediaType: "image/jpeg", data: toBase64(await blob.arrayBuffer()), name: file.name.slice(0, 120) };
}

export class KwaziChat extends HTMLElement {
  getToken: (() => Promise<string>) | null = null;
  private token: string | null = null;
  private session: Session | null = null;
  private readonly root: ShadowRoot;
  private panel!: HTMLDivElement;
  private log!: HTMLDivElement;
  private input!: HTMLTextAreaElement;
  private sendButton!: HTMLButtonElement;
  private gradeSelect!: HTMLSelectElement;
  private subjectInput!: HTMLInputElement;
  private pickers!: HTMLDivElement;
  private sourcesRow!: HTMLDivElement;
  private pending: Attachment | null = null;
  private preview!: HTMLDivElement;
  private busy = false;
  private started = false;

  static get observedAttributes() {
    return ["open", "accent"];
  }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (this.started) return;
    this.started = true;
    this.render();
    if (this.hasAttribute("open") || this.hasAttribute("inline")) this.setOpen(true);
  }

  attributeChangedCallback(name: string) {
    if (!this.started) return;
    if (name === "open") this.setOpen(this.hasAttribute("open"));
    if (name === "accent") this.applyAccent();
  }

  private get apiBase() {
    return (this.getAttribute("api-base") || DEFAULT_API).replace(/\/$/, "");
  }

  private applyAccent() {
    const accent = this.getAttribute("accent");
    if (accent && CSS.supports("color", accent)) this.style.setProperty("--kwazi-accent", accent);
  }

  private render() {
    const style = el("style");
    style.textContent = styles;
    this.root.append(style);
    this.applyAccent();
    const inline = this.hasAttribute("inline");
    this.toggleAttribute("data-inline", inline);

    if (!inline) {
      const launcher = button("launcher", "", () => this.setOpen(!this.panel.classList.contains("open")), "Open Kwazi tutor");
      launcher.append(el("span", "launcher-ring"), el("span", "launcher-face", "K"));
      this.root.append(launcher);
    }

    this.panel = el("div", `panel${inline ? " inline" : ""}`);
    this.panel.setAttribute("role", "dialog");
    this.panel.setAttribute("aria-label", this.getAttribute("heading") || "Kwazi tutor");

    const header = el("div", "header");
    const brand = el("div", "brand");
    brand.append(el("span", "logo", "K"), el("span", "title", this.getAttribute("heading") || "Ask Kwazi"));
    header.append(brand);
    if (!inline) header.append(button("close", "×", () => this.setOpen(false), "Close"));
    this.sourcesRow = el("div", "sources");

    this.pickers = el("div", "pickers");
    this.gradeSelect = el("select", "picker");
    this.gradeSelect.setAttribute("aria-label", "Grade");
    for (const grade of ["R", ...Array.from({ length: 12 }, (_, index) => String(index + 1))]) {
      const option = el("option", undefined, grade === "R" ? "Grade R" : `Grade ${grade}`);
      option.value = grade;
      this.gradeSelect.append(option);
    }
    this.gradeSelect.value = "9";
    this.subjectInput = el("input", "picker");
    this.subjectInput.setAttribute("aria-label", "Subject");
    this.subjectInput.setAttribute("list", "kwazi-subjects");
    this.subjectInput.value = "Mathematics";
    const list = el("datalist");
    list.id = "kwazi-subjects";
    for (const subject of subjects) list.append(Object.assign(el("option"), { value: subject }));
    this.pickers.append(this.gradeSelect, this.subjectInput, list);

    this.log = el("div", "log");
    this.log.setAttribute("aria-live", "polite");
    this.log.append(this.welcome());

    this.preview = el("div", "preview");
    const composer = el("div", "composer");
    const file = el("input");
    file.type = "file";
    file.accept = "image/*,application/pdf";
    file.hidden = true;
    file.addEventListener("change", () => {
      const chosen = file.files?.[0];
      file.value = "";
      if (chosen) void this.attach(chosen);
    });
    const camera = button("icon", "", () => file.click(), "Add a photo or PDF of the question");
    camera.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    this.input = el("textarea", "input");
    this.input.rows = 1;
    this.input.maxLength = 2000;
    this.input.placeholder = "Ask a question…";
    this.input.addEventListener("input", () => {
      this.input.style.height = "auto";
      this.input.style.height = `${Math.min(120, this.input.scrollHeight)}px`;
    });
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void this.submit();
      }
    });
    this.sendButton = button("send", "", () => void this.submit(), "Send");
    this.sendButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>';
    composer.append(camera, file, this.input, this.sendButton);

    const footer = el("div", "footer", "Kwazi can make mistakes; check important answers with your teacher.");
    this.panel.append(header, this.sourcesRow, this.pickers, this.log, this.preview, composer, footer);
    this.root.append(this.panel);
  }

  private welcome() {
    const card = el("div", "bubble kwazi welcome");
    card.append(el("strong", undefined, "Hi! I'm Kwazi."), el("p", undefined, "Ask me any schoolwork question, or snap a photo of it. I'll explain it step by step."));
    return card;
  }

  setOpen(open: boolean) {
    this.panel.classList.toggle("open", open);
    if (open) {
      void this.ensureSession();
      if (!this.hasAttribute("inline")) setTimeout(() => this.input.focus(), 250);
    }
  }

  private async fetchToken(): Promise<string> {
    if (this.getToken) return this.getToken();
    const direct = this.getAttribute("token");
    if (direct) return direct;
    const endpoint = this.getAttribute("session-endpoint");
    if (!endpoint) throw new Error("Set a session-endpoint or token on <kwazi-chat>");
    const response = await fetch(endpoint, { method: "POST", credentials: "same-origin", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Could not start a Kwazi session");
    const body = (await response.json()) as { token?: string };
    if (!body.token) throw new Error("The session endpoint did not return a token");
    return body.token;
  }

  private async api<T>(method: "GET" | "POST", path: string, body?: unknown, retry = true): Promise<T> {
    if (!this.token) this.token = await this.fetchToken();
    const response = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: { authorization: `Bearer ${this.token}`, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (response.status === 401 && retry) {
      this.token = null;
      return this.api(method, path, body, false);
    }
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) throw new Error(payload?.message || "Kwazi is not available right now. Please try again.");
    return payload as T;
  }

  private async ensureSession() {
    if (this.session) return;
    try {
      this.session = await this.api<Session>("GET", "/v1/widget/session");
      this.pickers.hidden = Boolean(this.session.grade && this.session.subject);
      this.gradeSelect.hidden = Boolean(this.session.grade);
      this.subjectInput.hidden = Boolean(this.session.subject);
      this.sourcesRow.replaceChildren(
        ...this.session.sources.map((source, index) => {
          const chip = el("span", "chip", source.title);
          chip.style.animationDelay = `${index * 80}ms`;
          return chip;
        })
      );
      if (this.session.sources.length > 0) this.sourcesRow.prepend(el("span", "chip-label", "Teaching from"));
    } catch (error) {
      this.notice(error instanceof Error ? error.message : "Kwazi could not start.");
    }
  }

  private async attach(file: File) {
    try {
      this.pending = await readUpload(file);
      this.preview.replaceChildren();
      const pill = el("div", "pill");
      if (this.pending.mediaType === "application/pdf") pill.append(el("span", "pdf", "PDF"));
      else pill.append(Object.assign(el("img"), { src: `data:${this.pending.mediaType};base64,${this.pending.data}`, alt: "" }));
      pill.append(el("span", undefined, file.name.slice(0, 40)), button("remove", "×", () => this.clearAttachment(), "Remove attachment"));
      this.preview.append(pill);
    } catch (error) {
      this.notice(error instanceof Error ? error.message : "That file could not be added.");
    }
  }

  private clearAttachment() {
    this.pending = null;
    this.preview.replaceChildren();
  }

  private notice(message: string) {
    const node = el("div", "notice", message);
    this.log.append(node);
    this.scrollToEnd();
  }

  private scrollToEnd() {
    requestAnimationFrame(() => this.log.scrollTo({ top: this.log.scrollHeight, behavior: "smooth" }));
  }

  private gradeValue(): Grade {
    const value = this.session?.grade ?? this.gradeSelect.value;
    return value === "R" ? "R" : (Number(value) as Grade);
  }

  private subjectValue(): string {
    return (this.session?.subject ?? this.subjectInput.value.trim()) || "Mathematics";
  }

  private async ask(question: string, purpose: Purpose, attachment: Attachment | null): Promise<Answer> {
    return this.api<Answer>("POST", "/v1/widget/questions", {
      grade: this.gradeValue(),
      subject: this.subjectValue().toLowerCase(),
      question,
      inputMode: attachment ? (attachment.mediaType === "application/pdf" ? "upload" : "photo") : "text",
      attachments: attachment ? [attachment] : [],
      purpose
    });
  }

  private thinkingBubble() {
    const bubble = el("div", "bubble kwazi thinking");
    const dots = el("span", "dots");
    dots.append(el("i"), el("i"), el("i"));
    const label = el("span", "thinking-text", thinking[0]);
    bubble.append(dots, label);
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % thinking.length;
      label.classList.remove("swap");
      void label.offsetWidth;
      label.classList.add("swap");
      label.textContent = thinking[index]!;
    }, 2200);
    return { bubble, stop: () => window.clearInterval(timer) };
  }

  async submit(text?: string) {
    if (this.busy) return;
    const question = (text ?? this.input.value).trim();
    const attachment = text ? null : this.pending;
    if (!question && !attachment) {
      this.input.focus();
      return;
    }
    this.busy = true;
    this.sendButton.disabled = true;
    const mine = el("div", "bubble me");
    if (attachment && attachment.mediaType !== "application/pdf") {
      mine.append(Object.assign(el("img", "thumb"), { src: `data:${attachment.mediaType};base64,${attachment.data}`, alt: "Your photo" }));
    } else if (attachment) {
      mine.append(el("span", "pdf", "PDF"));
    }
    if (question) mine.append(el("p", undefined, question));
    this.log.append(mine);
    if (!text) {
      this.input.value = "";
      this.input.style.height = "auto";
      this.clearAttachment();
    }
    const wait = this.thinkingBubble();
    this.log.append(wait.bubble);
    this.scrollToEnd();
    try {
      await this.ensureSession();
      const answer = await this.ask(question, "question", attachment);
      wait.stop();
      wait.bubble.replaceWith(this.answerCard(answer));
    } catch (error) {
      wait.stop();
      wait.bubble.remove();
      this.notice(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      this.busy = false;
      this.sendButton.disabled = false;
      this.scrollToEnd();
    }
  }

  private answerCard(answer: Answer, nested = false): HTMLElement {
    const card = el("div", `answer${nested ? " nested" : ""}`);
    if (!answer.safety.allowed) {
      card.classList.add("safety");
      card.append(el("p", undefined, answer.steps[0]?.explanation ?? "Let's pause here."), el("p", "final-text", answer.finalAnswer));
      return card;
    }
    if (!nested) {
      const head = el("div", "answer-head");
      head.append(el("span", "topic", answer.topic));
      if (answer.confidence === "low") head.append(el("span", "low", "Double-check this one"));
      card.append(head, el("p", "understood", answer.understoodQuestion));
    }
    const steps = el("ol", "steps");
    card.append(steps);
    let shown = 0;
    const more = el("div", "step-controls");
    const after = el("div", "after");
    const final = el("div", "final");
    final.append(el("span", "final-label", "Answer"), el("span", "final-text", answer.finalAnswer));
    const reveal = (count: number) => {
      const start = shown;
      const target = Math.min(answer.steps.length, shown + count);
      for (; shown < target; shown += 1) {
        const item = this.stepItem(answer, shown, nested);
        item.style.animationDelay = `${(shown - start) * 90}ms`;
        steps.append(item);
      }
      if (shown >= answer.steps.length) {
        more.remove();
        card.insertBefore(final, after);
        final.classList.add("pop");
      }
      this.scrollToEnd();
    };
    more.append(button("ghost", "Next step", () => reveal(1)), button("ghost", "Show all", () => reveal(answer.steps.length)));
    card.append(more, after);
    reveal(nested ? answer.steps.length : 1);

    if (!nested && answer.checkYourself) after.append(this.checkCard(answer.checkYourself));
    if (!nested && answer.followUps.length > 0) {
      const chips = el("div", "followups");
      for (const followUp of answer.followUps) chips.append(button("followup", followUp, () => void this.submit(followUp)));
      after.append(chips);
    }
    const links = answer.citations.filter((citation) => /^https:\/\//.test(citation.url));
    if (!nested && links.length > 0) {
      const sources = el("div", "citations");
      sources.append(el("span", "chip-label", "Sources"));
      for (const citation of links) {
        const link = el("a", "citation", citation.title);
        link.href = citation.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        sources.append(link);
      }
      after.append(sources);
    }
    return card;
  }

  private stepItem(answer: Answer, index: number, nested: boolean) {
    const step = answer.steps[index]!;
    const item = el("li", "step");
    item.append(el("span", "step-number", String(index + 1)));
    const body = el("div", "step-body");
    body.append(el("strong", undefined, step.title), el("p", undefined, step.explanation));
    if (step.math) body.append(el("code", "math", step.math));
    if (!nested) {
      const help = button("breakdown", "Break it down", () => void this.breakdown(answer, index, help, body));
      body.append(help);
    }
    item.append(body);
    return item;
  }

  private async breakdown(answer: Answer, index: number, trigger: HTMLButtonElement, body: HTMLElement) {
    const step = answer.steps[index]!;
    trigger.disabled = true;
    trigger.classList.add("loading");
    trigger.textContent = "Breaking it down…";
    const question = [
      `I'm working on: "${answer.understoodQuestion}".`,
      `I'm stuck on step ${index + 1}: "${step.title}"${step.math ? ` (${step.math})` : ""}.`,
      "Please break this one step down into smaller, simpler steps.",
      "Only explain this step."
    ].join(" ");
    try {
      const smaller = await this.ask(question.slice(0, 2000), "breakdown", null);
      trigger.remove();
      body.append(this.answerCard(smaller, true));
    } catch (error) {
      trigger.disabled = false;
      trigger.classList.remove("loading");
      trigger.textContent = "Try again";
      this.notice(error instanceof Error ? error.message : "That step could not be broken down.");
    }
    this.scrollToEnd();
  }

  private checkCard(check: NonNullable<Answer["checkYourself"]>) {
    const card = el("div", "check");
    card.append(el("span", "check-label", "Check yourself"), el("p", undefined, check.prompt));
    const options = el("div", "choices");
    const choices = check.choices.map((choice, index) =>
      button("choice", choice, () => {
        for (const node of choices) node.disabled = true;
        const correct = index === check.correctIndex;
        choices[check.correctIndex]?.classList.add("right");
        if (!correct) choices[index]?.classList.add("wrong");
        const result = el("p", `result ${correct ? "yes" : "no"}`, correct ? "Yes! You've got it." : "Not quite — look at the highlighted answer and try the steps again.");
        card.append(result);
        if (correct) this.burst(card);
      })
    );
    options.append(...choices);
    card.append(options);
    return card;
  }

  /** A small confetti burst for a correct answer; skipped when the reader prefers less motion. */
  private burst(host: HTMLElement) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const layer = el("div", "confetti");
    for (let index = 0; index < 18; index += 1) {
      const piece = el("i");
      piece.style.setProperty("--x", `${Math.round((Math.random() - 0.5) * 220)}px`);
      piece.style.setProperty("--y", `${Math.round(-60 - Math.random() * 120)}px`);
      piece.style.setProperty("--r", `${Math.round(Math.random() * 720)}deg`);
      piece.style.background = ["#0F766E", "#FFB547", "#05A67A", "#EE5D50", "#3B82F6"][index % 5]!;
      layer.append(piece);
    }
    host.append(layer);
    setTimeout(() => layer.remove(), 1400);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("kwazi-chat")) {
  customElements.define("kwazi-chat", KwaziChat);
}

/** Adds the widget to the page and returns the element. */
export function mount(options: MountOptions): KwaziChat {
  const element = document.createElement("kwazi-chat") as KwaziChat;
  element.getToken = options.getToken;
  if (options.inline) element.setAttribute("inline", "");
  if (options.apiBase) element.setAttribute("api-base", options.apiBase);
  if (options.title) element.setAttribute("heading", options.title);
  if (options.accent) element.setAttribute("accent", options.accent);
  if (options.open) element.setAttribute("open", "");
  (options.target ?? document.body).append(element);
  return element;
}
