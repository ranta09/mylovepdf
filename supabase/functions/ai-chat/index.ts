import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const QUICK_PROMPTS: Record<string, string> = {
  summarize: `Provide a comprehensive, well-structured summary of this document. Use headers (##), bullet points, and paragraphs. Cover all major topics, sections, and key findings. Include any important data or statistics mentioned.`,
  keypoints: `Extract the most important key points, insights, and findings from this document. Format as a numbered list grouped by theme. Be specific and include any data, statistics, or expert opinions. Each point should be a complete, standalone insight.`,
  studynotes: `Create detailed study notes from this document. Include:
## Main Concepts
[Key ideas explained clearly]
## Definitions & Terms
[Important terminology with definitions]
## Key Facts
[Bullet list of important facts and data]
## Key Takeaways
[5 most important things to remember]
Format for easy review and revision.`,
  quiz: `Generate 8 high-quality multiple-choice quiz questions about this document. For each question provide:
**Q:** [question]
A) [option] B) [option] C) [option] D) [option]
**Answer:** [correct letter + text]
**Why:** [brief explanation citing the document]
Make questions progressively harder from easy recall to deeper comprehension.`,
  explain: `Identify and explain the 5 most complex, technical, or important concepts in this document. For each:
**[Concept Name]**
*Simple explanation:* [explain in plain language]
*Why it matters:* [relevance and implications]
*Key details:* [2-3 important specifics]
Use analogies where helpful to make complex ideas accessible.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { documentText, messages, mode = "chat" } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Smart context management: use up to 40k chars but preserve document structure
    const doc = (documentText ?? "").slice(0, 40000);

    const SYSTEM = `You are an expert AI document assistant. You help users deeply understand documents.

CORE RULES:
- Answer ONLY from the provided document content
- ALWAYS cite where in the document your answer comes from:
  = Section headings: "In the 'Methodology' section..."
  = Position: "In the opening paragraph...", "Toward the end of the document..."
  = Direct quotes: Use quotation marks for exact phrases from the document
- If information is NOT in the document, say exactly: "This information is not covered in the provided document."
- Format all responses with markdown for readability (headers, bullets, bold key terms)
- For page-specific requests (e.g., "summarize page 4"), look for content that appears approximately at that position

HELPFUL COMMANDS (user may ask these):
- "Summarize page N" → Find content at approximately that position and summarize it
- "Explain section [name]" → Find that section and explain it in simple terms
- "What are the main conclusions?" → Find and list all conclusions stated in the document
- "Explain simply" → Re-explain the previous answer in simpler language

DOCUMENT CONTENT:
${doc}`;

    // Quick action modes: non-streaming JSON response
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
      if (!res.ok) {
        return new Response(
          JSON.stringify({ error: `AI error: ${res.status}` }),
          { status: res.status, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      const d = await res.json();
      const result = d.choices?.[0]?.message?.content ?? "";
      return new Response(JSON.stringify({ result }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Chat mode: streaming SSE
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
      return new Response(
        JSON.stringify({ error: `AI error: ${res.status}: ${t}` }),
        { status: res.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(res.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
