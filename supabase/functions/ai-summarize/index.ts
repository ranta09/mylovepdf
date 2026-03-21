import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Length multipliers for prompt instructions
const LENGTH_GUIDANCE: Record<string, string> = {
  short: "Be concise. Aim for 150–250 words per section. Prioritise the most important items only.",
  medium: "Be thorough but focused. Aim for 250–450 words per section. Cover all major points.",
  long: "Be comprehensive and detailed. Aim for 450–700 words per section. Include supporting details, examples, and nuances.",
};

const PROMPTS: Record<string, string> = {
  // ── Synthesis prompt (used when combining chunks) ───────────────────────────
  short: `You are an expert document analyst. Produce a structured summary with: ### Overview, ### Key Insights, ### Detailed Explanation, ### Conclusion.`,
  bullets: `You are an expert document analyst. Produce a categorised bullet-point summary with bold section headers.`,
  highlights: `You are an expert document analyst. Extract the most critical highlights and executive takeaways. Use numbered sections with bold titles.`,

  // ── Core summary modes ──────────────────────────────────────────────────────
  overview: `You are an expert document analyst. Deliver a thorough structured analysis using these headers:

### 📋 Overview
A 3–5 sentence synthesis of the document's purpose, audience, and core argument.

### 🔑 Key Concepts
The 5–10 most important ideas, theories, or findings. Explain each briefly.

### 📊 Main Findings
Critical data, results, or conclusions supported by the document.

### 💡 Relevance & Impact
Why this document matters; its implications for the reader.

### 🏁 Conclusion
The document's final outcome, recommendation, or call to action.`,

  bullets_full: `You are an expert document analyst. Produce an exhaustive bullet-point summary.
- Group bullets under bold thematic headers
- Each bullet = one distinct, standalone fact or idea
- Use sub-bullets for supporting details
- Include at least 15 bullet points`,

  insights: `You are an expert knowledge extractor. From the document, extract:
### 🔍 Key Insights
The most original, surprising, or important ideas.

### 📈 Data & Statistics
Any numbers, percentages, dates, or measurements mentioned.

### 👤 People & Organizations
Names of individuals, companies, institutions mentioned.

### 📌 Key Dates & Events
Important timelines or events.

### 🌟 Best Quotes
3–5 exact verbatim sentences that best capture the document's message.`,

  executive: `You are a senior business analyst writing an executive briefing.
Format:
**EXECUTIVE SUMMARY**
**Purpose:** [one sentence]
**Context:** [background paragraph]
**Key Findings:** [numbered list of 5–8 findings]
**Recommendations:** [numbered list]
**Risk Factors:** [if applicable]
**Conclusion:** [one paragraph]
Write in formal, board-room language. Be precise and data-driven.`,

  study: `You are an expert study coach. Convert this document into comprehensive study notes.
Format:
## 📚 Study Notes

### Topic Overview
[Short intro paragraph]

### Core Concepts to Know
[Table or numbered list: Term | Definition]

### Key Facts & Details
[Bullet list of all important facts]

### Important Connections
[How ideas relate to each other]

### What You Should Remember
[5 most critical takeaways]

Use simple, clear language suitable for a student.`,

  actions: `You are an expert document analyzer focused on tasks and decisions.
Extract and list:
### ✅ Action Items
All tasks, to-dos, or recommended actions stated or implied in the document.

### 🎯 Decisions Made
Any decisions, conclusions, or choices documented.

### ⚠️ Open Issues
Unresolved problems, risks, or questions raised.

### 📅 Deadlines & Milestones
Any dates associated with tasks or deliverables.`,

  tldr: `You are a master of concise writing.
Write a TLDR (Too Long Didn't Read) for this document.
Format:
**TLDR:** [1 sentence – the absolute essence of the document]

**In 5 bullet points:**
• [point 1]
• [point 2]
• [point 3]
• [point 4]
• [point 5]`,

  glossary: `You are a knowledge organizer. From the document, extract:
### 📖 Glossary
All technical terms, jargon, or domain-specific words. Format: **Term**: Definition.

### 🏢 Organizations
All companies, institutions, or groups mentioned.

### 👤 People
All individuals mentioned with their role/context.

### 📊 Key Statistics
All numbers, metrics, or data points.

### 🌍 Locations
Any places mentioned and their relevance.`,

  quiz: `You are an expert educator. Based on this document, create:
### 🃏 Flashcards
10 flashcards in format: **Q:** [question] → **A:** [answer]

### ❓ Quiz Questions
10 multiple-choice questions:
**Q:** [question]
A) [option]  B) [option]  C) [option]  D) [option]
**Answer:** [correct option]
**Explanation:** [brief explanation]

### 📝 Study Guide
A structured self-study guide: what to focus on, what's most testable.`,
};

// Enhanced synthesis prompt for multi-chunk large documents
function getSynthesisPrompt(mode: string, length: string): string {
  const lengthGuide = LENGTH_GUIDANCE[length] ?? LENGTH_GUIDANCE.medium;
  const targetPrompt = PROMPTS[mode] ?? PROMPTS.overview;
  return `${targetPrompt}\n\nIMPORTANT: You are synthesizing summaries of different sections of the same document. Merge them into one coherent, unified output: eliminate redundancy, resolve any conflicts, and produce a single polished analysis. ${lengthGuide}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode = "overview", question, length = "medium" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lengthGuide = LENGTH_GUIDANCE[length] ?? LENGTH_GUIDANCE.medium;

    // ── Document topic detection mode ────────────────────────────────────────
    if (mode === "detect") {
      const sample = String(text ?? "").slice(0, 2000);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Analyze the document excerpt and respond with ONLY valid JSON (no markdown fences):
{"title":"<inferred document title or topic>","topic":"<main subject area in 3-5 words>","language":"<detected language name>","type":"<document type: report|article|resume|manual|academic|legal|other>"}`,
            },
            { role: "user", content: sample },
          ],
          temperature: 0,
        }),
      });
      if (!res.ok) throw new Error(`AI error: ${res.status}`);
      const d = await res.json();
      let raw = d.choices?.[0]?.message?.content ?? "{}";
      raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(raw); } catch { /* ignore */ }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Chat / Q&A mode ─────────────────────────────────────────────────────
    if (mode === "chat") {
      const systemPrompt = `You are a precise AI document assistant. Answer the user's question using ONLY the information found in the provided document.

RULES:
- Always cite where in the document your answer comes from (e.g., "In the introduction...", "According to section 2...", "As stated in paragraph 3...")
- If the answer is not in the document, say clearly: "This information is not available in the provided document."
- Format your answer with markdown (headers, bullets, bold) for readability
- Be thorough but concise`;

      const userMessage = `Document content:\n\n${text.slice(0, 50000)}\n\n---\nUser question: ${question}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content ?? "No response generated.";
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard summarization modes ─────────────────────────────────────────
    const MAX_CHUNK = 45000;

    if (text.length <= MAX_CHUNK) {
      const systemPrompt = (PROMPTS[mode] ?? PROMPTS.overview) + `\n\n${lengthGuide}`;
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analyze and summarize the following document:\n\n${text}` },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        return new Response(JSON.stringify({ error: `AI error: ${response.status}` }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const summary = data.choices?.[0]?.message?.content ?? "No response generated.";
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Chunked processing for large documents ────────────────────────────────
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += MAX_CHUNK) chunks.push(text.slice(i, i + MAX_CHUNK));

    // Parallel partial summarization of all chunks
    const partialPromises = chunks.map((chunk, idx) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are an expert document analyst. This is section ${idx + 1} of ${chunks.length} of a large document. Extract the key points, findings, and important content from this section. Be thorough. Output structured markdown.`,
            },
            { role: "user", content: `Document section ${idx + 1}/${chunks.length}:\n\n${chunk}` },
          ],
          temperature: 0.15,
        }),
      }).then(async (r) => {
        if (!r.ok) return `[Section ${idx + 1}: processing error]`;
        const d = await r.json();
        return d.choices?.[0]?.message?.content ?? "";
      }).catch(() => `[Section ${idx + 1}: connection error]`)
    );

    const partials = await Promise.all(partialPromises);

    // Final synthesis pass
    const combinedPartials = partials
      .map((p, i) => `## Document Section ${i + 1}\n\n${p}`)
      .join("\n\n---\n\n");

    const synthesisPrompt = getSynthesisPrompt(mode, length);
    const finalRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: synthesisPrompt },
          {
            role: "user",
            content: `Below are summaries of ${chunks.length} sections of a large document. Synthesize them into one final, cohesive analysis:\n\n${combinedPartials}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!finalRes.ok) {
      const t = await finalRes.text();
      return new Response(JSON.stringify({ error: `AI synthesis error: ${finalRes.status}` }), {
        status: finalRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalData = await finalRes.json();
    const summary = finalData.choices?.[0]?.message?.content ?? "No response generated.";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("summarize error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
