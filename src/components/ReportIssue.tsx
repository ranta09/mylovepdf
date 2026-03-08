import { useState } from "react";
import { MessageCircleWarning, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const ReportIssue = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!text.trim() || !email.trim()) return;
    toast({ title: "Feedback Sent", description: "Thank you! We'll look into it." });
    setText("");
    setEmail("");
    setScreenshot(null);
    setOpen(false);
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
            <Textarea
              placeholder="Describe the issue — which tool, what went wrong, etc."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              className="rounded-xl resize-none"
            />
            <div>
              <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border p-3 hover:bg-secondary/50 transition-colors">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {screenshot ? screenshot.name : "Attach a screenshot (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setScreenshot(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <Button onClick={handleSubmit} disabled={!text.trim() || !email.trim()} className="w-full rounded-xl">
              Submit Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportIssue;
