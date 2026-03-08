import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const ToolCard = ({ tool, index }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: "easeOut" }}
      whileHover={tool.available ? { y: -6, scale: 1.02 } : undefined}
      className={cn(
        "group relative flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-card transition-shadow duration-300",
        tool.available ? "cursor-pointer hover:shadow-card-hover" : "opacity-60"
      )}
    >
      <motion.div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl text-primary-foreground",
          categoryColors[tool.category]
        )}
        whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.15 }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="h-6 w-6" />
      </motion.div>
      <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">{tool.name}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">{tool.description}</p>
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-3 top-3 text-[10px]">Soon</Badge>
      )}
      {tool.category === "ai" && (
        <Badge className="absolute left-3 top-3 text-[10px] bg-primary text-primary-foreground border-0">AI</Badge>
      )}
    </motion.div>
  );

  if (!tool.available) return <div data-tool-path={tool.path}>{content}</div>;
  return <Link to={tool.path} data-tool-path={tool.path}>{content}</Link>;
};

export default ToolCard;
