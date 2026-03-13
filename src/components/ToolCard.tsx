import { Link } from "react-router-dom";
import { type PdfTool, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

const ToolCard = ({ tool, index }: { tool: PdfTool; index: number }) => {
  const Icon = tool.icon;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.45, ease: "easeOut" }}
      whileHover={tool.available ? { y: -6, scale: 1.02 } : undefined}
      className={cn(
        "group relative flex min-h-[220px] flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300",
        tool.available
          ? "cursor-pointer hover:shadow-card-hover hover:border-primary/20"
          : "opacity-55 cursor-default"
      )}
    >
      {/* Icon */}
      <motion.div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl transition-all shadow-sm",
          tool.bgClass || categoryColors[tool.category]
        )}
        whileHover={tool.available ? {
          scale: 1.15,
          rotate: [0, -8, 8, -4, 0],
          boxShadow: `0 0 20px hsl(var(--tool-${tool.category}) / 0.4)`
        } : undefined}
        transition={{ duration: 0.4 }}
      >
        <Icon className="h-7 w-7" />
      </motion.div>

      {/* Text */}
      <div className="flex-1">
        <h3 className="font-display text-sm font-bold text-foreground leading-snug line-clamp-1">{tool.name}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">{tool.description}</p>
      </div>

      {/* Hover arrow */}
      {tool.available && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100"
        >
          Open tool
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </motion.div>
      )}

      {/* Badges */}
      {!tool.available && (
        <Badge variant="secondary" className="absolute right-3 top-3 text-[10px] font-semibold">
          Soon
        </Badge>
      )}
      {tool.category === "ai" && (
        <Badge className="absolute right-3 top-3 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-indigo-600 text-white border-0">
          AI
        </Badge>
      )}
    </motion.div>
  );

  if (!tool.available) return <div data-tool-path={tool.path}>{content}</div>;
  return <Link to={tool.path} data-tool-path={tool.path}>{content}</Link>;
};

export default ToolCard;
