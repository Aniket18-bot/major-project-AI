const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-4o-mini";

export async function completeChat(input: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  json?: boolean;
}) {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing. Add it to your .env file.");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:8080",
      "X-Title": "HireSense AI",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: input.system }, ...input.messages],
      temperature: 0.4,
      ...(input.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenRouter error (${response.status})`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("The AI returned an empty response. Try again.");
  return content;
}

export function extractJsonObject(text: string) {
  const fenced = text.match(/```json([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Could not parse AI JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
}
