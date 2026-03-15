import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { text, jobDescription } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const jobCtx = jobDescription
      ? `\n\nJOB DESCRIPTION PROVIDED:\n${String(jobDescription).slice(0, 6000)}\nUse this to tailor keyword matching and role suggestions.`
      : "\n\nNo job description provided — use general industry best practices for scoring.";

    const sys = `You are a world-class ATS resume analyst and career coach with 15+ years of experience in hiring and recruitment. Analyze the resume comprehensively and return ONLY valid JSON (no markdown, no fences) matching this exact schema:

{
  "overallScore": <0-100>,
  "breakdown": {
    "atsCompatibility": <0-100>,
    "keywordMatch": <0-100>,
    "contentQuality": <0-100>,
    "formatting": <0-100>,
    "impactStatements": <0-100>
  },
  "sections": {
    "contact": { "score": <0-100>, "found": ["email","phone","LinkedIn",...], "issues": [], "suggestions": [] },
    "summary": { "score": <0-100>, "issues": [], "suggestions": [], "rewrite": "<improved professional summary — 3-4 sentences using strong keywords and quantified value proposition>" },
    "experience": { "score": <0-100>, "issues": [], "suggestions": [] },
    "skills": { "score": <0-100>, "technical": ["skill1",...], "soft": ["skill1",...], "missing": ["recommended skill1",...] },
    "education": { "score": <0-100>, "issues": [], "suggestions": [] }
  },
  "keywords": {
    "found": ["keyword1",...],
    "missing": ["keyword1",...],
    "recommended": [{"keyword":"...","section":"Experience|Skills|Summary"}]
  },
  "atsWarnings": ["warning1",...],
  "bulletRewrites": [
    {"original": "Responsible for managing...", "improved": "Managed X initiative, achieving Y% improvement in Z metric"}
  ],
  "jobMatch": {
    "score": <0-100>,
    "matchedSkills": ["skill1",...],
    "missingSkills": ["skill1",...],
    "suggestedRoles": [{"role":"Data Analyst","match":<0-100>,"missingFor":["skill1",...]}]
  },
  "linkedInSuggestions": {
    "headline": "<compelling LinkedIn headline — 120 chars max, includes role + value prop + key skills>",
    "about": "<optimized About section — 3 paragraphs: who you are, what you do, what you're looking for>"
  },
  "actionPlan": [
    "Priority 1: [Most critical action to take immediately]",
    "Priority 2: [Second most important improvement]",
    "Priority 3: [Third action]",
    "Priority 4: [Fourth action]",
    "Priority 5: [Fifth action]"
  ],
  "grammarIssues": ["issue1",...],
  "lengthAdvice": "<specific advice on resume length and density>",
  "overallSuggestions": ["suggestion1",...]
}

PRECISION SCORING RULES:
- atsCompatibility (0-100): Deduct for tables(-20), multi-column layout(-15), headers/footers content(-10), images/graphics(-15), special Unicode chars(-5), non-standard section names(-10), text boxes(-15)
- keywordMatch (0-100): Based on job description keyword frequency + semantic match; if no JD, score common industry keywords for their apparent field
- contentQuality (0-100): Presence of measurable achievements(+30), strong action verbs at bullet start(+20), professional vocabulary(+15), no personal pronouns(+10), no filler phrases(+10), adequate detail(+15)
- formatting (0-100): Clear labeled sections(+25), consistent date formats(+15), logical reverse-chronological order(+20), proper spacing(+15), ATS-parseable structure(+25)
- impactStatements (0-100): Each quantified result with number/%(+10 each, max 60), outcome-focused bullets(+20), leadership/ownership language(+20)

BULLET REWRITE RULES: Find 5-8 of the weakest bullets (vague, responsibility-focused, no metrics). Rewrite each with: strong action verb + specific task + measurable result.

Provide 3 suggestedRoles that match the candidate's profile. Return ONLY the JSON — no other text.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: `Analyze this resume comprehensively:${jobCtx}\n\nRESUME TEXT:\n${String(text).slice(0, 30000)}`,
          },
        ],
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(
        JSON.stringify({ error: `AI error: ${res.status}: ${t}` }),
        { status: res.status, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const d = await res.json();
    let raw = d.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analysis: any;
    try {
      analysis = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { analysis = m ? JSON.parse(m[0]) : {}; } catch { analysis = {}; }
    }

    // Ensure actionPlan is present
    if (!analysis.actionPlan) {
      analysis.actionPlan = analysis.overallSuggestions?.slice(0, 5).map(
        (s: string, i: number) => `Priority ${i + 1}: ${s}`
      ) ?? [];
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
