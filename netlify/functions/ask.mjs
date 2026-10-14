import { KYLE_SYSTEM_PROMPT, MODE_HINTS } from "./kyle-prompt.mjs";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const FALLBACK_MODELS = ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-sonnet-4-5", "claude-haiku-4-5"];
const MAX_TURNS = 12;       // keep last N messages for context
const MAX_CHARS = 4000;      // per user message

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json(500, { error: "Server is missing ANTHROPIC_API_KEY." });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON." });
  }

  const mode = MODE_HINTS[body.mode] ? body.mode : "think";
  const history = Array.isArray(body.messages) ? body.messages : [];

  const messages = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return json(400, { error: "Send a question." });
  }
  // Drop leading assistant turns so the conversation starts with the user.
  while (messages.length && messages[0].role !== "user") messages.shift();

  const call = (model) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: `${KYLE_SYSTEM_PROMPT}\n\n${MODE_HINTS[mode]}`,
        messages,
      }),
    });

  try {
    // Try the configured model first, then fall back if the key can't use it.
    const models = [...new Set([MODEL, ...FALLBACK_MODELS])];
    let res, data;
    for (const model of models) {
      res = await call(model);
      data = await res.json().catch(() => ({}));
      const notFound = res.status === 404 || data?.error?.type === "not_found_error";
      if (res.ok || !notFound) break;
      console.warn(`Model ${model} unavailable, trying next.`);
    }

    if (!res.ok) {
      console.error("Anthropic error", res.status, data);
      const type = data?.error?.type || "";
      const msg = data?.error?.message || "";
      let hint = "The AI is unavailable right now. Try again in a moment.";
      if (res.status === 401 || type === "authentication_error")
        hint = "Setup issue: the API key is invalid. Check ANTHROPIC_API_KEY in Netlify, then redeploy.";
      else if (/credit|billing|balance/i.test(msg))
        hint = "Setup issue: the Anthropic account has no credits. Add credits in the Anthropic Console.";
      else if (res.status === 429 || type === "rate_limit_error")
        hint = "Too many requests right now. Try again in a minute.";
      else if (res.status === 529 || type === "overloaded_error")
        hint = "The AI is busy right now. Try again in a moment.";
      return json(502, { error: hint, detail: `${res.status} ${type}: ${msg}`.slice(0, 300) });
    }
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return json(200, { reply });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Something went wrong. Try again." });
  }
};

export const config = { path: "/api/ask" };
