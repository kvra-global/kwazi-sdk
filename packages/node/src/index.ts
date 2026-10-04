// Kwazi developer API client for Node.js 18+. No dependencies: it uses the built-in fetch.

export type Grade = "R" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Depth = "quick" | "thorough";

export interface Attachment {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  /** Base64 without a data: prefix, at most 6 MB before encoding. */
  data: string;
  name?: string;
}

export interface Source {
  id: string;
  url: string;
  title: string;
  subject: string | null;
  grade: string | null;
  mediaType: "application/pdf" | "text/plain" | null;
  bytes: number;
  status: "ready" | "failed";
  error: string | null;
  createdAt: string;
}

export interface Answer {
  answerId: string;
  understoodQuestion: string;
  topic: string;
  steps: Array<{ title: string; explanation: string; math: string }>;
  finalAnswer: string;
  checkYourself: { prompt: string; choices: string[]; correctIndex: number } | null;
  followUps: string[];
  citations: Array<{ title: string; url: string; kind: "textbook" | "past-paper" | "memo" | "curriculum" | "web" }>;
  confidence: "high" | "medium" | "low";
  model: string;
  safety: { allowed: boolean; categories: string[] };
}

export interface WidgetSession {
  token: string;
  expiresAt: string;
  sources: Array<{ id: string; title: string }>;
  grade: string | null;
  subject: string | null;
}

export interface QuestionInput {
  grade: Grade;
  subject: string;
  question: string;
  attachments?: Attachment[];
  sourceIds?: string[];
  purpose?: "question" | "breakdown" | "practice";
  depth?: Depth;
}

export interface LessonInput {
  grade: Grade;
  subject: string;
  topic: string;
  sourceIds?: string[];
  depth?: Depth;
}

export interface SourceInput {
  url: string;
  title?: string;
  subject?: string;
  grade?: Grade;
}

export interface WidgetSessionInput {
  sourceIds?: string[];
  grade?: Grade;
  subject?: string;
  /** 60 to 86400 seconds; one hour by default. */
  ttlSeconds?: number;
}

export interface KwaziOptions {
  /** A secret key (kwz_sk_…). Defaults to the KWAZI_API_KEY environment variable. */
  apiKey?: string;
  baseUrl?: string;
  /** Per-request timeout in milliseconds; answers can take up to a minute. */
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class KwaziError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null
  ) {
    super(message);
    this.name = "KwaziError";
  }
}

export const DEFAULT_BASE_URL = "https://api.kwazi.kvra.co.za";

export class Kwazi {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: KwaziOptions = {}) {
    const apiKey = options.apiKey ?? (typeof process !== "undefined" ? process.env.KWAZI_API_KEY : undefined);
    if (!apiKey) throw new Error("Pass apiKey or set KWAZI_API_KEY");
    if (!apiKey.startsWith("kwz_sk_")) throw new Error("Kwazi secret keys start with kwz_sk_");
    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 90_000;
    this.fetchImpl = options.fetch ?? fetch;
  }

  /** Data sources: public https PDFs, web pages or text that Kwazi fetches once and teaches from. */
  readonly sources = {
    create: (input: SourceInput) => this.request<Source>("POST", "/v1/sources", input),
    list: async () => (await this.request<{ sources: Source[] }>("GET", "/v1/sources")).sources,
    delete: (sourceId: string) => this.request<void>("DELETE", `/v1/sources/${encodeURIComponent(sourceId)}`)
  };

  readonly questions = {
    ask: (input: QuestionInput) => this.request<Answer>("POST", "/v1/questions", input)
  };

  readonly lessons = {
    create: (input: LessonInput) => this.request<Answer>("POST", "/v1/lessons", input)
  };

  /** Short-lived tokens for the chat widget, so the browser never sees your secret key. */
  readonly widgetSessions = {
    create: (input: WidgetSessionInput = {}) => this.request<WidgetSession>("POST", "/v1/widget/sessions", input)
  };

  /** Builds an attachment from bytes, for example a photo of a question. */
  static attachment(bytes: Uint8Array, mediaType: Attachment["mediaType"], name?: string): Attachment {
    return { mediaType, data: Buffer.from(bytes).toString("base64"), ...(name ? { name } : {}) };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        accept: "application/json",
        "user-agent": "kwazi-node/0.1.0",
        ...(body !== undefined ? { "content-type": "application/json" } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    if (response.status === 204) return undefined as T;
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (payload as { message?: unknown; error?: unknown } | null)?.message ?? (payload as { error?: unknown } | null)?.error;
      throw new KwaziError(response.status, typeof message === "string" ? message : `Kwazi returned HTTP ${response.status}`, payload);
    }
    return payload as T;
  }
}

export default Kwazi;
