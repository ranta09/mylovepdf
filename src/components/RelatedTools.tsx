import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { aiTools, tools } from "@/lib/tools";

const allTools = [...aiTools, ...tools];

interface RelatedToolsProps {
    toolIds: string[];
    title?: string;
}

const RelatedTools = ({ toolIds, title = "You Might Also Like" }: RelatedToolsProps) => {
    const relatedTools = toolIds
        .map(id => allTools.find(t => t.id === id))
        .filter(Boolean) as typeof allTools;

    if (relatedTools.length === 0) return null;

    return (
        <section className="mt-14 border-t border-border pt-10">
            <h2 className="text-xl font-bold text-foreground mb-6">{title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {relatedTools.map((tool, i) => {
                    const Icon = tool.icon;
                    return (
                        <motion.div
                            key={tool.id}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.06 }}
                        >
                            <Link
                                to={tool.path}
                                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all group"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                    <Icon className="h-4.5 w-4.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                        {tool.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                                </div>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
};

export default RelatedTools;
