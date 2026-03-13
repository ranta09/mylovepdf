import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUICK_PROMPTS: Record<string, string> = {
  summarize: "Provide a comprehensive, well-structured summary of this document. Use headers, bullet points and paragraphs. Cover all major topics and sections.",
  keypoints: "Extract the most important key points, insights, and findings from this document. Format as a numbered list grouped by theme. Be specific and include any data or statistics.",
  studynotes: "Create detailed study notes from this document. Include: main concepts, definitions, important facts, and a glossary of key terms. Format for easy revision.",
  quiz: "Generate 8 multiple-choice quiz questions from this document. For each question provide: the question, 4 options (A/B/C/D), the correct answer, and a brief explanation.",
  explain: "Identify and explain the 5 most complex or technical concepts in this document in simple, accessible language. Use analogies where helpful.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { documentText, messages, mode = "chat" } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Trim document to fit context (keep first 40k chars — roughly 30 pages)
    const doc = (documentText ?? "").slice(0, 40000);

    const SYSTEM = `You are an expert AI document assistant. You help users understand documents deeply.

RULES:
- Answer ONLY from the provided document content
- When referencing specific content, indicate approximate location (e.g., "In the introduction...", "According to section 3...", "As stated on page ~N...")
- If information is not in the document, clearly say: "This information is not available in the provided document."
- Be precise, helpful, and thorough
- Format responses with markdown (headers, bullets, bold) for readability

DOCUMENT CONTENT:
${doc}`;

    // Quick action modes — non-streaming JSON response
    if (mode !== "chat") {
      const prompt = QUICK_PROMPTS[mode] ?? QUICK_PROMPTS.summarize;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
        }),
      });
      if (!res.ok) return new Response(JSON.stringify({ error: `AI error: ${res.status}` }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
      const d = await res.json();
      const result = d.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ result }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Chat mode — streaming SSE
    const chatMessages = (messages ?? []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM }, ...chatMessages],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${res.status}: ${t}` }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(res.body, { headers: { ...cors, "Content-Type": "text/event-stream" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
