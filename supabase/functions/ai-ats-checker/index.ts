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

    const jobCtx = jobDescription ? `\n\nJOB DESCRIPTION:\n${String(jobDescription).slice(0, 6000)}` : "";

    const sys = `You are a world-class ATS resume analyst and career coach. Analyze the resume comprehensively and return ONLY valid JSON (no markdown, no fences) matching this exact schema:

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
    "contact": { "score": <0-100>, "found": ["email","phone",...], "issues": [], "suggestions": [] },
    "summary": { "score": <0-100>, "issues": [], "suggestions": [], "rewrite": "<improved summary text>" },
    "experience": { "score": <0-100>, "issues": [], "suggestions": [] },
    "skills": { "score": <0-100>, "technical": ["skill1",...], "soft": ["skill1",...], "missing": ["skill1",...] },
    "education": { "score": <0-100>, "issues": [], "suggestions": [] }
  },
  "keywords": {
    "found": ["keyword1",...],
    "missing": ["keyword1",...],
    "recommended": [{"keyword":"...","section":"Experience|Skills|Summary"}]
  },
  "atsWarnings": ["warning1",...],
  "bulletRewrites": [
    {"original": "Responsible for managing...", "improved": "Managed X that achieved Y by Z%"}
  ],
  "jobMatch": {
    "score": <0-100>,
    "matchedSkills": ["skill1",...],
    "missingSkills": ["skill1",...],
    "suggestedRoles": [{"role":"Data Analyst","match":<0-100>,"missingFor":["skill1",...]}]
  },
  "linkedInSuggestions": {
    "headline": "<optimized headline>",
    "about": "<optimized about section>"
  },
  "grammarIssues": ["issue1",...],
  "lengthAdvice": "<advice on resume length>",
  "overallSuggestions": ["suggestion1",...]
}

SCORING RULES:
- atsCompatibility: Check for tables, columns, headers/footers, images, non-standard fonts, special characters
- keywordMatch: Based on job description keyword frequency and semantic similarity (if no JD, score general industry keywords)
- contentQuality: Presence of measurable achievements, strong action verbs, professional language
- formatting: Clean sections, consistent formatting, ATS-parseable structure
- impactStatements: Quantified results (numbers, %, $), leadership words, outcome-focused bullets

Provide 3-5 bulletRewrites from the weakest bullets found. Provide 3 suggestedRoles. Return ONLY the JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Analyze this resume:${jobCtx}\n\nRESUME:\n${String(text).slice(0, 30000)}` },
        ],
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${res.status}: ${t}` }), { status: res.status, headers: { ...cors, "Content-Type": "application/json" } });
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

    return new Response(JSON.stringify({ analysis }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
