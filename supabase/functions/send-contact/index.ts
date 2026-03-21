import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured");
        }

        const { fullName, email, subject, message } = await req.json();

        if (!fullName || !email || !subject || !message) {
            return new Response(
                JSON.stringify({ error: "All fields are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">📩 New Contact Message: MagicDOCX</h2>
        <hr style="border: 1px solid #eee;" />
        <p><strong>From:</strong> ${fullName} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <h3 style="color: #333;">Message</h3>
        <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message}</div>
        <hr style="border: 1px solid #eee; margin-top: 24px;" />
        <p style="color: #888; font-size: 12px;">Sent from MagicDOCX Contact Form</p>
      </div>
    `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "MagicDOCX <onboarding@resend.dev>",
                to: ["support@magicdocx.com"],
                subject: `📩 Contact Message: ${subject}`,
                html: htmlBody,
                reply_to: email,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Resend API error:", data);
            throw new Error(`Resend API error [${res.status}]: ${JSON.stringify(data)}`);
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error sending contact message:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
