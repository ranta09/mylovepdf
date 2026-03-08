import { useState } from "react";
import { Languages, Copy, Download, Loader2, Info } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import ReactMarkdown from "react-markdown";

const languages = [
  "Spanish", "French", "German", "Italian", "Portuguese", "Chinese", "Japanese",
  "Korean", "Arabic", "Hindi", "Russian", "Dutch", "Swedish", "Turkish",
  "Polish", "Thai", "Vietnamese", "Indonesian", "Malay", "Bengali",
];

const TranslatePdf = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [targetLang, setTargetLang] = useState("Spanish");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [translation, setTranslation] = useState("");

  const translate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setTranslation("");
    try {
      const text = await extractTextFromPdf(files[0]);
      if (!text.trim()) { toast.error("Could not extract text from PDF"); setProcessing(false); return; }
      setProgress(40);

      const { data, error } = await supabase.functions.invoke("ai-translate", {
        body: { text, targetLanguage: targetLang },
      });
      setProgress(90);

      if (error) throw error;
      if (data?.error) { toast.error(data.error); setProcessing(false); return; }

      setTranslation(data.translation);
      setProgress(100);
      toast.success("Translation complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to translate document");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translation);
    toast.success("Copied to clipboard!");
  };

  const downloadAsText = () => {
    const blob = new Blob([translation], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `translated-${targetLang.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ToolLayout title="Translate PDF" description="AI-powered document translation to any language" category="ai" icon={<Languages className="h-7 w-7" />}
      metaTitle="Translate PDF — AI Document Translation Free" metaDescription="Translate PDF documents to any language using AI. Free online tool." toolId="ai-translate" hideHeader>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-tool-ai/20 bg-tool-ai/5 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tool-ai">
              <Languages className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Translate PDF</h1>
              <p className="text-sm text-muted-foreground">AI-powered document translation to any language</p>
              <div className="mt-1 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" /><span className="text-xs text-muted-foreground/70">Translate any PDF into 20+ languages using AI. Works with research papers, contracts, articles, and more. Your files are private and deleted after processing.</span></div>
            </div>
          </div>
        </div>

        {/* Upload */}
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to translate" />

        {/* Steps below upload */}
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { step: "1", text: "Upload your PDF document" },
            { step: "2", text: "Select the target language" },
            { step: "3", text: "Get your translated text" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-ai text-xs font-bold text-primary-foreground">{s.step}</span>
              <span className="text-sm text-foreground">{s.text}</span>
            </div>
          ))}
        </div>
        {files.length > 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Target Language</label>
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {processing && <Progress value={progress} />}
            <Button size="lg" onClick={translate} disabled={processing} className="w-full rounded-xl">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Translating…</> : <><Languages className="mr-2 h-5 w-5" />Translate PDF</>}
            </Button>
            {processing && <p className="text-xs text-center text-muted-foreground">Estimated time: ~15-30 seconds</p>}
          </div>
        )}

        {translation && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Translation ({targetLang})</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="rounded-xl gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button variant="outline" size="sm" onClick={downloadAsText} className="rounded-xl gap-1">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 max-h-96 overflow-y-auto prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{translation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default TranslatePdf;
