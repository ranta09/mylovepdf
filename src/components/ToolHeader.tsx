import { ReactNode } from "react";
import { Info } from "lucide-react";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface Step {
  step: string;
  text: string;
}

interface ToolHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  category: ToolCategory;
  infoText: string;
  steps: Step[];
}

const categoryBorderBg: Record<ToolCategory, string> = {
  merge: "border-tool-merge/20 bg-tool-merge/5",
  split: "border-tool-split/20 bg-tool-split/5",
  compress: "border-tool-compress/20 bg-tool-compress/5",
  convert: "border-tool-convert/20 bg-tool-convert/5",
  edit: "border-tool-edit/20 bg-tool-edit/5",
  protect: "border-tool-protect/20 bg-tool-protect/5",
  ai: "border-tool-ai/20 bg-tool-ai/5",
};

const ToolHeader = ({ icon, title, subtitle, category, infoText, steps }: ToolHeaderProps) => {
  return (
    <div className={cn("rounded-2xl border p-6 space-y-4", categoryBorderBg[category])}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", categoryColors[category])}>
          {icon}
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-card border border-border p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{infoText}</p>
      </div>
    </div>
  );
};

export default ToolHeader;

export const ToolSteps = ({ steps, category }: { steps: Step[]; category: ToolCategory }) => (
  <div className="grid gap-2 sm:grid-cols-3">
    {steps.map((s) => (
      <div key={s.step} className="flex items-center gap-2 rounded-xl bg-card border border-border p-3">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground", categoryColors[category])}>
          {s.step}
        </span>
        <span className="text-sm text-foreground">{s.text}</span>
      </div>
    ))}
  </div>
);
