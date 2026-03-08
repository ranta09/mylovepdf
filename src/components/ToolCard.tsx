import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const ToolCard = ({ tool, index }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className={cn(
        "group relative flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-all duration-200",
        tool.available ? "cursor-pointer hover:shadow-card-hover hover:-translate-y-1" : "opacity-60"
      )}
    >
      <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground transition-transform duration-200 group-hover:scale-110", categoryColors[tool.category])}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">{tool.name}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{tool.description}</p>
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">Soon</Badge>
      )}
    </motion.div>
  );

  if (!tool.available) return content;
  return <Link to={tool.path}>{content}</Link>;
};

export default ToolCard;
