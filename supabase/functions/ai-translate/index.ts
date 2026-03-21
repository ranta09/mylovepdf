import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const mode = body.mode ?? "translate";

    // ── Detect language mode ─────────────────────────────────────────────────
    if (mode === "detect") {
      const sample = String(body.text ?? "").slice(0, 1500);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "Detect the primary language of the given text. Reply with ONLY the language name in English (e.g. Spanish, French, Hindi, Chinese, Arabic). No other output.",
            },
            { role: "user", content: sample },
          ],
          temperature: 0,
        }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const d = await res.json();
      const detectedLanguage = (d.choices?.[0]?.message?.content ?? "English")
        .trim()
        .replace(/[^a-zA-Z\s]/g, "")
        .trim();
      return new Response(JSON.stringify({ detectedLanguage }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Translate mode ────────────────────────────────────────────────────────
    const { text, targetLanguage, sourceLanguage } = body;

    if (!text || !targetLanguage) {
      return new Response(JSON.stringify({ error: "Missing required fields: text and targetLanguage" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const srcCtx = sourceLanguage ? ` from ${sourceLanguage}` : "";
    const inputText = String(text).slice(0, 12000);

    // Count approximate words for response metadata
    const wordCount = inputText.split(/\s+/).filter(Boolean).length;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional document translator specializing in accurate, natural translation${srcCtx} into ${targetLanguage}.

FORMATTING RULES (CRITICAL: follow exactly):
- Preserve ALL markdown formatting: headings (#, ##, ###), bullet points (-, *), numbered lists (1., 2., 3.), bold (**text**), italic (*text*), tables (| col | col |), and blank lines between paragraphs
- Keep proper nouns, brand names, product names, and technical terms in their original form unless there is a well-known ${targetLanguage} equivalent
- Preserve table structures: translate cell text but keep | separators and header rows
- Preserve code blocks exactly as-is (do not translate code)
- Preserve URLs and email addresses exactly as-is
- Maintain ALL blank lines between paragraphs: do not compress the document

TRANSLATION QUALITY:
- Produce natural, fluent ${targetLanguage}: not word-for-word literal translation
- Match the tone and register of the original (formal/informal/technical/conversational)
- Ensure grammatical correctness and idiomatic expression in ${targetLanguage}
- For academic or technical texts, use the appropriate ${targetLanguage} technical vocabulary

OUTPUT:
- Output ONLY the translated text
- Do NOT add explanations, translator's notes, or any commentary
- Do NOT include the original text in your output`,
          },
          { role: "user", content: inputText },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      if (res.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage limit reached. Please try again later." }),
          { status: 402, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `AI error: ${res.status}: ${t}` }),
        { status: res.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const d = await res.json();
    const translation = d.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ translation, wordCount }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
