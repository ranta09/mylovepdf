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
      whileHover={tool.available ? { y: -8, boxShadow: "var(--shadow-card-hover)" } : undefined}
      className={cn(
        "group relative flex flex-col justify-between h-full rounded-2xl bg-card p-5 xl:p-6 transition-all duration-300 border border-border shadow-sm text-left overflow-hidden isolate",
        !tool.available && "opacity-55 cursor-default"
      )}
    >
      <div className="flex flex-col gap-3 z-10">
        {/* Icon */}
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shrink-0 shadow-sm",
            tool.bgClass || categoryColors[tool.category]
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>

        {/* Text */}
        <div>
          <h3 className="font-display text-lg font-bold text-foreground mb-1.5">{tool.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{tool.description}</p>
        </div>
      </div>

      {/* CTA Button */}
      {tool.available && (
        <div className="mt-5 flex items-center text-sm font-bold text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 z-10">
          Use Tool <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      )}

      {/* Subtle Background Glow on Hover */}
      {tool.available && (
         <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10 pointer-events-none" style={{ background: "var(--primary)" }} />
      )}

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

  if (!tool.available) return <div data-tool-path={tool.path} className="h-full">{content}</div>;
  return <Link to={tool.path} data-tool-path={tool.path} className="h-full block">{content}</Link>;
};

export default ToolCard;
