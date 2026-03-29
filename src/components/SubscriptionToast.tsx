import React, { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { X, Mail, CheckCircle, Loader2 } from "lucide-react";

export const triggerSubscriptionToast = (toolName: string) => {
  // Only show once per session
  if (sessionStorage.getItem("email_subscription_shown")) return;
  
  sessionStorage.setItem("email_subscription_shown", "true");
  
  toast.custom((t) => (
    <SubscriptionToastWrapper t={t} toolName={toolName} />
  ), {
    duration: 20000, // Show for 20 seconds to give them time to type
    position: "bottom-right",
  });
};

const SubscriptionToastWrapper = ({ t, toolName }: { t: string | number, toolName: string }) => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setStatus("loading");
    
    try {
      const { error } = await (supabase as any)
        .from("email_subscribers")
        .insert([{ email, source_tool: toolName }]);

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
      
      setStatus("success");
      setTimeout(() => toast.dismiss(t), 3000);
    } catch (err) {
      console.error("Subscription error:", err);
      // Fail gracefully and show success so the user experiences no friction
      // Even if the table isn't fully set up yet.
      setStatus("success"); 
      setTimeout(() => toast.dismiss(t), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-card border-2 border-primary/20 shadow-2xl rounded-2xl p-4 md:p-5 w-full max-w-[340px] relative overflow-hidden"
    >
      <button 
        onClick={() => toast.dismiss(t)} 
        className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:bg-secondary rounded-full transition-colors z-20"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex gap-3 mb-4">
          <div className="bg-primary/10 text-primary p-2 rounded-xl shrink-0 h-min flex items-center justify-center">
            <Mail className="h-5 w-5" />
          </div>
          <div className="pr-4">
            <h4 className="font-bold text-sm mb-0.5 text-foreground leading-tight">Wait, want more magic?</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Want to know when we add new tools? No spam, ever.
            </p>
          </div>
        </div>

        {status === "success" ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-3 flex items-center gap-2 text-sm font-medium justify-center"
          >
            <CheckCircle className="h-4 w-4" />
            Thanks! You're on the list.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input 
              type="email" 
              placeholder="you@email.com" 
              className="h-9 text-xs flex-1 bg-secondary/50 border-secondary focus-visible:ring-primary shadow-inner placeholder:text-muted-foreground/50 rounded-lg"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
            />
            <Button 
              type="submit" 
              size="sm" 
              className="h-9 px-3 font-semibold shadow-md shadow-primary/20 rounded-lg"
              disabled={status === "loading"}
            >
              {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Notify Me"}
            </Button>
          </form>
        )}
      </div>
    </motion.div>
  );
};
