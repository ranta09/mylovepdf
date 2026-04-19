import { motion } from "framer-motion";
import {
  Download,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface DownloadScreenProps {
  title: string;
  downloadLabel: string;
  resultUrl: string;
  resultName: string;
  onReset: () => void;
  recommendedTools: Tool[];
}

const DownloadScreen = ({
  title,
  downloadLabel,
  resultUrl,
  resultName,
  onReset,
  recommendedTools,
}: DownloadScreenProps) => {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = resultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-full bg-secondary/30 dark:bg-secondary/10"
    >
      <div className="w-full max-w-5xl mx-auto px-4 pt-6 pb-12 space-y-8">

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center tracking-tighter">
          {title}
        </h2>

        {/* ACTION ROW */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:-ml-24">
          {/* Back / Reset button */}
          <button
            onClick={onReset}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors shrink-0"
            title="Go back"
          >
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>

          {/* Primary download button */}
          <button
            className="h-20 px-8 md:px-20 w-full md:w-auto md:min-w-[420px] rounded-2xl font-bold text-lg md:text-xl bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:brightness-110 active:scale-[0.98] transition-all flex items-center gap-3 justify-center uppercase tracking-wider"
            onClick={handleDownload}
          >
            <Download className="h-6 w-6" />
            {downloadLabel}
          </button>
        </div>

        {/* Continue to… */}
        <div className="bg-background rounded-2xl border border-border overflow-hidden max-w-5xl mx-auto w-full">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Continue to...</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {recommendedTools.map((tool, i) => (
              <a
                key={tool.path}
                href={tool.path}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 hover:bg-secondary/40 transition-colors group",
                  i % 2 === 0 && "sm:border-r border-border",
                  i >= 2 && "border-t border-border"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <tool.icon className="h-5 w-5 text-primary stroke-[1.5]" />
                </div>
                <span className="text-sm font-semibold text-foreground flex-1 group-hover:text-primary transition-colors">
                  {tool.name}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </a>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-border flex justify-end">
            <button
              onClick={() => (window.location.href = "/#all-tools")}
              className="text-sm font-bold text-foreground hover:text-primary transition-colors hover:underline underline-offset-4"
            >
              See more
            </button>
          </div>
        </div>

        {/* Security section */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 space-y-4 max-w-5xl mx-auto w-full">
          <h3 className="text-xl font-bold text-foreground tracking-tight">
            Secure. Private. In your control
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MagicDOCX processes all files directly in your browser with no
            server uploads, no tracking, and complete privacy. Your files are
            always handled safely and automatically cleared after processing.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            {[
              { icon: ShieldCheck, label: "SSL Encryption" },
              { icon: Loader2, label: "No Storage" },
              { icon: CheckCircle2, label: "100% Private" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/20 bg-background text-sm font-bold text-foreground shrink-0 shadow-sm"
              >
                <Icon className="h-4 w-4 text-primary" strokeWidth={2.5} />
                {label}
              </div>
            ))}
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default DownloadScreen;
