import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      short: `You are an expert document analyst. Provide a professional, high-quality, and structured summary of the document.
      
      Your response MUST use the following format:
      ### Overview
      [A 2-3 sentence overview of the document's main topic and purpose]
      
      ### Key Insights
      [Bullet points of the 3-7 most important takeaways and findings]
      
      ### Detailed Explanation
      [A thorough breakdown of the document's content, organized into logical sections]
      
      ### Conclusion
      [The final conclusion or overall significance]`,

      bullets: `You are an expert document analyst. Provide an incredibly detailed bullet-point summary.
      Break the summary into logical categories. Format each category with a heading and use concise but information-dense bullet points (•).`,

      highlights: `You are an expert document analyst. Extract the absolute most critical highlights and executive takeaways.
      Focus on data points, key decisions, and major findings. Use numbered sections with bold titles.`
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[mode] || systemPrompts.short },
          { role: "user", content: `Please summarize the following document professionally and accurately:\n\n${text.slice(0, 50000)}` },
        ],
        temperature: 0.2,
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
    const summary = data.choices?.[0]?.message?.content || "No summary generated.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
