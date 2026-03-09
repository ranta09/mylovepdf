import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, filename } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ success: false, error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing background removal for:", filename);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Remove the background from this image completely. Keep only the main subject/foreground object with a transparent/white background. Return ONLY the edited image with the background removed.",
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify({
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length,
      contentType: typeof data.choices?.[0]?.message?.content,
      isArray: Array.isArray(data.choices?.[0]?.message?.content),
    }));

    const choice = data.choices?.[0]?.message;
    let resultImage: string | null = null;

    if (choice?.content) {
      if (Array.isArray(choice.content)) {
        console.log("Content parts:", JSON.stringify(choice.content.map((p: any) => ({ type: p.type, hasUrl: !!p.image_url?.url, textLen: p.text?.length }))));
        for (const part of choice.content) {
          // Check for image_url type
          if (part.type === "image_url" && part.image_url?.url) {
            resultImage = part.image_url.url;
            break;
          }
          // Check for inline_data (Gemini native format)
          if (part.type === "image" && part.source?.data) {
            resultImage = `data:${part.source.media_type || "image/png"};base64,${part.source.data}`;
            break;
          }
          // Check inline_data directly
          if (part.inline_data) {
            resultImage = `data:${part.inline_data.mime_type || "image/png"};base64,${part.inline_data.data}`;
            break;
          }
          // Check if text contains base64
          if (part.type === "text" && part.text) {
            const base64Match = part.text.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
            if (base64Match) {
              resultImage = base64Match[0];
              break;
            }
          }
        }
      } else if (typeof choice.content === "string") {
        console.log("Content string length:", choice.content.length, "first 200 chars:", choice.content.substring(0, 200));
        const base64Match = choice.content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
        if (base64Match) {
          resultImage = base64Match[0];
        }
      }
    }

    // Also check for image in the top-level response (some models put it there)
    if (!resultImage && data.choices?.[0]?.message?.image) {
      resultImage = data.choices[0].message.image;
    }

    if (!resultImage) {
      console.error("Full response data:", JSON.stringify(data).substring(0, 2000));
      throw new Error("AI could not process the image for background removal. Please try with a different image.");
    }

    return new Response(
      JSON.stringify({ success: true, image: resultImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error removing background:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove background";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
