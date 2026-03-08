import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { BrainCircuit, Download, Eye, EyeOff, CheckCircle2, XCircle, Info, RotateCcw } from "lucide-react";
import { extractTextFromPdf } from "@/lib/pdfTextExtract";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";

type QuizType = "mcq" | "truefalse" | "short";

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

const QuizGenerator = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizType, setQuizType] = useState<QuizType>("mcq");
  const [questionCount, setQuestionCount] = useState(10);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [showAnswers, setShowAnswers] = useState<Record<number, boolean>>({});
  const [showAllAnswers, setShowAllAnswers] = useState(false);
  const { toast } = useToast();

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      return await extractTextFromPdf(file);
    }
    return await file.text();
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setQuestions([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setShowAllAnswers(false);

    try {
      const textParts = await Promise.all(files.map(extractTextFromFile));
      const text = textParts.join("\n\n--- Next Document ---\n\n");
      setProgress(50);

      if (!text.trim()) {
        toast({ title: "Error", description: "Could not extract text from the uploaded files.", variant: "destructive" });
        setProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ai-quiz", {
        body: { text, quizType, count: questionCount },
      });

      setProgress(90);
      if (error) throw error;
      setQuestions(data.questions || []);
      setProgress(100);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate quiz.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const selectAnswer = (qIndex: number, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: answer }));
  };

  const toggleAnswer = (qIndex: number) => {
    setShowAnswers((prev) => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const getScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (selectedAnswers[i] === q.answer) correct++;
    });
    return correct;
  };

  const resetQuiz = () => {
    setQuestions([]);
    setFiles([]);
    setSelectedAnswers({});
    setShowAnswers({});
    setShowAllAnswers(false);
  };

  const downloadQuizPdf = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = 25;

      const checkPage = (needed: number) => {
        if (y + needed > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 25;
        }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Quiz - MagicPDFs", margin, y);
      y += 12;

      questions.forEach((q, i) => {
        checkPage(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const qLines = doc.splitTextToSize(`Q${i + 1}. ${q.question}`, maxWidth);
        doc.text(qLines, margin, y);
        y += qLines.length * 6 + 3;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        q.options.forEach((opt) => {
          checkPage(10);
          const optLines = doc.splitTextToSize(`  ${opt}`, maxWidth);
          doc.text(optLines, margin, y);
          y += optLines.length * 5 + 2;
        });

        checkPage(14);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        const ansLines = doc.splitTextToSize(`Answer: ${q.answer}`, maxWidth);
        doc.text(ansLines, margin, y);
        y += ansLines.length * 5 + 2;

        if (q.explanation) {
          checkPage(10);
          const expLines = doc.splitTextToSize(`Explanation: ${q.explanation}`, maxWidth);
          doc.text(expLines, margin, y);
          y += expLines.length * 5 + 2;
        }
        y += 6;
      });

      doc.save("quiz.pdf");
    } catch (err: any) {
      toast({ title: "Download Error", description: err.message || "Failed to generate PDF.", variant: "destructive" });
    }
  };

  const types: { value: QuizType; label: string }[] = [
    { value: "mcq", label: "Multiple Choice" },
    { value: "truefalse", label: "True / False" },
    { value: "short", label: "Short Answer" },
  ];

  return (
    <ToolLayout
      title="AI Quiz Generator"
      description="Create quizzes from any document — perfect for students, teachers, and exam prep."
      category="ai"
      icon={<BrainCircuit className="h-7 w-7" />}
      metaTitle="AI Quiz Generator — Create Practice Tests | MagicPDFs"
      metaDescription="Upload study material and instantly create MCQ, true/false, or short answer quizzes with AI."
      toolId="ai-quiz"
      hideHeader
    >
      <div className="space-y-6">
        {/* Instructions first */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <BrainCircuit className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">AI Quiz Generator</h1>
              <p className="text-sm text-muted-foreground">Create practice tests from any document</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { step: "1", text: "Upload your study material" },
              { step: "2", text: "Pick quiz type & number of questions" },
              { step: "3", text: "Take the quiz or download it" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{s.step}</span>
                <span className="text-sm text-foreground">{s.text}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Upload multiple files at once. Supports PDF, TXT, DOC, CSV, HTML, and more. Great for exam prep, revision, and self-testing. Your files are private and deleted after processing.
            </p>
          </div>
        </div>

        {/* Upload below instructions */}
        <FileUpload
          accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.xml,.html,.rtf"
          multiple={true}
          onFilesChange={setFiles}
          files={files}
          label="Upload study material (PDF, TXT, DOC, and more)"
        />

        {files.length > 0 && questions.length === 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <Button key={t.value} variant={quizType === t.value ? "default" : "outline"} size="sm" onClick={() => setQuizType(t.value)} className="rounded-xl">
                  {t.label}
                </Button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Number of Questions</span>
                <span className="text-sm font-bold text-primary">{questionCount}</span>
              </div>
              <Slider value={[questionCount]} onValueChange={(v) => setQuestionCount(v[0])} min={5} max={30} step={5} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>30</span>
              </div>
            </div>

            {processing && <Progress value={progress} className="h-2" />}
            <Button onClick={handleGenerate} disabled={processing} size="lg" className="w-full rounded-xl">
              <BrainCircuit className="mr-2 h-5 w-5" />
              {processing ? "Creating Quiz…" : `Generate ${questionCount} Questions`}
            </Button>
          </div>
        )}

        {questions.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">Quiz — {questions.length} Questions</h2>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={resetQuiz} className="rounded-xl">
                  <RotateCcw className="mr-1 h-4 w-4" /> New Quiz
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAllAnswers(!showAllAnswers)} className="rounded-xl">
                  {showAllAnswers ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
                  {showAllAnswers ? "Hide All" : "Reveal All"}
                </Button>
                <Button variant="outline" size="sm" onClick={downloadQuizPdf} className="rounded-xl">
                  <Download className="mr-1 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>

            {Object.keys(selectedAnswers).length === questions.length && (
              <div className="rounded-2xl border border-primary bg-primary/5 p-5 text-center">
                <p className="font-display text-2xl font-bold text-primary">Score: {getScore()} / {questions.length}</p>
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-3">
                <p className="font-display text-sm font-semibold text-foreground">Q{i + 1}. {q.question}</p>
                {q.options.length > 0 && (
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selectedAnswers[i] === opt;
                      const revealed = showAnswers[i] || showAllAnswers;
                      const isCorrect = opt === q.answer;
                      return (
                        <button
                          key={oi}
                          onClick={() => selectAnswer(i, opt)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                            revealed && isCorrect ? "border-green-500 bg-green-50 text-green-800"
                            : revealed && isSelected && !isCorrect ? "border-red-400 bg-red-50 text-red-700"
                            : isSelected ? "border-primary bg-primary/5 text-foreground"
                            : "border-border hover:border-primary/40"
                          }`}
                        >
                          {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                          {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => toggleAnswer(i)} className="text-xs">
                    {showAnswers[i] || showAllAnswers ? "Hide Answer" : "Show Answer"}
                  </Button>
                </div>
                {(showAnswers[i] || showAllAnswers) && (
                  <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                    <p className="font-semibold text-foreground">Answer: {q.answer}</p>
                    {q.explanation && <p className="mt-1 text-muted-foreground">{q.explanation}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default QuizGenerator;
