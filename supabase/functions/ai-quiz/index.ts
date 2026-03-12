import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { text, questionTypes = ["mcq"], difficulty = "medium", count = 10 } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const diffMap: Record<string, string> = {
      easy: "Straightforward recall and basic understanding.",
      medium: "Comprehension and application of concepts.",
      hard: "Deep understanding, analysis, critical thinking.",
      exam: "Real exam conditions — precise, nuanced, plausible distractors.",
    };
    const typeMap: Record<string, string> = {
      mcq: "Multiple choice, 4 options (A/B/C/D), one correct.",
      truefalse: 'True/False. options=["True","False"].',
      fillinblank: "Fill-in-the-blank with _____ in question. options=[].",
      shortanswer: "Short answer, 1-2 sentences. options=[].",
      matching: "Matching scenario, 4 options, answer explains matches.",
      scenario: "Real-world scenario, 4 MCQ options.",
      conceptual: "Conceptual/principle-based, 4 MCQ options.",
    };

    const types = (questionTypes as string[]).filter(t => typeMap[t]);
    const sys = `Expert quiz generator. Generate exactly ${count} questions.
DIFFICULTY: ${difficulty} — ${diffMap[difficulty] || diffMap.medium}
TYPES (distribute evenly): ${types.map(t => typeMap[t]).join(" | ")}
Rules: no trivial/repetitive questions, plausible distractors, educational explanations.

Return ONLY valid JSON (no markdown, no fences):
{"questions":[{"type":"mcq","question":"...","options":["A...","B...","C...","D..."],"answer":"A...","explanation":"...","difficulty":"${difficulty}"}],"flashcards":[{"front":"term","back":"definition"}],"keyConcepts":["concept"]}
Generate ${count} questions, 10 flashcards, 5-8 keyConcepts.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Generate quiz from:\n\n${text.slice(0, 40000)}` },
        ],
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${res.status}: ${t}` }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const d = await res.json();
    let raw = d.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: any = {};
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; } catch { parsed = {}; }
    }

    return new Response(
      JSON.stringify({ questions: parsed.questions ?? [], flashcards: parsed.flashcards ?? [], keyConcepts: parsed.keyConcepts ?? [] }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
