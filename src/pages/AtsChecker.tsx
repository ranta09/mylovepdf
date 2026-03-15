import { useState, useEffect } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ToolHeader from "@/components/ToolHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import { extractDocument, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import {
  ScanSearch, Download, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ShieldCheck, FileText, Type, X, ChevronDown,
  Sparkles, RotateCcw, Clipboard, ClipboardCheck,
  LinkedinIcon, BriefcaseBusiness, Wand2, Layout, Info,
  BrainCircuit, MessageSquare, Search, ListChecks
} from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ToolSeoSection from "@/components/ToolSeoSection";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import DocumentInfoCard from "@/components/DocumentInfoCard";

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
  actionPlan?: string[];
  grammarIssues: string[];
  lengthAdvice: string;
  overallSuggestions: string[];
}

type InputMode = "file" | "paste";
type ActiveTab = "overview" | "keywords" | "bullets" | "jobmatch" | "linkedin" | "actionplan";

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
        if (!text.trim()) throw new Error("No text could be extracted from the file. If this is a scanned PDF, try converting it to DOCX first.");
      } else {
        text = pastedText;
        if (!text.trim()) throw new Error("Please paste your resume text before analyzing.");
      }
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
    { id: "actionplan", label: "Action Plan", icon: <ListChecks className="h-3.5 w-3.5" /> },
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
      hideHeader={!!result}
    >
      <div className="space-y-8">

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
              <>
                <FileUpload
                  onFilesChange={setFiles}
                  files={files}
                  accept=".pdf,.docx,.doc,.txt,.rtf,.odt"
                  multiple={false}
                  label="Upload resume"
                />
                {files.length > 0 && (
                  <DocumentInfoCard
                    name={files[0].name}
                    sizeBytes={files[0].size}
                  />
                )}
              </>
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

        {/* ── IMMERSIVE WORKSPACE ───────────────────────────────────────── */}
        {result && (
          <div className="fixed top-16 inset-x-0 bottom-0 z-40 bg-background flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-row overflow-hidden relative">

              {/* LEFT SIDE: Score Profile & Breakdown */}
              <div className="w-80 border-r border-border bg-secondary/5 flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-background/50 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-black uppercase tracking-widest">Analysis Profile</span>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Hero Score */}
                    <div className={`rounded-3xl border p-6 text-center shadow-sm ${scoreBg(result.overallScore)}`}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">ATS Grade</p>
                      <p className={`text-6xl font-black leading-none ${scoreColor(result.overallScore)}`}>{result.overallScore}</p>
                      <p className={`text-xs font-bold mt-2 uppercase ${scoreColor(result.overallScore)}`}>{scoreLabel(result.overallScore)}</p>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Layout className="h-3.5 w-3.5" />
                        Score Vectors
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(result.breakdown ?? {}).map(([k, v]) => (
                          <div key={k} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">{BREAKDOWN_LABELS[k] ?? k}</span>
                              <span className={`text-[10px] font-black ${scoreColor(v)}`}>{v}/100</span>
                            </div>
                            <Progress value={v} className={`h-1 rounded-full ${barColor(v)}/20 [&>div]:${barColor(v)}`} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    {result.lengthAdvice && (
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-1">
                          <Info className="h-3.5 w-3.5" />
                          Format Tip
                        </p>
                        <p className="text-[9px] text-muted-foreground font-bold leading-relaxed uppercase">{result.lengthAdvice}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* CENTER AREA: Analysis Deep Dive */}
              <div className="flex-1 bg-secondary/10 flex flex-col items-center p-8 overflow-hidden relative">
                <div className="w-full max-w-4xl h-full flex flex-col bg-background shadow-2xl rounded-2xl border border-border overflow-hidden">

                  {/* Internal Navbar / Tabs */}
                  <div className="flex items-center justify-between p-2 border-b border-border bg-secondary/5">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="w-full">
                      <TabsList className="bg-transparent h-10 gap-1">
                        {TABS.map(t => (
                          <TabsTrigger key={t.id} value={t.id} className="rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm px-4">
                            {t.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-8">
                      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

                        {/* ── Overview Tab ── */}
                        {activeTab === "overview" && (
                          <div className="space-y-6">
                            {(result.atsWarnings ?? []).length > 0 && (
                              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-5 space-y-3">
                                <h3 className="text-xs font-black text-yellow-800 dark:text-yellow-300 flex items-center gap-2 uppercase tracking-widest">
                                  <AlertTriangle className="h-4 w-4" /> Hard Failures
                                </h3>
                                {result.atsWarnings.map((w, i) => <p key={i} className="text-[11px] font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-tight leading-tight flex items-start gap-2"><span>⚠</span> {w}</p>)}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {Object.entries(result.sections ?? {}).map(([key, sec]) => {
                                if (!sec) return null;
                                return (
                                  <div key={key} className="rounded-2xl border border-border bg-background p-5 shadow-sm space-y-4 hover:shadow-md transition-all group">
                                    <div className="flex items-center justify-between border-b border-border pb-3">
                                      <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">{SECTION_LABELS[key] ?? key}</h3>
                                      <Badge variant="outline" className={`h-5 text-[10px] font-black uppercase border-none ${scoreColor(sec.score)} ${scoreBg(sec.score)}`}>{sec.score}/100</Badge>
                                    </div>

                                    {sec.rewrite ? (
                                      <div className="space-y-2">
                                        <p className="text-[9px] font-black uppercase text-primary">Neural Improvement</p>
                                        <div className="p-3 bg-primary/5 rounded-xl text-xs leading-relaxed font-medium italic relative group/copy">
                                          "{sec.rewrite}"
                                          <Button variant="ghost" size="icon" onClick={() => copyText(key, sec.rewrite!)} className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/copy:opacity-100 transition-opacity">
                                            {copied === key ? <ClipboardCheck className="h-3 w-3 text-green-500" /> : <Clipboard className="h-3 w-3" />}
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1.5">
                                          {(sec.found ?? []).map((f, i) => <Badge key={i} className="bg-green-500/10 text-green-600 text-[10px] border-none font-bold uppercase">{f}</Badge>)}
                                          {(sec.missing ?? []).map((m, i) => <Badge key={i} className="bg-red-500/10 text-red-600 text-[10px] border-none font-bold uppercase">+{m}</Badge>)}
                                        </div>
                                        <ul className="space-y-1.5">
                                          {(sec.suggestions ?? []).map((s, i) => (
                                            <li key={i} className="flex gap-2 text-[10px] font-bold text-muted-foreground uppercase leading-tight italic">
                                              <span className="text-primary">•</span> {s}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ── Keywords Tab ── */}
                        {activeTab === "keywords" && (
                          <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" /> Detected ({(result.keywords?.found ?? []).length})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {(result.keywords?.found ?? []).map((k, i) => (
                                    <Badge key={i} className="px-3 py-1 bg-green-500/5 text-green-600 border border-green-500/20 text-[10px] font-black uppercase tracking-wider">{k}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                                  <XCircle className="h-4 w-4" /> Missing ({(result.keywords?.missing ?? []).length})
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                  {(result.keywords?.missing ?? []).map((k, i) => (
                                    <Badge key={i} className="px-3 py-1 bg-red-500/5 text-red-600 border border-red-500/20 text-[10px] font-black uppercase tracking-wider">{k}</Badge>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {(result.keywords?.recommended ?? []).length > 0 && (
                              <div className="space-y-4 pt-6 border-t border-border">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Strategic Distribution</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {result.keywords.recommended.map((r, i) => (
                                    <div key={i} className="p-4 bg-secondary/30 rounded-2xl border border-border flex flex-col gap-1">
                                      <span className="text-xs font-black text-foreground uppercase tracking-tight">{r.keyword}</span>
                                      <span className="text-[9px] font-black text-primary uppercase">Target: {r.section}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Bullets Tab ── */}
                        {activeTab === "bullets" && (
                          <div className="space-y-4 max-w-3xl mx-auto">
                            {(result.bulletRewrites ?? []).map((b, i) => (
                              <div key={i} className="rounded-2xl border border-border bg-background p-6 space-y-6 hover:border-primary/50 transition-colors shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -z-0" />
                                <div className="relative z-10 space-y-4">
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500 italic block">Original Statement</span>
                                    <p className="text-xs text-muted-foreground line-through decoration-red-500/30">"{b.original}"</p>
                                  </div>
                                  <div className="h-px bg-border/50" />
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                                      <Sparkles className="h-3 w-3" /> Enhanced Impact Statement
                                    </span>
                                    <p className="text-sm font-bold text-foreground">"{b.improved}"</p>
                                  </div>
                                  <div className="flex gap-3 pt-2">
                                    <Button variant="outline" size="sm" onClick={() => copyText(`bullet-${i}`, b.improved)} className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 bg-background border-border">
                                      {copied === `bullet-${i}` ? <><ClipboardCheck className="h-3.5 w-3.5 text-green-500" /> Copied</> : <><Clipboard className="h-3.5 w-3.5" /> Copy Improved</>}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => setAppliedBullets(prev => { const s = new Set(prev); s.add(i); return s; })} className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 ${appliedBullets.has(i) ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-background border-border"}`}>
                                      <CheckCircle2 className="h-3.5 w-3.5" /> {appliedBullets.has(i) ? "Applied" : "Mark Applied"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Job Match Tab ── */}
                        {activeTab === "jobmatch" && (
                          <div className="space-y-8">
                            {result.jobMatch && (
                              <div className="space-y-8">
                                <div className={`rounded-3xl border p-8 flex flex-col items-center justify-center text-center ${scoreBg(result.jobMatch.score)}`}>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Tailoring Match Depth</p>
                                  <p className={`text-7xl font-black ${scoreColor(result.jobMatch.score)}`}>{result.jobMatch.score}%</p>
                                  <p className={`text-xs font-black uppercase mt-2 ${scoreColor(result.jobMatch.score)}`}>{scoreLabel(result.jobMatch.score)} Alignment</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                  <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-green-600">Matched Intelligence</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                      {result.jobMatch.matchedSkills.map((s, i) => <Badge key={i} className="rounded-lg bg-green-500/10 text-green-600 border-none font-bold text-xs">{s}</Badge>)}
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-red-600">Gap Analysis</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                      {result.jobMatch.missingSkills.map((s, i) => <Badge key={i} className="rounded-lg bg-red-500/10 text-red-600 border-none font-bold text-xs">{s}</Badge>)}
                                    </div>
                                  </div>
                                </div>

                                {result.jobMatch.suggestedRoles && (
                                  <div className="space-y-4 pt-8 border-t border-border">
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Suggested Career Vectors</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {result.jobMatch.suggestedRoles.map((r, i) => (
                                        <div key={i} className="p-5 border border-border rounded-2xl bg-secondary/10 flex flex-col gap-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-black uppercase text-foreground">{r.role}</span>
                                            <span className={`text-xs font-black ${scoreColor(r.match)}`}>{r.match}%</span>
                                          </div>
                                          <Progress value={r.match} className="h-1" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── LinkedIn Tab ── */}
                        {activeTab === "linkedin" && (
                          <div className="space-y-8 max-w-3xl mx-auto">
                            <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-8 space-y-6 relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-4">
                                <LinkedinIcon className="h-10 w-10 text-blue-600/20" />
                              </div>
                              <div className="space-y-4 relative z-10">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-600">Optimized Narrative</h3>
                                <div className="space-y-6">
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Profile Headline</p>
                                    <p className="text-sm font-bold text-foreground leading-relaxed">"{result.linkedInSuggestions.headline}"</p>
                                    <Button variant="ghost" size="sm" onClick={() => copyText("headline", result.linkedInSuggestions.headline)} className="h-7 text-[10px] font-black uppercase px-0 hover:bg-transparent text-blue-600">
                                      {copied === "headline" ? "Copied" : "Copy Headline"}
                                    </Button>
                                  </div>
                                  <Separator className="bg-blue-500/10" />
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">About Section</p>
                                    <p className="text-xs text-foreground leading-relaxed font-medium whitespace-pre-wrap italic">
                                      {result.linkedInSuggestions.about}
                                    </p>
                                    <Button variant="ghost" size="sm" onClick={() => copyText("about", result.linkedInSuggestions.about)} className="h-7 text-[10px] font-black uppercase px-0 hover:bg-transparent text-blue-600">
                                      {copied === "about" ? "Copied" : "Copy Professional About"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Action Plan Tab ── */}
                        {activeTab === "actionplan" && (
                          <div className="space-y-4 max-w-3xl mx-auto">
                            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
                              <h3 className="text-[11px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                                <ListChecks className="h-3.5 w-3.5" />
                                Your Prioritized Action Plan
                              </h3>
                              {(result.actionPlan && result.actionPlan.length > 0) ? (
                                <div className="space-y-3">
                                  {result.actionPlan.map((step, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-all">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                        {i + 1}
                                      </div>
                                      <p className="text-sm font-medium text-foreground leading-relaxed mt-1">{step.replace(/^Priority \d+:\s*/i, "")}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {(result.overallSuggestions ?? []).slice(0, 5).map((s, i) => (
                                    <div key={i} className="flex gap-4 p-4 bg-background rounded-xl border border-border hover:border-primary/30 transition-all">
                                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                                        {i + 1}
                                      </div>
                                      <p className="text-sm font-medium text-foreground leading-relaxed mt-1">{s}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* RIGHT SIDE: Strategic Recommendations */}
              <div className="w-96 border-l border-border bg-background flex flex-col shrink-0">
                <div className="p-4 border-b border-border bg-secondary/5 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">Strategic Hub</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={downloadReport} className="h-8 w-8 rounded-lg">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/5 hover:text-destructive px-3">
                      Discard
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Top Tips */}
                    <div className="space-y-4">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Actionable Intel
                      </h3>
                      <div className="space-y-3">
                        {(result.overallSuggestions ?? []).map((s, i) => (
                          <div key={i} className="p-4 bg-secondary/30 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                            <div className="flex gap-3">
                              <span className="text-[10px] font-black text-primary/40 leading-none pt-0.5">{(i + 1).toString().padStart(2, '0')}</span>
                              <p className="text-[10px] font-bold text-foreground uppercase tracking-tight leading-tight">{s}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Grammar Issues */}
                    {(result.grammarIssues ?? []).length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-border">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                          <Type className="h-3.5 w-3.5" />
                          Refinement List
                        </h3>
                        <div className="space-y-2">
                          {result.grammarIssues.map((g, i) => (
                            <p key={i} className="text-[10px] font-bold text-muted-foreground uppercase leading-tight flex items-start gap-2">
                              <span className="text-amber-500">•</span> {g}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Download className="h-3.5 w-3.5" />
                        Final Output
                      </p>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase leading-relaxed mb-4">Export the comprehensive intelligence report as a secure PDF document.</p>
                      <Button onClick={downloadReport} className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        Secure PDF Export
                      </Button>
                    </div>
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border bg-secondary/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Protocol Version: 5.2.0</span>
                    <span className="text-[9px] font-black text-primary uppercase">Neural Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SEO Content ─────────────────────────────────────────────────── */}
        <ToolSeoSection
          toolName="ATS Resume Checker"
          category="ai"
          intro="The most powerful free ATS resume checker online. Analyze your resume against real ATS algorithms, get keyword insights, bullet point improvements, and LinkedIn optimization — all in one tool."
          features={[
            { icon: ScanSearch, title: "5-Dimension Scoring", desc: "ATS, keyword match, content, formatting, and impact" },
            { icon: Wand2, title: "AI Bullet Rewrites", desc: "Before/after improved bullet points with strong action verbs" },
            { icon: BriefcaseBusiness, title: "Job Match Analysis", desc: "Match % + missing skills + suggested job roles" },
            { icon: LinkedinIcon, title: "LinkedIn Optimizer", desc: "AI-optimized headline and About section" },
          ]}
          steps={[
            "Upload your resume (PDF, DOCX, TXT) or paste the text",
            "Optionally paste the job description for tailored matching",
            "Click Analyze My Resume",
            "Apply improvements based on AI feedback"
          ]}
          formats={["PDF", "DOCX", "TXT", "RTF", "ODT"]}
          relatedTools={[
            { name: "AI Document Summarizer", path: "/summarizer", icon: Wand2 },
            { name: "AI Quiz Generator", path: "/quiz-generator", icon: BrainCircuit },
            { name: "Chat With PDF", path: "/chat-with-pdf", icon: MessageSquare },
            { name: "PDF to Word", path: "/pdf-to-word", icon: FileText },
          ]}
          faqs={[
            { q: "What is an ATS resume checker?", a: "An ATS (Applicant Tracking System) resume checker analyzes your resume the same way employer software does — checking for keywords, formatting issues, section completeness, and relevance to a job description to predict how likely your resume is to pass automated screening." },
            { q: "How do ATS systems scan resumes?", a: "ATS systems parse resume text and look for relevant keywords, job titles, skills, and qualifications. They struggle with tables, columns, images, and unusual fonts. MagicDocx simulates this process and tells you exactly what to fix." },
            { q: "How can I improve my resume for ATS?", a: "Use a single-column format, include keywords from the job description, start bullet points with strong action verbs, quantify achievements, and ensure all standard sections (Contact, Summary, Experience, Skills, Education) are clearly labeled." },
            { q: "Is this tool free?", a: "Yes — MagicDocx ATS Resume Checker is completely free to use. No account or credit card required. Upload your resume and get results in seconds." },
          ]}
        />
      </div>
    </ToolLayout>
  );
};

export default AtsChecker;
