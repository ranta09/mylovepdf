import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanBase64(input: string): { base64: string; mime: string } {
  if (!input) return { base64: "", mime: "image/png" };

  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(/^data:(image\/[^;]+);base64,(.*)$/s);
  const mime = dataUrlMatch?.[1] ?? "image/png";
  const rawBase64 = (dataUrlMatch?.[2] ?? trimmed).replace(/\s/g, "");

  // basic validation
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawBase64)) {
    throw new Error("Invalid base64 image data");
  }

  return { base64: rawBase64, mime };
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, filename } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ success: false, error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { base64, mime } = cleanBase64(image);
    const bytes = base64ToUint8Array(base64);

    const prompt =
      "Remove the background completely and keep only the main subject. Output a transparent PNG (no background), clean edges.";

    const form = new FormData();
    form.append("model", "google/gemini-3-pro-image-preview");
    form.append("prompt", prompt);
    form.append("response_format", "b64_json");
    form.append(
      "image",
      new Blob([bytes], { type: mime }),
      filename || "input.png",
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: "AI usage limit reached. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.error("AI gateway images/edits error:", response.status, errorText?.slice(0, 2000));
      return new Response(JSON.stringify({ success: false, error: `AI processing failed (${response.status}).` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    const first = data?.data?.[0];
    const b64 = first?.b64_json as string | undefined;
    const url = first?.url as string | undefined;

    if (b64) {
      return new Response(JSON.stringify({ success: true, image: `data:image/png;base64,${b64}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url) {
      // UI can render URLs too
      return new Response(JSON.stringify({ success: true, image: url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error("Unexpected images/edits response:", JSON.stringify(data).slice(0, 2000));
    throw new Error("AI did not return an edited image");
  } catch (error) {
    console.error("Error removing background:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove background";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
