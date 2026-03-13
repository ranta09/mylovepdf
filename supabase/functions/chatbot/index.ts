import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are MagicDOCX Assistant, a helpful chatbot embedded on the MagicDOCX website (mylovepdf.lovable.app). Your job is to help users find the right tool, explain how tools work, and guide them through the site.

## About MagicDOCX
MagicDOCX is a free online PDF toolkit with 34 powerful tools. All processing is done locally in the browser — files are never uploaded to servers, ensuring 100% privacy. No sign-up required. 100% free with no watermarks or limits.

## Available Tools

### AI-Powered Tools
- **PDF Summarizer** (/pdf-summarizer) — AI-powered notes and summaries from any PDF
- **Quiz Generator** (/quiz-generator) — Generate quizzes from study material (supports PDF, DOC, TXT)
- **Chat with PDF** (/chat-with-pdf) — Ask questions and chat with your document
- **ATS Resume Checker** (/ats-checker) — Get your resume ATS compatibility score and improvement tips
- **Translate PDF** (/translate-pdf) — AI-powered document translation to 50+ languages

### Convert Tools
- PDF to Word (/pdf-to-word), Word to PDF (/word-to-pdf)
- PDF to JPG (/pdf-to-jpg), JPG to PDF (/jpg-to-pdf)
- PDF to PowerPoint (/pdf-to-ppt), PowerPoint to PDF (/ppt-to-pdf)
- PDF to Excel (/pdf-to-excel), Excel to PDF (/excel-to-pdf)
- HTML to PDF (/html-to-pdf), PDF to PDF/A (/pdf-to-pdfa)

### Edit & Organize Tools
- Edit PDF (/edit-pdf) — Add text, shapes, and annotations
- Organize Pages (/organize-pdf), Rotate PDF (/rotate-pdf)
- Merge PDF (/merge-pdf), Split PDF (/split-pdf)
- Delete Pages (/delete-pages), Extract Pages (/extract-pages)
- Page Numbers (/page-numbers), Add Watermark (/add-watermark)
- Repair PDF (/repair-pdf), Flatten PDF (/flatten-pdf)
- Sign PDF (/sign-pdf), Crop PDF (/crop-pdf)
- Redact PDF (/redact-pdf), OCR PDF (/ocr-pdf)
- Compare PDF (/compare-pdf)

### Optimize Tools
- Compress PDF (/compress-pdf) — Reduce file size without losing quality
- Protect PDF (/protect-pdf) — Add password protection
- Unlock PDF (/unlock-pdf) — Remove password from PDF

## How It Works
1. Choose a tool from the homepage or ask me
2. Upload your file (drag and drop)
3. Download the result instantly — everything stays in your browser!

## Privacy & Security
- 100% Browser-based: Files are processed locally and never touch our servers.
- No data storage: Your privacy is guaranteed.

## Your Behavior
- Be friendly, concise, and helpful.
- When recommending a tool, always include the tool name and its path so the user can navigate there.
- Format tool links as: **[Tool Name](/path)** so they're clickable.
- If a user asks for tools we removed (like Flashcard Generator, Notes Generator, Citation Generator), politely explain that we have streamlined our toolset to focus on core PDF and essential AI tools like the **[PDF Summarizer](/pdf-summarizer)** and **[Quiz Generator](/quiz-generator)**.
- Use markdown formatting for clarity.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
