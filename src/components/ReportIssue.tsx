import { useState } from "react";
import { MessageCircleWarning, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ReportIssue = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!text.trim() || !email.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-report", {
        body: {
          email: email.trim(),
          description: text.trim(),
          screenshotCount: screenshots.length,
        },
      });

      if (error) throw error;

      toast({ title: "Report Sent ✅", description: "We've received your issue report. Thank you!" });
      setText("");
      setEmail("");
      setScreenshots([]);
      setOpen(false);
    } catch (err) {
      console.error("Failed to send report:", err);
      toast({ title: "Failed to send", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleScreenshots = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setScreenshots(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = "";
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex items-center justify-center gap-2 pt-6 border-t border-border mt-8">
      <p className="text-sm text-muted-foreground">Something not working?</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="rounded-xl gap-2">
            <MessageCircleWarning className="h-4 w-4" />
            Report an Issue
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Report an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Input
                placeholder="Your email *"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-xl"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">Required so we can follow up</p>
            </div>
            <div>
              <Textarea
                placeholder="Describe the issue — which tool, what went wrong, etc. *"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={4}
                className="rounded-xl resize-none"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">Required — please be as specific as possible</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-3 hover:bg-secondary/50 transition-colors">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Attach screenshots (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleScreenshots}
                />
              </label>
              {screenshots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {screenshots.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-foreground">
                      <span className="max-w-[120px] truncate">{file.name}</span>
                      <button onClick={() => removeScreenshot(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={!text.trim() || !email.trim() || sending} className="w-full rounded-xl">
              {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportIssue;
