import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { text, questionTypes = ["mcq"], difficulty = "medium", count = 10, focusTopic = "" } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const diffMap: Record<string, string> = {
      easy: "Straightforward recall, basic definitions, and simple comprehension. Questions should be answerable by anyone who read the document once.",
      medium: "Comprehension and application of concepts. Requires understanding relationships between ideas, not just memorization.",
      hard: "Deep analysis, inference, and critical evaluation. Questions should challenge the reader to synthesize information and draw conclusions.",
      exam: "Real exam conditions: precise wording, plausible distractors that require careful reading, nuanced distinctions between close answers.",
    };

    const typeMap: Record<string, string> = {
      mcq: 'Multiple choice, 4 options (A/B/C/D), one correct. options=["A. ...", "B. ...", "C. ...", "D. ..."]',
      truefalse: 'True/False. options=["True","False"]. answer must be "True" or "False".',
      fillinblank: "Fill-in-the-blank with _____ in question text. options=[]. answer=the missing word/phrase.",
      shortanswer: "Short answer requiring 1-2 sentences. options=[]. answer=a model answer.",
      matching: "Matching scenario, 4 options, answer explains how items match.",
      scenario: "Real-world scenario-based, 4 MCQ options. Presents a situation derived from the document.",
      conceptual: "Tests understanding of principles/concepts from the document, 4 MCQ options.",
    };

    const types = (questionTypes as string[]).filter((t) => typeMap[t]);
    const focusCtx = focusTopic ? `\nFOCUS on the topic: "${focusTopic}": prioritize questions about this area.` : "";

    const sys = `You are a world-class educational quiz designer. Generate exactly ${count} high-quality quiz questions from the provided document.

DIFFICULTY: ${difficulty}: ${diffMap[difficulty] || diffMap.medium}
QUESTION TYPES (distribute evenly): ${types.map((t) => typeMap[t]).join(" | ")}
${focusCtx}

QUALITY RULES:
- No trivial, repetitive, or obvious questions
- Distractors must be plausible: wrong but not absurd
- Each question must be clearly answerable from the document content
- Explanations must reference WHY the answer is correct
- sectionRef must identify WHERE in the document the question comes from (use section headings, paragraph context, or "beginning/middle/end of document")
- Vary question formats and topics across the document

Also generate:
- 10 flashcards of key terms/concepts from the document
- 5–8 key concepts (important ideas, patterns, or principles)
- The document's main topic (1 short phrase)

Return ONLY valid JSON matching this exact schema (no markdown, no fences):
{
  "topic": "<main document topic in 3-5 words>",
  "questions": [
    {
      "type": "mcq",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A. ...",
      "explanation": "This is correct because... [reference to document content]",
      "difficulty": "${difficulty}",
      "sectionRef": "From the Introduction / Section 2 / beginning of document"
    }
  ],
  "flashcards": [{"front": "Term or concept", "back": "Clear definition or explanation"}],
  "keyConcepts": ["concept 1", "concept 2"]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Generate quiz from this document:\n\n${text.slice(0, 40000)}` },
        ],
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${res.status}: ${t}` }), {
        status: res.status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const d = await res.json();
    let raw = d.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Robust JSON parsing with fallback
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON object
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = {}; }
      }
    }

    // Ensure all questions have sectionRef field
    const questions = (parsed.questions ?? []).map((q: any) => ({
      ...q,
      sectionRef: q.sectionRef ?? "Document content",
    }));

    return new Response(
      JSON.stringify({
        topic: parsed.topic ?? "",
        questions,
        flashcards: parsed.flashcards ?? [],
        keyConcepts: parsed.keyConcepts ?? [],
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
