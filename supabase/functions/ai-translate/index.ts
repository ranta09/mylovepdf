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

    // ── Detect language mode ──────────────────────────────────────────────
    if (mode === "detect") {
      const sample = String(body.text ?? "").slice(0, 1500);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Detect the primary language of the given text. Reply with ONLY the language name in English (e.g. Spanish, French, Hindi, Chinese). No other output." },
            { role: "user", content: sample },
          ],
          temperature: 0,
        }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const d = await res.json();
      const detectedLanguage = (d.choices?.[0]?.message?.content ?? "English").trim().replace(/[^a-zA-Z\s]/g, "").trim();
      return new Response(JSON.stringify({ detectedLanguage }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Translate mode ────────────────────────────────────────────────────
    const { text, targetLanguage, sourceLanguage } = body;
    const srcCtx = sourceLanguage ? ` from ${sourceLanguage}` : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional document translator. Translate the text${srcCtx} into ${targetLanguage}.

RULES:
- Preserve all formatting: headings (#, ##), bullet points (-, *), numbered lists, bold (**text**), tables, and blank lines between paragraphs
- Keep proper nouns, brand names, and technical terms in their original form where appropriate
- Produce natural, fluent ${targetLanguage} — not word-for-word literal translation
- Do NOT add explanations, notes, or commentary
- Do NOT include the original text in your output
- Output ONLY the translated text`,
          },
          { role: "user", content: String(text).slice(0, 12000) },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `AI error: ${res.status}: ${t}` }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const d = await res.json();
    const translation = d.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ translation }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
