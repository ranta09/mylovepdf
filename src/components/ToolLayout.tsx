import React, { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import { useGlobalUpload } from "./GlobalUploadContext";
import { tools, aiTools } from "@/lib/tools";

const allTools = [...tools, ...aiTools];

interface ToolLayoutProps {
  title: string;
  description: string;
  category: ToolCategory;
  icon: ReactNode;
  children: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
  hideHeader?: boolean;
  toolId?: string;
}

const ToolLayout = ({
  title,
  description,
  category,
  icon,
  children,
  metaTitle,
  metaDescription,
  hideHeader,
  toolId,
}: ToolLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setActiveTool } = useGlobalUpload();

  const currentTool = allTools.find(t =>
    (toolId && t.id === toolId) || t.path === location.pathname
  );

  React.useEffect(() => {
    setActiveTool(currentTool || null);
    return () => setActiveTool(null);
  }, [currentTool, setActiveTool]);

  if (typeof window !== "undefined") {
    sessionStorage.setItem("lastVisitedTool", location.pathname);
  }
  const showBack = location.pathname !== "/";

  return (
    <>
      <Helmet>
        <title>{metaTitle || `${title} - MagicDOCX`}</title>
        <meta name="description" content={metaDescription || description} />
      </Helmet>

      <div
        className="flex min-h-screen flex-col bg-background"
        style={{
          '--primary': `var(--tool-${currentTool?.category || category})`,
          '--ring': `var(--tool-${currentTool?.category || category})`
        } as React.CSSProperties}
      >
        <Navbar />
        <main className="flex-1">


          {/* Main content */}
          <section className="container max-w-[1600px] w-[95%] py-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              {!hideHeader && (
                <div className="mb-6 rounded-2xl border border-border bg-secondary/10 p-5 md:p-6 backdrop-blur-sm shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                  <div className="flex items-center gap-4">
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-110", currentTool?.bgClass || categoryColors[category])}>
                      {icon && React.isValidElement(icon)
                        ? React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6" } as any)
                        : icon
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="font-display text-xl md:text-2xl font-black text-foreground tracking-tight truncate">{title}</h1>
                      <p className="mt-0.5 text-sm md:text-base text-muted-foreground font-medium line-clamp-1">{description}</p>
                    </div>
                  </div>
                </div>
              )}

              {children}
            </motion.div>
          </section>
        </main>
      </div>
    </>
  );
};

export default ToolLayout;
