import fetch, { type Response } from "node-fetch";
import FormData from "form-data";
import type { ZodType } from "zod";

type Role = "system" | "user" | "assistant";
type Provider = "groq" | "ollama";

interface ChatMessage {
  role: Role;
  content: string;
}

const DEFAULT_PROVIDER = (process.env.LLM_PROVIDER || "groq") as Provider;

// --- Groq rate limits ------------------------------------------------------
// The free/on-demand tier caps tokens per minute across the whole org (8,000
// for gpt-oss-120b), and one resume analysis makes several calls at once. A
// 429 says how long to wait, so wait that long and try again -- and hold every
// other Groq call during the wait, so parallel calls don't all retry together
// and trip the limit again.

const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_WAIT_MS = 45_000;
let groqBlockedUntil = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class LlmBusyError extends Error {
  constructor() {
    super("The AI service is busy right now. Please try again in a minute.");
  }
}

/** How long Groq asks us to wait: the Retry-After header, or the "try again
 * in 11.52s / 1m2.5s / 350ms" text in the error body. */
export function retryDelayMs(retryAfterHeader: string | null, body: string): number | null {
  const header = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  if (Number.isFinite(header) && header >= 0) return header * 1000;
  const m = body.match(/try again in (?:(\d+)m(?!s))?(?:([\d.]+)s)?(?:([\d.]+)ms)?/i);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 60_000 + Number(m[2] ?? 0) * 1000 + Number(m[3] ?? 0);
}

/** A single request bigger than the whole per-minute allowance can never
 * succeed, so waiting would be pointless. */
export function exceedsLimit(body: string): boolean {
  const m = body.match(/Limit (\d+), Used \d+, Requested (\d+)/);
  return !!m && Number(m[2]) > Number(m[1]);
}

export async function groqRequest(makeRequest: () => Promise<Response>, what: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const wait = groqBlockedUntil - Date.now();
    if (wait > 0) await sleep(wait + Math.random() * 1500);

    const res = await makeRequest();
    if (res.status !== 429) return res;

    const body = await res.text();
    if (exceedsLimit(body)) {
      throw new Error(`${what} failed: this request is larger than the AI service's per-minute limit. ${body}`);
    }
    const delay = retryDelayMs(res.headers.get("retry-after"), body);
    if (attempt >= MAX_RATE_LIMIT_RETRIES || (delay ?? 0) > MAX_WAIT_MS) {
      console.warn(`${what}: rate limited, giving up after ${attempt} retries. ${body.slice(0, 300)}`);
      throw new LlmBusyError();
    }
    const backoff = Math.min(MAX_WAIT_MS, delay ?? 2000 * 2 ** attempt) + 500;
    console.warn(`${what}: rate limited, waiting ${Math.round(backoff / 1000)}s (retry ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`);
    groqBlockedUntil = Math.max(groqBlockedUntil, Date.now() + backoff);
  }
}

async function callGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const res = await groqRequest(
    () =>
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0,
          seed: 42,
          response_format: { type: "json_object" },
        }),
      }),
    "Groq request"
  );

  if (!res.ok) {
    throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  return data.choices[0].message.content as string;
}

async function callOllama(messages: ChatMessage[]): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: "json",
      options: { temperature: 0, seed: 42 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  return data.message.content as string;
}

async function chat(messages: ChatMessage[], provider: Provider): Promise<string> {
  if (provider === "ollama") return callOllama(messages);
  if (provider === "groq") return callGroq(messages);
  throw new Error(`Unknown LLM provider: ${provider}`);
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

/** Ollama's /api/chat wants raw base64 on `images`, not a data: URL. */
function stripDataUrlPrefix(imageDataUrl: string): string {
  const commaIndex = imageDataUrl.indexOf(",");
  return commaIndex === -1 ? imageDataUrl : imageDataUrl.slice(commaIndex + 1);
}

async function callOllamaVision(
  systemPrompt: string,
  imageDataUrl: string
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_VISION_MODEL || "moondream";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: systemPrompt,
          images: [stripDataUrlPrefix(imageDataUrl)],
        },
      ],
      stream: false,
      format: "json",
      options: { temperature: 0.1 },
      // Keep the vision model resident in GPU memory between the periodic
      // proctoring checks (spaced ~15s apart) so each call only pays for
      // inference, not a repeated multi-second model load.
      keep_alive: "10m",
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama vision request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;
  return data.message.content as string;
}

/**
 * Sends a single image plus an instruction prompt to a local Ollama vision
 * model and validates the JSON response against a Zod schema. Retries once
 * (a fresh call, not a conversation follow-up) on malformed JSON before
 * throwing.
 */
export async function analyzeImageStructured<T>(
  schema: ZodType<T, any, any>,
  systemPrompt: string,
  imageDataUrl: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callOllamaVision(systemPrompt, imageDataUrl);
    try {
      const parsed = JSON.parse(extractJson(raw));
      return schema.parse(parsed);
    } catch (err) {
      lastError = err as Error;
      console.warn(
        `analyzeImageStructured: attempt ${attempt + 1} failed validation: ${lastError.message}. Raw response: ${raw.slice(0, 500)}`
      );
    }
  }

  throw new Error(
    `Vision LLM returned invalid JSON after retry: ${lastError?.message ?? "unknown error"}`
  );
}

const AUDIO_EXTENSION_BY_MIMETYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "mp4",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/flac": "flac",
};

/**
 * Transcribes a recorded audio clip via Groq's OpenAI-compatible Whisper
 * endpoint. `mimetype` is passed straight through from the browser's
 * MediaRecorder blob (typically "audio/webm"). Groq validates the file type
 * from the multipart filename's extension, not the Content-Type header, so
 * the filename MUST carry a real extension or every upload gets rejected
 * with "file must be one of the following types" regardless of the actual
 * content-type sent.
 */
export async function transcribeAudio(
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
  // Without an explicit language, Whisper auto-detects from the audio and
  // can guess wrong on ambiguous or accented speech, returning a transcript
  // in the wrong language entirely. Pin it (ISO-639-1), configurable per
  // deployment rather than hardcoded.
  const language = process.env.GROQ_WHISPER_LANGUAGE || "en";

  const baseMimetype = mimetype.split(";")[0].trim();
  const extension = AUDIO_EXTENSION_BY_MIMETYPE[baseMimetype] || "webm";

  const form = new FormData();
  form.append("file", buffer, {
    filename: `audio.${extension}`,
    contentType: mimetype,
  });
  form.append("model", model);
  form.append("language", language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Groq transcription failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

export interface GenerateStructuredOptions {
  /** Override the default provider (env LLM_PROVIDER) for just this call. */
  provider?: Provider;
}

/**
 * Calls the configured LLM provider and validates the response against a Zod
 * schema. Retries once (with the model's own bad output fed back) on
 * malformed JSON or schema failure before throwing.
 */
export async function generateStructured<T>(
  schema: ZodType<T, any, any>,
  systemPrompt: string,
  userPrompt: string,
  options?: GenerateStructuredOptions
): Promise<T> {
  const provider = options?.provider ?? DEFAULT_PROVIDER;
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(messages, provider);
    try {
      const parsed = JSON.parse(extractJson(raw));
      return schema.parse(parsed);
    } catch (err) {
      lastError = err as Error;
      console.warn(
        `generateStructured: attempt ${attempt + 1} failed validation: ${lastError.message}. Raw response: ${raw.slice(0, 500)}`
      );
      messages.push({ role: "assistant", content: raw });
      messages.push({
        role: "user",
        content: `That response was not valid JSON matching the required schema: ${lastError.message}. Fix that specific problem and respond again with ONLY the corrected JSON object, no prose, no markdown code fences.`,
      });
    }
  }

  throw new Error(
    `LLM returned invalid JSON after retry: ${lastError?.message ?? "unknown error"}`
  );
}
