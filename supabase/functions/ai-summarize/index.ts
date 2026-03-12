import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  // ── Legacy modes (kept for compatibility) ──────────────────────────────
  short: `You are an expert document analyst. Produce a structured summary with: ### Overview, ### Key Insights, ### Detailed Explanation, ### Conclusion.`,
  bullets: `You are an expert document analyst. Produce a categorised bullet-point summary with bold section headers.`,
  highlights: `You are an expert document analyst. Extract the most critical highlights and executive takeaways. Use numbered sections with bold titles.`,

  // ── New comprehensive modes ────────────────────────────────────────────
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
**Key Findings:** [numbered list]
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
All technical terms, jargon, or domain-specific words. Format: **Term** — Definition.

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

### 📝 Study Guide
A structured self-study guide: what to focus on, what's most testable.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, mode = "overview", question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Chat / Q&A mode
    const systemPrompt = mode === "chat"
      ? `You are a helpful AI assistant. The user has provided a document and wants to ask a question about it. Answer accurately and concisely using only information from the document. If the answer is not in the document, say so clearly.`
      : PROMPTS[mode] ?? PROMPTS.overview;

    const userMessage = mode === "chat"
      ? `Document content:\n\n${text.slice(0, 50000)}\n\n---\nUser question: ${question}`
      : `Summarize the following document:\n\n${text.slice(0, 50000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: mode === "chat" ? 0.3 : 0.2,
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
    const summary = data.choices?.[0]?.message?.content ?? "No response generated.";

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
