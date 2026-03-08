import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type ToolCategory } from "@/lib/tools";
import {
  Sparkles, Merge, Scissors, Minimize2, ArrowLeftRight, Edit3, Lock, LayoutGrid,
} from "lucide-react";

export type FilterCategory = "all" | ToolCategory;

const categories: { id: FilterCategory; label: string; icon: typeof Merge }[] = [
  { id: "all", label: "All Tools", icon: LayoutGrid },
  { id: "ai", label: "AI Tools", icon: Sparkles },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "edit", label: "Edit", icon: Edit3 },
  { id: "merge", label: "Merge", icon: Merge },
  { id: "split", label: "Split", icon: Scissors },
  { id: "compress", label: "Compress", icon: Minimize2 },
  { id: "protect", label: "Protect", icon: Lock },
];

interface CategoryFilterProps {
  active: FilterCategory;
  onChange: (cat: FilterCategory) => void;
  counts: Record<FilterCategory, number>;
}

const CategoryFilter = ({ active, onChange, counts }: CategoryFilterProps) => (
  <div className="flex flex-wrap justify-center gap-2">
    {categories.map(cat => {
      const isActive = active === cat.id;
      const count = counts[cat.id] ?? 0;
      if (cat.id !== "all" && count === 0) return null;
      const Icon = cat.icon;
      return (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            "relative flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{cat.label}</span>
          <span className={cn(
            "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-border text-muted-foreground"
          )}>
            {count}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeFilter"
              className="absolute inset-0 rounded-full bg-primary -z-10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      );
    })}
  </div>
);

export default CategoryFilter;
