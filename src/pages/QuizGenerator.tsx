import { useState, useEffect, useRef } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import ToolHeader from "@/components/ToolHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { saveAs } from "file-saver";
import { motion, AnimatePresence } from "framer-motion";
import { extractDocument, extractUrl, SUPPORTED_EXTENSIONS } from "@/lib/docExtract";
import {
  BrainCircuit, FileText, Link2, Youtube, Type, Loader2, ShieldCheck,
  CheckCircle2, XCircle, Download, RotateCcw, ChevronLeft, ChevronRight,
  Timer, Star, Zap, BookOpen, GraduationCap, X, Plus, ChevronDown
} from "lucide-react";
import FileUpload from "@/components/FileUpload";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "setup" | "generating" | "quiz" | "exam" | "flashcards" | "results";
type InputMode = "file" | "url" | "youtube" | "text";
type Difficulty = "easy" | "medium" | "hard" | "exam";
type QuestionType = "mcq" | "truefalse" | "fillinblank" | "shortanswer" | "matching" | "scenario" | "conceptual";

interface Question {
  type: QuestionType;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: string;
}

interface Flashcard {
  front: string;
  back: string;
}

// ─── YouTube transcript helper ────────────────────────────────────────────────

async function fetchYouTubeTranscript(url: string): Promise<string> {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (!match) throw new Error("Invalid YouTube URL. Could not extract video ID.");
  const videoId = match[1];

  // Try YouTube's public timedtext endpoint via proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.youtube.com/api/timedtext?lang=en&v=${videoId}&fmt=vtt`)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error("Could not fetch YouTube transcript.");
  const json = await res.json();
  const vtt: string = json.contents ?? "";
  if (!vtt || vtt.length < 50) throw new Error("No transcript available for this video. Try a video with English captions enabled.");
  // Strip VTT tags and timestamps
  const text = vtt
    .replace(/WEBVTT[\s\S]*?\n\n/m, "")
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> [\s\S]*?\n/gm, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\d+\n/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < 100) throw new Error("Transcript was too short. This video may not have captions.");
  return text;
}

// ─── Component ────────────────────────────────────────────────────────────────

const QuizGenerator = () => {
  const [phase, setPhase] = useState<Phase>("setup");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [extractedText, setExtractedText] = useState("");

  // Settings
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [count, setCount] = useState(10);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(["mcq"]);

  // Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);

  // Progress
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  // Quiz (review) mode
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  // Exam mode
  const [examIdx, setExamIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streak, setStreak] = useState(0);

  // Flashcard mode
  const [cardIdx, setCardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  const { toast } = useToast();

  // ─── Timer ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); submitExam(examAnswers); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ─── Generate ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setPhase("generating"); setProgress(5); setStatusText("Preparing content…");
    try {
      let text = "";
      if (inputMode === "file") {
        const parts: string[] = [];
        for (let i = 0; i < files.length; i++) {
          setStatusText(`Extracting ${files[i].name} (${i + 1}/${files.length})…`);
          setProgress(5 + (i / files.length) * 40);
          const res = await extractDocument(files[i], (p, s) => { setStatusText(s); });
          parts.push(res.text);
        }
        text = parts.join("\n\n---\n\n");
      } else if (inputMode === "url") {
        setStatusText("Fetching URL content…"); setProgress(20);
        const res = await extractUrl(urlInput.trim());
        text = res.text;
      } else if (inputMode === "youtube") {
        setStatusText("Extracting YouTube transcript…"); setProgress(20);
        text = await fetchYouTubeTranscript(urlInput.trim());
      } else {
        text = textInput;
      }

      setExtractedText(text);
      if (!text.trim()) throw new Error("No text could be extracted.");

      setStatusText("Generating quiz with AI…"); setProgress(55);
      const { data, error } = await supabase.functions.invoke("ai-quiz", {
        body: { text, questionTypes: selectedTypes, difficulty, count },
      });
      if (error) throw error;

      setProgress(95);
      setQuestions(data.questions ?? []);
      setFlashcards(data.flashcards ?? []);
      setKeyConcepts(data.keyConcepts ?? []);
      setSelected({}); setRevealed({});
      setProgress(100);
      setPhase("quiz");
      toast({ title: "Quiz ready!", description: `${data.questions?.length ?? 0} questions generated.` });
    } catch (e: any) {
      setPhase("setup");
      toast({ title: "Error", description: e.message ?? "Failed to generate quiz.", variant: "destructive" });
    }
  };

  // ─── Exam mode ─────────────────────────────────────────────────────────

  const startExam = () => {
    setExamAnswers({}); setExamIdx(0); setStreak(0);
    setTimeLeft(questions.length * 90); // 1.5 min per question
    setPhase("exam");
  };

  const submitExam = (answers: Record<number, string>) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(answers);
    setPhase("results");
  };

  const selectExamAnswer = (opt: string) => {
    setExamAnswers(prev => ({ ...prev, [examIdx]: opt }));
  };

  // ─── Score helpers ──────────────────────────────────────────────────────

  const getScore = (answers: Record<number, string>) => {
    return questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  };

  // ─── Download PDF report ────────────────────────────────────────────────

  const downloadReport = () => {
    try {
      const doc = new jsPDF();
      const mw = doc.internal.pageSize.getWidth() - 40;
      let y = 25;
      const nl = (text: string, bold = false, size = 10) => {
        if (y > doc.internal.pageSize.getHeight() - 25) { doc.addPage(); y = 25; }
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, mw);
        doc.text(lines, 20, y);
        y += lines.length * (size * 0.5 + 1) + 2;
      };
      nl("Quiz Report — MagicDocx", true, 16); y += 4;
      nl(`Difficulty: ${difficulty} | Questions: ${questions.length} | Score: ${getScore(selected)}/${questions.length}`, false, 10); y += 6;
      questions.forEach((q, i) => {
        nl(`Q${i + 1}. ${q.question}`, true, 11);
        q.options.forEach(o => nl(`  ${o}`, false, 9));
        nl(`✓ Answer: ${q.answer}`, true, 9);
        if (q.explanation) nl(`  ${q.explanation}`, false, 9);
        y += 4;
      });
      doc.save("quiz-report.pdf");
    } catch { toast({ title: "Export failed", variant: "destructive" }); }
  };

  const downloadCSV = () => {
    const rows = ["Question,Type,Answer,Explanation", ...questions.map(q => `"${q.question.replace(/"/g, '""')}","${q.type}","${q.answer.replace(/"/g, '""')}","${q.explanation.replace(/"/g, '""')}"`)]
    saveAs(new Blob([rows.join("\n")], { type: "text/csv" }), "quiz.csv");
  };

  // ─── Question type toggle ───────────────────────────────────────────────

  const toggleType = (t: QuestionType) => {
    setSelectedTypes(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
  };

  // ─── UI helpers ─────────────────────────────────────────────────────────

  const canGenerate = (inputMode === "file" && files.length > 0) || ((inputMode === "url" || inputMode === "youtube") && urlInput.trim().length > 10) || (inputMode === "text" && textInput.trim().length > 50);

  const score = getScore(selected);
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const scoreColor = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";
  const scoreBg = pct >= 80 ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : pct >= 50 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800" : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800";

  const inputTabs: { id: InputMode; label: string; icon: React.ReactNode }[] = [
    { id: "file", label: "Upload Files", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "url", label: "Website URL", icon: <Link2 className="h-3.5 w-3.5" /> },
    { id: "youtube", label: "YouTube", icon: <Youtube className="h-3.5 w-3.5" /> },
    { id: "text", label: "Paste Text", icon: <Type className="h-3.5 w-3.5" /> },
  ];

  const questionTypesList: { id: QuestionType; label: string }[] = [
    { id: "mcq", label: "Multiple Choice" },
    { id: "truefalse", label: "True / False" },
    { id: "fillinblank", label: "Fill in Blank" },
    { id: "shortanswer", label: "Short Answer" },
    { id: "scenario", label: "Scenario" },
    { id: "conceptual", label: "Conceptual" },
  ];

  return (
    <ToolLayout
      title="AI Quiz Generator"
      description="Create quizzes from PDFs, docs, videos, and websites with AI."
      category="ai"
      icon={<BrainCircuit className="h-7 w-7" />}
      metaTitle="AI Quiz Generator – Create Quizzes from PDFs, Notes & Videos | MagicDocx"
      metaDescription="Generate quizzes instantly using AI. Upload PDFs, notes, websites, or YouTube videos and create MCQ tests, flashcards, and practice exams online for free."
      toolId="ai-quiz"
      hideHeader={phase !== "setup"}
    >
      <div className="space-y-8">

        {/* ── SETUP PHASE ──────────────────────────────────────────────── */}
        {phase === "setup" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Input tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-secondary p-1.5">
              {inputTabs.map(t => (
                <button key={t.id} onClick={() => setInputMode(t.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all flex-1 justify-center ${inputMode === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
                  {t.icon} <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Input content */}
            {inputMode === "file" && (
              <div className="space-y-3">
                <FileUpload
                  onFilesChange={setFiles}
                  files={files}
                  accept={SUPPORTED_EXTENSIONS}
                  label="Upload study material"
                />
              </div>
            )}

            {(inputMode === "url" || inputMode === "youtube") && (
              <div className="space-y-2">
                <Input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  placeholder={inputMode === "youtube" ? "https://youtube.com/watch?v=..." : "https://example.com/article"}
                  className="rounded-xl text-sm font-mono" />
                {inputMode === "youtube" && <p className="text-xs text-muted-foreground">Video must have English captions enabled.</p>}
              </div>
            )}

            {inputMode === "text" && (
              <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder="Paste your study notes, article text, or any content here…"
                className="w-full min-h-[160px] rounded-2xl border border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}

            {/* Settings */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5 shadow-sm">
              <h3 className="font-bold text-sm text-foreground">Quiz Settings</h3>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                <div className="flex flex-wrap gap-2">
                  {(["easy", "medium", "hard", "exam"] as Difficulty[]).map(d => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all ${difficulty === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {d === "exam" ? "📋 Exam" : d === "hard" ? "🔥 Hard" : d === "medium" ? "⚡ Medium" : "✅ Easy"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Number of Questions</label>
                  <span className="text-sm font-bold text-primary">{count}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 20, 50].map(n => (
                    <button key={n} onClick={() => setCount(n)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${count === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <Slider value={[count]} onValueChange={v => setCount(v[0])} min={5} max={50} step={5} />
              </div>

              {/* Question types */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Question Types</label>
                <div className="flex flex-wrap gap-2">
                  {questionTypesList.map(t => (
                    <button key={t.id} onClick={() => toggleType(t.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${selectedTypes.includes(t.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={!canGenerate} size="lg"
              className="w-full rounded-2xl py-6 text-base font-bold shadow-lg shadow-primary/20 gap-2.5">
              <BrainCircuit className="h-5 w-5" />
              Generate {count} Questions
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Files processed privately and never stored.
            </p>
          </motion.div>
        )}

        {/* ── GENERATING ────────────────────────────────────────────────── */}
        {phase === "generating" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-border bg-card p-12 text-center space-y-6 shadow-sm">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <Loader2 className="absolute h-20 w-20 animate-spin text-primary/15" />
              <BrainCircuit className="h-9 w-9 animate-pulse text-primary" />
            </div>
            <div><h3 className="text-xl font-bold">Generating Quiz</h3><p className="text-sm text-muted-foreground mt-1">{statusText}</p></div>
            <div className="max-w-sm mx-auto space-y-1.5">
              <Progress value={progress} className="h-2 rounded-full" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{Math.round(progress)}%</p>
            </div>
          </motion.div>
        )}

        {/* ── QUIZ (REVIEW) MODE ─────────────────────────────────────────── */}
        {phase === "quiz" && questions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startExam} className="rounded-xl gap-1.5 text-xs">
                  <Timer className="h-3.5 w-3.5" /> Exam Mode
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setCardIdx(0); setCardFlipped(false); setKnown(new Set()); setPhase("flashcards"); }} className="rounded-xl gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" /> Flashcards
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={downloadReport} className="rounded-xl gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadCSV} className="rounded-xl gap-1 text-xs">
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setPhase("setup"); setFiles([]); setSelected({}); }} className="rounded-xl text-xs gap-1">
                  <RotateCcw className="h-3.5 w-3.5" /> New Quiz
                </Button>
              </div>
            </div>

            {/* Key concepts */}
            {keyConcepts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-muted-foreground self-center">Key Concepts:</span>
                {keyConcepts.map((c, i) => <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{c}</span>)}
              </div>
            )}

            {/* Score strip */}
            {Object.keys(selected).length === questions.length && (
              <div className={`rounded-2xl border p-5 text-center ${scoreBg}`}>
                <p className={`text-3xl font-black ${scoreColor}`}>{score}/{questions.length}</p>
                <p className={`font-bold text-lg ${scoreColor}`}>{pct}%</p>
                <p className="text-sm text-muted-foreground mt-1">{pct >= 80 ? "🎉 Excellent!" : pct >= 50 ? "👍 Good effort!" : "📚 Keep studying!"}</p>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, i) => {
                const isRevealed = revealed[i];
                const sel = selected[i];
                return (
                  <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground flex-1">
                        <span className="text-muted-foreground mr-1">Q{i + 1}.</span>{q.question}
                      </p>
                      <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground capitalize flex-shrink-0">{q.type}</span>
                    </div>
                    {q.options.length > 0 && (
                      <div className="grid gap-2">
                        {q.options.map((opt, oi) => {
                          const isSel = sel === opt;
                          const isCorrect = opt === q.answer;
                          return (
                            <button key={oi} onClick={() => setSelected(p => ({ ...p, [i]: opt }))}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${isRevealed && isCorrect ? "border-green-500 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300" : isRevealed && isSel && !isCorrect ? "border-red-400 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300" : isSel ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"}`}>
                              {isRevealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                              {isRevealed && isSel && !isCorrect && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {q.options.length === 0 && (
                      <textarea rows={2} placeholder="Your answer…"
                        onChange={e => setSelected(p => ({ ...p, [i]: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    )}
                    <button onClick={() => setRevealed(p => ({ ...p, [i]: !p[i] }))}
                      className="text-xs text-primary hover:underline font-medium">
                      {isRevealed ? "Hide Answer" : "Show Answer"}
                    </button>
                    {isRevealed && (
                      <div className="rounded-xl bg-secondary/50 p-3 space-y-1">
                        <p className="text-xs font-bold text-foreground">✓ {q.answer}</p>
                        {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── EXAM MODE ─────────────────────────────────────────────────── */}
        {phase === "exam" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 text-sm font-bold ${timeLeft < 30 ? "text-red-500" : "text-foreground"}`}>
                  <Timer className="h-4 w-4" /> {formatTime(timeLeft)}
                </div>
                {streak >= 2 && <div className="flex items-center gap-1 text-xs font-bold text-orange-500"><Zap className="h-3.5 w-3.5" />×{streak} streak</div>}
              </div>
              <div className="text-sm text-muted-foreground">{examIdx + 1} / {questions.length}</div>
              <Button size="sm" onClick={() => submitExam(examAnswers)} className="rounded-xl text-xs">Submit Exam</Button>
            </div>

            <Progress value={((examIdx + 1) / questions.length) * 100} className="h-1.5 rounded-full" />

            {/* Current question */}
            {questions[examIdx] && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <p className="font-bold text-foreground">{examIdx + 1}. {questions[examIdx].question}</p>
                <div className="grid gap-2">
                  {questions[examIdx].options.length > 0 ? questions[examIdx].options.map((opt, oi) => (
                    <button key={oi} onClick={() => selectExamAnswer(opt)}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-all ${examAnswers[examIdx] === opt ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/40 hover:bg-secondary/30"}`}>
                      {examAnswers[examIdx] === opt && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                      {opt}
                    </button>
                  )) : (
                    <textarea rows={3} placeholder="Your answer…"
                      value={examAnswers[examIdx] ?? ""}
                      onChange={e => setExamAnswers(p => ({ ...p, [examIdx]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setExamIdx(p => Math.max(0, p - 1))} disabled={examIdx === 0} className="rounded-xl flex-1 gap-1">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              {examIdx < questions.length - 1 ? (
                <Button onClick={() => setExamIdx(p => p + 1)} className="rounded-xl flex-1 gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => submitExam(examAnswers)} className="rounded-xl flex-1 bg-green-600 hover:bg-green-700 gap-1">
                  <GraduationCap className="h-4 w-4" /> Submit
                </Button>
              )}
            </div>

            {/* Question map */}
            <div className="flex flex-wrap gap-1.5">
              {questions.map((_, i) => (
                <button key={i} onClick={() => setExamIdx(i)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${i === examIdx ? "bg-primary text-primary-foreground" : examAnswers[i] ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-secondary text-muted-foreground hover:bg-secondary/60"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RESULTS ───────────────────────────────────────────────────── */}
        {phase === "results" && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
            <div className={`rounded-2xl border p-8 text-center space-y-3 ${scoreBg}`}>
              <p className={`text-6xl font-black ${scoreColor}`}>{pct}%</p>
              <p className={`text-xl font-bold ${scoreColor}`}>{score} / {questions.length} correct</p>
              <p className="text-muted-foreground text-sm">{pct >= 80 ? "🎉 Outstanding! You've mastered this topic." : pct >= 60 ? "👍 Good job! Keep practicing the weak areas." : "📚 Keep studying — review the explanations below."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadReport} className="rounded-xl gap-1.5 text-xs flex-1"><Download className="h-3.5 w-3.5" /> Download PDF Report</Button>
              <Button variant="outline" onClick={downloadCSV} className="rounded-xl gap-1.5 text-xs flex-1"><Download className="h-3.5 w-3.5" /> Download CSV</Button>
              <Button variant="outline" onClick={() => setPhase("quiz")} className="rounded-xl gap-1.5 text-xs flex-1"><BookOpen className="h-3.5 w-3.5" /> Review All</Button>
              <Button variant="outline" onClick={() => { setPhase("setup"); setFiles([]); setSelected({}); }} className="rounded-xl gap-1.5 text-xs flex-1"><RotateCcw className="h-3.5 w-3.5" /> New Quiz</Button>
            </div>
            {/* Per-question results */}
            <div className="space-y-3">
              {questions.map((q, i) => {
                const userAns = selected[i] ?? "(no answer)";
                const correct = userAns === q.answer;
                return (
                  <div key={i} className={`rounded-2xl border p-4 text-sm space-y-2 ${correct ? "border-green-200 bg-green-50 dark:bg-green-950/10 dark:border-green-900" : "border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900"}`}>
                    <p className="font-semibold">{i + 1}. {q.question}</p>
                    <p className={correct ? "text-green-700 dark:text-green-400 text-xs" : "text-red-700 dark:text-red-400 text-xs"}>{correct ? "✓" : "✗"} {userAns}</p>
                    {!correct && <p className="text-xs text-muted-foreground">Correct: <span className="font-semibold text-foreground">{q.answer}</span></p>}
                    {q.explanation && <p className="text-xs text-muted-foreground">{q.explanation}</p>}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── FLASHCARDS ────────────────────────────────────────────────── */}
        {phase === "flashcards" && flashcards.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Flashcards <span className="text-muted-foreground text-base">({cardIdx + 1}/{flashcards.length})</span></h3>
              <div className="flex gap-2">
                <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">✓ {known.size} known</span>
                <Button variant="outline" size="sm" onClick={() => setPhase("quiz")} className="rounded-xl text-xs">← Back to Quiz</Button>
              </div>
            </div>

            <Progress value={((cardIdx + 1) / flashcards.length) * 100} className="h-1.5" />

            {/* Card */}
            <div className="relative min-h-[220px] cursor-pointer" onClick={() => setCardFlipped(f => !f)} style={{ perspective: "1000px" }}>
              <div className={`relative w-full min-h-[220px] transition-transform duration-500`} style={{ transformStyle: "preserve-3d", transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 bg-card flex flex-col items-center justify-center p-8 text-center shadow-sm" style={{ backfaceVisibility: "hidden" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Question</p>
                  <p className="text-lg font-bold text-foreground">{flashcards[cardIdx].front}</p>
                  <p className="text-xs text-muted-foreground mt-6">Tap to reveal answer</p>
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/20 flex flex-col items-center justify-center p-8 text-center shadow-sm" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-600 mb-4">Answer</p>
                  <p className="text-lg font-semibold text-foreground">{flashcards[cardIdx].back}</p>
                </div>
              </div>
            </div>

            {/* Navigation + mark */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setCardIdx(p => Math.max(0, p - 1)); setCardFlipped(false); }} disabled={cardIdx === 0} className="flex-1 rounded-xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              {cardFlipped && (
                <>
                  <Button onClick={() => { setKnown(k => { const n = new Set(k); n.add(cardIdx); return n; }); setCardIdx(p => Math.min(flashcards.length - 1, p + 1)); setCardFlipped(false); }}
                    className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Know It
                  </Button>
                  <Button variant="outline" onClick={() => { setCardIdx(p => Math.min(flashcards.length - 1, p + 1)); setCardFlipped(false); }}
                    className="flex-1 rounded-xl text-xs gap-1">
                    <Star className="h-3.5 w-3.5" /> Still Learning
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => { setCardIdx(p => Math.min(flashcards.length - 1, p + 1)); setCardFlipped(false); }} disabled={cardIdx >= flashcards.length - 1} className="flex-1 rounded-xl">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── SEO Content ──────────────────────────────────────────────── */}
        <div className="mt-16 space-y-10 text-sm text-muted-foreground border-t border-border pt-10">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-display font-bold text-foreground">AI Quiz Generator</h1>
            <p className="text-base max-w-2xl mx-auto">The most powerful AI quiz generator online. Create MCQ, true/false, fill-in-the-blank, and scenario-based quizzes from any document, video, or website in seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">How to generate quizzes with AI</h2>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Upload a document, paste a URL, or enter a YouTube link</li>
                <li>Choose difficulty, question count, and question types</li>
                <li>Click <strong>Generate Questions</strong></li>
                <li>Take the quiz in Review or Exam mode</li>
                <li>Study with Flashcards and download your report</li>
              </ol>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground">Supported File Formats</h2>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {["PDF", "DOCX / DOC", "PPTX / PPT", "XLSX / XLS", "CSV", "TXT / RTF", "PNG / JPG images", "YouTube videos", "Website URLs", "Plain text"].map(f => (
                  <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />{f}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Features of MagicDocx AI Quiz Generator</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <BrainCircuit className="h-4 w-4" />, t: "7 Question Types", d: "MCQ, True/False, Fill-in-blank, Short answer, Scenario, Conceptual" },
                { icon: <Timer className="h-4 w-4" />, t: "Exam Mode", d: "Timed exam with question navigator and streak counter" },
                { icon: <BookOpen className="h-4 w-4" />, t: "Flashcard Mode", d: "Flip-card study with Know It / Still Learning tracking" },
                { icon: <Youtube className="h-4 w-4" />, t: "YouTube Quizzes", d: "Paste any YouTube link and generate a quiz from the video" },
                { icon: <Download className="h-4 w-4" />, t: "Export Options", d: "Download quiz as PDF or CSV with full answer keys" },
                { icon: <ShieldCheck className="h-4 w-4" />, t: "100% Private", d: "Files processed locally and never stored on servers" },
              ].map(({ icon, t, d }) => (
                <div key={t} className="rounded-xl border border-border bg-card p-4 space-y-1.5">
                  <div className="text-primary">{icon}</div>
                  <p className="font-semibold text-foreground text-xs">{t}</p>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">Use cases for students and teachers</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {["Students — Create practice tests from textbooks", "Teachers — Generate exams from lesson plans", "Exam Prep — Simulate real exam conditions", "Corporate Training — Test employee knowledge", "YouTube Learners — Quiz yourself on video content", "Self-learners — Turn any article into a quiz"].map(u => (
                <div key={u} className="rounded-lg border border-border bg-secondary/30 px-3 py-2 font-medium text-foreground">{u}</div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Frequently Asked Questions</h2>
            {[
              { q: "How does the AI quiz generator work?", a: "MagicDocx extracts text from your uploaded file, URL, or YouTube transcript, then sends it to an AI model that generates questions tailored to your chosen difficulty and question types." },
              { q: "Can I generate quizzes from PDFs?", a: "Yes — PDFs are fully supported. The tool extracts text from text-based PDFs automatically, and uses OCR for scanned or image-based PDFs." },
              { q: "Can teachers use this tool for exams?", a: "Absolutely. You can generate up to 50 questions per quiz, customize difficulty to Exam level, and download the full quiz with answer key as a formatted PDF." },
              { q: "Is the quiz generator free?", a: "Yes, MagicDocx AI Quiz Generator is completely free to use. No account required." },
              { q: "Can I generate a quiz from a YouTube video?", a: "Yes — paste any YouTube video URL (with English captions enabled) and the tool will extract the transcript and generate a quiz from the video content." },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-border bg-card px-5 py-4 cursor-pointer">
                <summary className="flex items-center justify-between font-semibold text-foreground list-none text-sm">
                  {q}<ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
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

export default QuizGenerator;
