import { motion, AnimatePresence } from "framer-motion";
import ToolCard from "@/components/ToolCard";
import { type PdfTool } from "@/lib/tools";

interface ToolsGridProps {
  tools: PdfTool[];
  emptySearch?: string;
}

const ToolsGrid = ({ tools, emptySearch }: ToolsGridProps) => {
  if (tools.length === 0 && emptySearch) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-muted-foreground">No tools found for "{emptySearch}"</p>
        <p className="mt-2 text-sm text-muted-foreground">Try "merge", "convert", or "summarize"</p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      <AnimatePresence mode="popLayout">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, delay: i * 0.02 }}
          >
            <ToolCard tool={tool} index={i} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default ToolsGrid;
