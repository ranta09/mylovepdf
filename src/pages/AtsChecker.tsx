import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ToolHeader from "@/components/ToolHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import { extractDocument, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import {
  ScanSearch, Download, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ShieldCheck, FileText, Type, X, ChevronDown,
  Sparkles, RotateCcw, Clipboard, ClipboardCheck,
  LinkedinIcon, BriefcaseBusiness, Wand2
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SectionDetail { score: number; found?: string[]; issues?: string[]; suggestions?: string[]; rewrite?: string; technical?: string[]; soft?: string[]; missing?: string[] }
interface ATSResult {
  overallScore: number;
  breakdown: Record<string, number>;
  sections: { contact?: SectionDetail; summary?: SectionDetail; experience?: SectionDetail; skills?: SectionDetail; education?: SectionDetail };
  keywords: { found: string[]; missing: string[]; recommended: { keyword: string; section: string }[] };
  atsWarnings: string[];
  bulletRewrites: { original: string; improved: string }[];
  jobMatch: { score: number; matchedSkills: string[]; missingSkills: string[]; suggestedRoles: { role: string; match: number; missingFor: string[] }[] };
  linkedInSuggestions: { headline: string; about: string };
  grammarIssues: string[];
  lengthAdvice: string;
  overallSuggestions: string[];
}

type InputMode = "file" | "paste";
type ActiveTab = "overview" | "keywords" | "bullets" | "jobmatch" | "linkedin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 55 ? "text-yellow-600" : "text-red-500";
const scoreBg = (s: number) => s >= 80 ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : s >= 55 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800";
const barColor = (s: number) => s >= 80 ? "bg-green-500" : s >= 55 ? "bg-yellow-400" : "bg-red-400";
const scoreIcon = (s: number) => s >= 80 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : s >= 55 ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
const scoreLabel = (s: number) => s >= 80 ? "Excellent" : s >= 65 ? "Good" : s >= 50 ? "Fair" : "Needs Work";

const BREAKDOWN_LABELS: Record<string, string> = {
  atsCompatibility: "ATS Compatibility",
  keywordMatch: "Keyword Match",
  contentQuality: "Content Quality",
  formatting: "Formatting",
  impactStatements: "Impact Statements",
};

const SECTION_LABELS: Record<string, string> = { contact: "Contact Info", summary: "Professional Summary", experience: "Work Experience", skills: "Skills", education: "Education" };

// ─── Component ────────────────────────────────────────────────────────────────

const AtsChecker = () => {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [result, setResult] = useState<ATSResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [appliedBullets, setAppliedBullets] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const { toast } = useToast();

  // ─── Analyze ────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    const hasInput = inputMode === "file" ? files.length > 0 : pastedText.trim().length > 50;
    if (!hasInput) return;
    setProcessing(true); setProgress(10); setResult(null); setStatusText("Extracting text…");
    try {
      let text = "";
      if (inputMode === "file") {
        const res = await extractDocument(files[0], (p, s) => { setProgress(10 + p * 0.4); setStatusText(s); });
        text = res.text;
      } else {
        text = pastedText;
      }
      if (!text.trim()) throw new Error("No text could be extracted from the file.");
      setProgress(55); setStatusText("Running AI analysis…");
      const { data, error } = await supabase.functions.invoke("ai-ats-checker", {
        body: { text, jobDescription: jobDescription.trim() || undefined },
      });
      if (error) throw error;
      setProgress(100); setStatusText("Done!");
      setResult(data.analysis);
      setActiveTab("overview");
      setAppliedBullets(new Set());
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ─── Copy helper ─────────────────────────────────────────────────────────

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000); });
  };

  // ─── PDF Report ──────────────────────────────────────────────────────────

  const downloadReport = () => {
    if (!result) return;
    const doc = new jsPDF();
    let y = 25; const mw = doc.internal.pageSize.getWidth() - 40;
    const nl = (text: string, bold = false, size = 10) => {
      if (y > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); y = 25; }
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, mw); doc.text(lines, 20, y); y += lines.length * (size * 0.5 + 1.5) + 1;
    };
    nl("ATS Resume Analysis Report — MagicDocx", true, 15); y += 4;
    nl(`Overall Score: ${result.overallScore}/100 (${scoreLabel(result.overallScore)})`, true, 12); y += 4;
    nl("Score Breakdown:", true, 11);
    Object.entries(result.breakdown).forEach(([k, v]) => nl(`  ${BREAKDOWN_LABELS[k] ?? k}: ${v}/100`));
    y += 4;
    if (result.atsWarnings?.length) { nl("ATS Warnings:", true, 11); result.atsWarnings.forEach(w => nl(`  ⚠ ${w}`)); y += 4; }
    if (result.keywords?.missing?.length) { nl("Missing Keywords:", true, 11); nl(`  ${result.keywords.missing.join(", ")}`); y += 4; }
    if (result.bulletRewrites?.length) { nl("Bullet Point Improvements:", true, 11); result.bulletRewrites.forEach(b => { nl(`  Before: ${b.original}`); nl(`  After: ${b.improved}`); y += 2; }); }
    if (result.jobMatch?.suggestedRoles?.length) { nl("Suggested Job Roles:", true, 11); result.jobMatch.suggestedRoles.forEach(r => nl(`  ${r.role} — ${r.match}% match`)); y += 4; }
    if (result.overallSuggestions?.length) { nl("Top Suggestions:", true, 11); result.overallSuggestions.forEach(s => nl(`  • ${s}`)); }
    doc.save("ats-resume-report.pdf");
  };

  const reset = () => { setResult(null); setFiles([]); setPastedText(""); setJobDescription(""); };

  // ─── Tabs ────────────────────────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <ScanSearch className="h-3.5 w-3.5" /> },
    { id: "keywords", label: "Keywords", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "bullets", label: "Bullet Fixes", icon: <Wand2 className="h-3.5 w-3.5" /> },
    { id: "jobmatch", label: "Job Match", icon: <BriefcaseBusiness className="h-3.5 w-3.5" /> },
    { id: "linkedin", label: "LinkedIn", icon: <LinkedinIcon className="h-3.5 w-3.5" /> },
  ];

  const canAnalyze = inputMode === "file" ? files.length > 0 : pastedText.trim().length > 50;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ToolLayout
      title="ATS Resume Checker"
      description="Score your resume against ATS systems and get actionable improvements."
      category="ai"
      icon={<ScanSearch className="h-7 w-7" />}
      metaTitle="ATS Resume Checker – Scan Your Resume for ATS Compatibility | MagicDocx"
      metaDescription="Check if your resume passes Applicant Tracking Systems (ATS). Upload your resume to get an ATS score, keyword analysis, and expert resume improvement suggestions."
      toolId="ai-ats"
      hideHeader
    >
      <div className="space-y-8">
        <ToolHeader
          title="ATS Resume Checker"
          description="AI-powered resume analysis — score, optimize, and land more interviews"
          icon={<ScanSearch className="h-5 w-5 text-primary-foreground" />}
          className="bg-tool-ai/5 border-tool-ai/20"
          iconBgClass="bg-tool-ai"
        />

        {/* ── UPLOAD PHASE ─────────────────────────────────────────────── */}
        {!result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Input mode */}
            <div className="flex gap-1.5 rounded-2xl bg-secondary p-1.5">
              {([{ id: "file", label: "Upload Resume", icon: <FileText className="h-3.5 w-3.5" /> }, { id: "paste", label: "Paste Text", icon: <Type className="h-3.5 w-3.5" /> }] as const).map(t => (
                <button key={t.id} onClick={() => setInputMode(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold flex-1 justify-center transition-all ${inputMode === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {inputMode === "file" && (
              <FileUpload
                onFilesChange={setFiles}
                files={files}
                accept=".pdf,.docx,.doc,.txt,.rtf,.odt"
                multiple={false}
                label="Upload resume"
              />
            )}

            {inputMode === "paste" && (
              <textarea value={pastedText} onChange={e => setPastedText(e.target.value)} rows={10}
                placeholder="Paste your resume text here…"
                className="w-full rounded-2xl border border-border bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}

            {/* Job description */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
                Job Description <span className="text-muted-foreground font-normal">(optional — improves keyword matching)</span>
              </label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={4}
                placeholder="Paste the job description here for tailored ATS analysis…"
                className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>

            {processing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-1.5 rounded-full" />
                <p className="text-xs text-center text-muted-foreground">{statusText}</p>
              </div>
            )}

            <Button onClick={handleAnalyze} disabled={!canAnalyze || processing} size="lg"
              className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 gap-2.5">
              {processing ? <><Loader2 className="h-5 w-5 animate-spin" />Analyzing Resume…</> : <><ScanSearch className="h-5 w-5" />Analyze My Resume</>}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Your resume is securely processed and automatically deleted after analysis.
            </p>
          </motion.div>
        )}

        {/* ── RESULTS DASHBOARD ───────────────────────────────────────── */}
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Score Hero */}
            <div className={`rounded-2xl border p-7 text-center space-y-4 ${scoreBg(result.overallScore)}`}>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ATS Compatibility Score</p>
              <p className={`text-8xl font-black leading-none ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
              <p className={`text-xl font-bold ${scoreColor(result.overallScore)}`}>{scoreLabel(result.overallScore)}</p>
              {result.lengthAdvice && <p className="text-xs text-muted-foreground">{result.lengthAdvice}</p>}
            </div>

            {/* Score breakdown bars */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h3 className="text-sm font-bold text-foreground">Score Breakdown</h3>
              {Object.entries(result.breakdown ?? {}).map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{BREAKDOWN_LABELS[k] ?? k}</span>
                    <span className={`font-bold ${scoreColor(v)}`}>{v}/100</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-700 ${barColor(v)}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadReport} className="rounded-xl gap-1.5 text-xs flex-1"><Download className="h-3.5 w-3.5" />PDF Report</Button>
              <Button variant="outline" onClick={reset} className="rounded-xl gap-1.5 text-xs flex-1"><RotateCcw className="h-3.5 w-3.5" />New Analysis</Button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 rounded-2xl bg-secondary p-1.5 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all flex-1 justify-center ${activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ─────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* ATS Warnings */}
                {(result.atsWarnings ?? []).length > 0 && (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 space-y-2">
                    <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" />ATS Warnings</h3>
                    {result.atsWarnings.map((w, i) => <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">⚠ {w}</p>)}
                  </div>
                )}

                {/* Sections */}
                {Object.entries(result.sections ?? {}).map(([key, sec]) => {
                  if (!sec) return null;
                  return (
                    <div key={key} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground">{SECTION_LABELS[key] ?? key}</h3>
                        <div className="flex items-center gap-2">{scoreIcon(sec.score)}<span className={`font-bold text-sm ${scoreColor(sec.score)}`}>{sec.score}/100</span></div>
                      </div>
                      {sec.found && sec.found.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {sec.found.map((f, i) => <span key={i} className="rounded-full bg-green-100 dark:bg-green-950/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">{f}</span>)}
                        </div>
                      )}
                      {(sec.technical || sec.soft) && (
                        <div className="space-y-1.5">
                          {sec.technical && sec.technical.length > 0 && <div className="flex flex-wrap gap-1.5">{sec.technical.map((s, i) => <span key={i} className="rounded-full bg-blue-100 dark:bg-blue-950/30 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">{s}</span>)}</div>}
                          {sec.soft && sec.soft.length > 0 && <div className="flex flex-wrap gap-1.5">{sec.soft.map((s, i) => <span key={i} className="rounded-full bg-purple-100 dark:bg-purple-950/30 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">{s}</span>)}</div>}
                          {sec.missing && sec.missing.length > 0 && <div className="flex flex-wrap gap-1.5">{sec.missing.map((s, i) => <span key={i} className="rounded-full bg-red-100 dark:bg-red-950/30 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">+{s}</span>)}</div>}
                        </div>
                      )}
                      {sec.issues && sec.issues.length > 0 && (
                        <ul className="space-y-1">
                          {sec.issues.map((issue, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />{issue}</li>)}
                        </ul>
                      )}
                      {sec.suggestions && sec.suggestions.length > 0 && (
                        <ul className="space-y-1">
                          {sec.suggestions.map((s, i) => <li key={i} className="flex items-start gap-1.5 text-xs text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />{s}</li>)}
                        </ul>
                      )}
                      {sec.rewrite && (
                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
                          <p className="text-[10px] font-bold uppercase text-primary">AI-Improved Summary</p>
                          <p className="text-xs text-foreground leading-relaxed">{sec.rewrite}</p>
                          <button onClick={() => copyText("summary", sec.rewrite!)} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary">
                            {copied === "summary" ? <><ClipboardCheck className="h-3 w-3 text-green-500" />Copied</> : <><Clipboard className="h-3 w-3" />Copy</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Overall suggestions */}
                {(result.overallSuggestions ?? []).length > 0 && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-2">
                    <h3 className="text-sm font-bold text-foreground">🎯 Top Improvement Tips</h3>
                    {result.overallSuggestions.map((s, i) => (
                      <p key={i} className="text-xs text-foreground flex items-start gap-1.5"><span className="text-primary font-bold mt-0.5">{i + 1}.</span>{s}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Keywords Tab ─────────────────────────────────────────── */}
            {activeTab === "keywords" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-green-700 dark:text-green-400">✓ Keywords Found ({(result.keywords?.found ?? []).length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.keywords?.found ?? []).map((k, i) => <span key={i} className="rounded-full bg-green-100 dark:bg-green-950/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">{k}</span>)}
                      {!(result.keywords?.found ?? []).length && <p className="text-xs text-muted-foreground">No keywords detected.</p>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-red-600 dark:text-red-400">✗ Missing Keywords ({(result.keywords?.missing ?? []).length})</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(result.keywords?.missing ?? []).map((k, i) => <span key={i} className="rounded-full bg-red-100 dark:bg-red-950/30 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400">{k}</span>)}
                      {!(result.keywords?.missing ?? []).length && <p className="text-xs text-muted-foreground">No missing keywords — great!</p>}
                    </div>
                  </div>
                </div>

                {(result.keywords?.recommended ?? []).length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground">📍 Where to Add Missing Keywords</h3>
                    <div className="space-y-2">
                      {result.keywords.recommended.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-secondary/30 px-4 py-2.5">
                          <span className="text-sm font-medium text-foreground">{r.keyword}</span>
                          <span className="text-xs rounded-full bg-primary/10 px-2.5 py-0.5 text-primary font-medium">Add to {r.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(result.grammarIssues ?? []).length > 0 && (
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-5 space-y-2">
                    <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">✏️ Grammar & Clarity Issues</h3>
                    {result.grammarIssues.map((g, i) => <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">• {g}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* ── Bullet Rewrites Tab ──────────────────────────────────── */}
            {activeTab === "bullets" && (
              <div className="space-y-4">
                {(result.bulletRewrites ?? []).length === 0 && (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground text-sm">No bullet rewrites available. Your bullets look strong!</div>
                )}
                {(result.bulletRewrites ?? []).map((b, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Before</p>
                      <p className="text-sm text-muted-foreground italic">"{b.original}"</p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-green-600">After (AI-Improved)</p>
                      <p className="text-sm font-medium text-foreground">"{b.improved}"</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyText(`bullet-${i}`, b.improved)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${appliedBullets.has(i) ? "border-green-300 bg-green-50 text-green-700" : "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground"}`}>
                        {copied === `bullet-${i}` ? <><ClipboardCheck className="h-3.5 w-3.5 text-green-500" />Copied!</> : <><Clipboard className="h-3.5 w-3.5" />Copy Improved</>}
                      </button>
                      <button onClick={() => setAppliedBullets(prev => { const s = new Set(prev); s.add(i); return s; })}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${appliedBullets.has(i) ? "border-green-300 bg-green-50 text-green-700" : "border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />{appliedBullets.has(i) ? "Applied ✓" : "Mark Applied"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Job Match Tab ─────────────────────────────────────────── */}
            {activeTab === "jobmatch" && (
              <div className="space-y-5">
                {result.jobMatch && (
                  <>
                    <div className={`rounded-2xl border p-6 text-center ${scoreBg(result.jobMatch.score)}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Job Description Match</p>
                      <p className={`text-5xl font-black ${scoreColor(result.jobMatch.score)}`}>{result.jobMatch.score}%</p>
                      <p className={`text-sm font-bold mt-1 ${scoreColor(result.jobMatch.score)}`}>{scoreLabel(result.jobMatch.score)}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.jobMatch.matchedSkills?.length > 0 && (
                        <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-card p-5 space-y-3">
                          <h3 className="text-sm font-bold text-green-700 dark:text-green-400">✓ Matched Skills</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {result.jobMatch.matchedSkills.map((s, i) => <span key={i} className="rounded-full bg-green-100 dark:bg-green-950/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400">{s}</span>)}
                          </div>
                        </div>
                      )}
                      {result.jobMatch.missingSkills?.length > 0 && (
                        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-card p-5 space-y-3">
                          <h3 className="text-sm font-bold text-red-600 dark:text-red-400">✗ Skills to Add</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {result.jobMatch.missingSkills.map((s, i) => <span key={i} className="rounded-full bg-red-100 dark:bg-red-950/30 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400">{s}</span>)}
                          </div>
                        </div>
                      )}
                    </div>

                    {result.jobMatch.suggestedRoles?.length > 0 && (
                      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
                        <h3 className="text-sm font-bold text-foreground">🎯 Suggested Job Roles for You</h3>
                        {result.jobMatch.suggestedRoles.map((r, i) => (
                          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold text-foreground">{r.role}</p>
                              <span className={`text-sm font-bold ${scoreColor(r.match)}`}>{r.match}% match</span>
                            </div>
                            {r.missingFor?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {r.missingFor.map((s, j) => <span key={j} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">Need: {s}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!result.jobMatch && (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                    Paste a job description when analyzing to get job match insights.
                  </div>
                )}
              </div>
            )}

            {/* ── LinkedIn Tab ─────────────────────────────────────────── */}
            {activeTab === "linkedin" && (
              <div className="space-y-4">
                {result.linkedInSuggestions?.headline && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><LinkedinIcon className="h-4 w-4 text-blue-600" />Optimized LinkedIn Headline</h3>
                    <p className="text-sm font-medium text-foreground bg-secondary/50 rounded-xl px-4 py-3">{result.linkedInSuggestions.headline}</p>
                    <button onClick={() => copyText("headline", result.linkedInSuggestions.headline)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                      {copied === "headline" ? <><ClipboardCheck className="h-3 w-3 text-green-500" />Copied</> : <><Clipboard className="h-3 w-3" />Copy headline</>}
                    </button>
                  </div>
                )}
                {result.linkedInSuggestions?.about && (
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5"><LinkedinIcon className="h-4 w-4 text-blue-600" />Optimized About Section</h3>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-secondary/50 rounded-xl px-4 py-3">{result.linkedInSuggestions.about}</p>
                    <button onClick={() => copyText("about", result.linkedInSuggestions.about)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                      {copied === "about" ? <><ClipboardCheck className="h-3 w-3 text-green-500" />Copied</> : <><Clipboard className="h-3 w-3" />Copy about section</>}
                    </button>
                  </div>
                )}
                {!result.linkedInSuggestions?.headline && !result.linkedInSuggestions?.about && (
                  <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">LinkedIn optimization suggestions will appear here after analysis.</div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── SEO Content ─────────────────────────────────────────────────── */}
        <div className="mt-16 space-y-10 text-sm text-muted-foreground border-t border-border pt-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold text-foreground">ATS Resume Checker</h1>
            <p className="text-base max-w-2xl mx-auto">The most powerful free ATS resume checker online. Analyze your resume against real ATS algorithms, get keyword insights, bullet point improvements, and LinkedIn optimization — all in one tool.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">How to check your resume for ATS</h2>
              <ol className="space-y-2 list-decimal list-inside text-sm">
                <li>Upload your resume (PDF, DOCX, TXT) or paste the text</li>
                <li>Optionally paste the job description for tailored matching</li>
                <li>Click <strong>Analyze My Resume</strong></li>
                <li>Review your ATS score across 5 dimensions</li>
                <li>Apply bullet rewrites and keyword suggestions</li>
                <li>Download the full PDF improvement report</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">What the ATS score measures</h2>
              <div className="space-y-2">
                {Object.entries(BREAKDOWN_LABELS).map(([, label]) => (
                  <div key={label} className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />{label}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Features of MagicDocx ATS Resume Checker</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <ScanSearch className="h-4 w-4" />, t: "5-Dimension Scoring", d: "ATS, keyword match, content, formatting, and impact" },
                { icon: <Wand2 className="h-4 w-4" />, t: "AI Bullet Rewrites", d: "Before/after improved bullet points with strong action verbs" },
                { icon: <BriefcaseBusiness className="h-4 w-4" />, t: "Job Match Analysis", d: "Match % + missing skills + suggested job roles" },
                { icon: <LinkedinIcon className="h-4 w-4" />, t: "LinkedIn Optimizer", d: "AI-optimized headline and About section" },
                { icon: <Download className="h-4 w-4" />, t: "PDF Report", d: "Full downloadable report with all insights and suggestions" },
                { icon: <ShieldCheck className="h-4 w-4" />, t: "100% Private", d: "Resume deleted automatically after analysis" },
              ].map(({ icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <div className="text-primary">{icon}</div>
                  <p className="font-semibold text-foreground text-xs">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
            {[
              { q: "What is an ATS resume checker?", a: "An ATS (Applicant Tracking System) resume checker analyzes your resume the same way employer software does — checking for keywords, formatting issues, section completeness, and relevance to a job description to predict how likely your resume is to pass automated screening." },
              { q: "How do ATS systems scan resumes?", a: "ATS systems parse resume text and look for relevant keywords, job titles, skills, and qualifications. They struggle with tables, columns, images, and unusual fonts. MagicDocx simulates this process and tells you exactly what to fix." },
              { q: "How can I improve my resume for ATS?", a: "Use a single-column format, include keywords from the job description, start bullet points with strong action verbs, quantify achievements, and ensure all standard sections (Contact, Summary, Experience, Skills, Education) are clearly labeled." },
              { q: "Is this tool free?", a: "Yes — MagicDocx ATS Resume Checker is completely free to use. No account or credit card required. Upload your resume and get results in seconds." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">
                  {q} <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
};

export default AtsChecker;
