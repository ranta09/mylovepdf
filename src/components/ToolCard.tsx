import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const ToolCard = ({ tool }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <div
      className={cn(
        "group relative flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all duration-200",
        tool.available ? "cursor-pointer hover:shadow-card-hover hover:-translate-y-1" : "opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground transition-transform duration-200 group-hover:scale-110",
          categoryColors[tool.category]
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">{tool.name}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{tool.description}</p>
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">Soon</Badge>
      )}
      {tool.category === "ai" && (
        <Badge className="absolute left-3 top-3 text-[10px] bg-primary text-primary-foreground border-0">AI</Badge>
      )}
    </div>
  );

  if (!tool.available) return <div data-tool-path={tool.path}>{content}</div>;
  return <Link to={tool.path} data-tool-path={tool.path}>{content}</Link>;
};

export default ToolCard;
