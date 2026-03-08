import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ScanSearch, Download, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";

interface SectionResult {
  score: number;
  issues?: string[];
  found?: string[];
  missing?: string[];
  suggestions: string[];
}

interface ATSResult {
  score: number;
  sections: Record<string, SectionResult>;
  overallSuggestions: string[];
}

const AtsChecker = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setResult(null);

    try {
      const text = await extractTextFromPdf(files[0]);
      setProgress(50);

      if (!text.trim()) {
        toast({ title: "Error", description: "Could not extract text from resume.", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-ats-checker", {
        body: { text, jobDescription: jobDescription.trim() || undefined },
      });

      setProgress(90);
      if (error) throw error;
      setResult(data.analysis);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to analyze resume.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const downloadReport = async () => {
    if (!result) return;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const sz = 10;
    const margin = 50;

    let page = doc.addPage();
    let y = page.getHeight() - margin;

    const write = (text: string, isBold = false) => {
      if (y < margin) { page = doc.addPage(); y = page.getHeight() - margin; }
      page.drawText(text.slice(0, 95), { x: margin, y, size: sz, font: isBold ? bold : font, color: rgb(0.1, 0.1, 0.1) });
      y -= sz + 5;
    };

    write("ATS Resume Analysis Report — PDFConvertLab", true);
    y -= 10;
    write(`Overall ATS Score: ${result.score}/100`, true);
    y -= 10;

    Object.entries(result.sections).forEach(([key, section]) => {
      write(`${key.charAt(0).toUpperCase() + key.slice(1)} — Score: ${section.score}/100`, true);
      section.issues?.forEach((issue) => write(`  Issue: ${issue}`));
      section.found?.forEach((item) => write(`  Found: ${item}`));
      section.missing?.forEach((item) => write(`  Missing: ${item}`));
      section.suggestions.forEach((s) => write(`  Suggestion: ${s}`));
      y -= 6;
    });

    write("Overall Suggestions:", true);
    result.overallSuggestions.forEach((s) => write(`  - ${s}`));

    const pdfBytes = await doc.save();
    saveAs(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }), "ats-report.pdf");
  };

  const sectionLabels: Record<string, string> = {
    formatting: "Formatting",
    keywords: "Keywords",
    experience: "Experience",
    skills: "Skills",
    education: "Education",
  };

  return (
    <ToolLayout
      title="Resume ATS Checker"
      description="Check if your resume passes ATS screening — get a score and tips to improve."
      category="ai"
      icon={<ScanSearch className="h-7 w-7" />}
      metaTitle="Free ATS Resume Checker — Score & Optimize Your Resume | PDFConvertLab"
      metaDescription="Check your resume's ATS compatibility score. Get keyword analysis, formatting tips, and actionable suggestions to land more interviews."
      hideHeader
    >
      <div className="space-y-6">
        {/* Instructions first */}
        <div className="rounded-2xl border border-tool-ai/20 bg-tool-ai/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tool-ai">
              <ScanSearch className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">ATS Resume Checker</h1>
              <p className="text-sm text-muted-foreground">Make sure your resume beats the bots</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { step: "1", text: "Upload your resume (PDF)" },
              { step: "2", text: "Optionally paste a job description" },
              { step: "3", text: "Get your ATS score & tips" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tool-ai text-xs font-bold text-primary-foreground">{s.step}</span>
                <span className="text-sm text-foreground">{s.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Most companies use ATS (Applicant Tracking Systems) to filter resumes before a human sees them. This tool checks your resume for formatting, keywords, skills, and structure to help you get past the screening. Your files are private and deleted after processing.
            </p>
          </div>
        </div>

        {/* Upload below instructions */}
        <FileUpload accept=".pdf" multiple={false} onFilesChange={setFiles} files={files} label="Upload your resume (PDF)" />

        {files.length > 0 && !result && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Job Description (optional — for better keyword matching)
              </label>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here to compare keywords…"
                className="rounded-xl"
                rows={4}
              />
            </div>

            {processing && <Progress value={progress} className="h-2" />}

            <Button onClick={handleAnalyze} disabled={processing} size="lg" className="w-full rounded-xl">
              <ScanSearch className="mr-2 h-5 w-5" />
              {processing ? "Analyzing Resume…" : "Check My Resume"}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
              <p className="text-sm font-medium text-muted-foreground">ATS Compatibility Score</p>
              <p className={`font-display text-6xl font-extrabold ${getScoreColor(result.score)}`}>{result.score}</p>
              <p className="text-lg text-muted-foreground">/ 100</p>
            </div>

            {Object.entries(result.sections).map(([key, section]) => (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-foreground">{sectionLabels[key] || key}</h3>
                  <div className="flex items-center gap-2">
                    {getScoreIcon(section.score)}
                    <span className={`font-bold ${getScoreColor(section.score)}`}>{section.score}/100</span>
                  </div>
                </div>

                {section.found && section.found.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Found:</p>
                    <div className="flex flex-wrap gap-1">
                      {section.found.map((item, i) => (
                        <span key={i} className="rounded-lg bg-green-100 px-2 py-0.5 text-xs text-green-700">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {section.missing && section.missing.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Missing:</p>
                    <div className="flex flex-wrap gap-1">
                      {section.missing.map((item, i) => (
                        <span key={i} className="rounded-lg bg-red-100 px-2 py-0.5 text-xs text-red-700">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {section.issues && section.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Issues:</p>
                    <ul className="space-y-1">
                      {section.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Suggestions:</p>
                    <ul className="space-y-1">
                      {section.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {result.overallSuggestions.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-2">
                <h3 className="font-display text-base font-semibold text-foreground">Top Tips to Improve</h3>
                <ul className="space-y-2">
                  {result.overallSuggestions.map((s, i) => (
                    <li key={i} className="text-sm text-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadReport} className="rounded-xl">
                <Download className="mr-2 h-4 w-4" /> Download Report
              </Button>
              <Button variant="ghost" onClick={() => { setResult(null); setFiles([]); setJobDescription(""); }} className="rounded-xl">
                Check Another Resume
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default AtsChecker;
