import { useState } from "react";
import { Languages, Copy, Download, Loader2, Info, ShieldCheck } from "lucide-react";
import ToolHeader from "@/components/ToolHeader";
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
        <ToolHeader
          title="Translate PDF"
          description="AI-powered document translation to any language"
          icon={<Languages className="h-5 w-5 text-primary-foreground" />}
        />

        {/* Upload */}
        <FileUpload accept=".pdf" files={files} onFilesChange={setFiles} label="Select a PDF to translate" />

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
