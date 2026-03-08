import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const config = {
    dropboxAppKey: Deno.env.get("DROPBOX_APP_KEY") || "",
    googleApiKey: Deno.env.get("GOOGLE_PICKER_API_KEY") || "",
    googleClientId: Deno.env.get("GOOGLE_PICKER_CLIENT_ID") || "",
    onedriveClientId: Deno.env.get("ONEDRIVE_CLIENT_ID") || "",
  };

  return new Response(JSON.stringify(config), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
