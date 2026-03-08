import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const ToolCard = ({ tool, index }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <motion.div
      whileHover={tool.available ? { y: -4, scale: 1.02 } : undefined}
      className={cn(
        "group relative flex h-[180px] flex-col items-center justify-center gap-2.5 rounded-2xl border border-border bg-card p-5 text-center shadow-card transition-shadow duration-300",
        tool.available ? "cursor-pointer hover:shadow-card-hover hover:border-primary/20" : "opacity-60"
      )}
    >
      <motion.div
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground",
          categoryColors[tool.category]
        )}
        whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.1 }}
        transition={{ duration: 0.4 }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <h3 className="font-display text-[13px] font-semibold text-foreground line-clamp-1">{tool.name}</h3>
      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{tool.description}</p>
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-2 top-2 text-[10px]">Soon</Badge>
      )}
      {tool.category === "ai" && (
        <Badge className="absolute left-2 top-2 text-[10px] bg-primary text-primary-foreground border-0">AI</Badge>
      )}
    </motion.div>
  );

  if (!tool.available) return content;
  return <Link to={tool.path}>{content}</Link>;
};

export default ToolCard;
