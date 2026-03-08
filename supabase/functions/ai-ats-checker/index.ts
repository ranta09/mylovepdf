import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, jobDescription } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const jobContext = jobDescription
      ? `\n\nJOB DESCRIPTION FOR COMPARISON:\n${jobDescription.slice(0, 5000)}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the resume and return a JSON object with this exact structure:

{
  "score": <number 0-100>,
  "sections": {
    "formatting": { "score": <0-100>, "issues": [<string>], "suggestions": [<string>] },
    "keywords": { "score": <0-100>, "found": [<string>], "missing": [<string>], "suggestions": [<string>] },
    "experience": { "score": <0-100>, "issues": [<string>], "suggestions": [<string>] },
    "skills": { "score": <0-100>, "found": [<string>], "missing": [<string>], "suggestions": [<string>] },
    "education": { "score": <0-100>, "issues": [<string>], "suggestions": [<string>] }
  },
  "overallSuggestions": [<string>]
}

Return ONLY the JSON object, no markdown, no code blocks.`,
          },
          { role: "user", content: `Analyze this resume:\n\n${text.slice(0, 20000)}${jobContext}` },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { score: 0, sections: {}, overallSuggestions: ["Failed to parse analysis. Please try again."] };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ats error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
