import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const ToolCard = ({ tool, index }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.45, ease: "easeOut" }}
      whileHover={tool.available ? { y: -4, scale: 1.02 } : undefined}
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center gap-4 rounded-3xl bg-card p-4 transition-all duration-300 border border-transparent hover:border-border shadow-sm hover:shadow-md text-center",
        !tool.available && "opacity-55 cursor-default"
      )}
    >
      {/* Icon */}
      <motion.div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl transition-all shadow-sm",
          tool.bgClass || categoryColors[tool.category]
        )}
        whileHover={tool.available ? {
          scale: 1.1,
          rotate: [0, -8, 8, -4, 0],
        } : undefined}
        transition={{ duration: 0.4 }}
      >
        <Icon className="h-8 w-8" strokeWidth={2} />
      </motion.div>

      {/* Text */}
      <div className="w-full px-2">
        <h3 className="font-display text-sm font-bold text-foreground leading-tight line-clamp-2">{tool.name}</h3>
      </div>

      {/* Badges */}
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-3 top-3 text-[10px] font-semibold">
          Soon
        </Badge>
      )}
      {tool.category === "ai" && (
        <Badge className="absolute right-3 top-3 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-none">
          AI
        </Badge>
      )}
    </motion.div>
  );

  if (!tool.available) return <div data-tool-path={tool.path}>{content}</div>;
  return <Link to={tool.path} data-tool-path={tool.path}>{content}</Link>;
};

export default ToolCard;
