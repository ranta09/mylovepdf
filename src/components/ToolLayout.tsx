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
          {/* Tool header */}
          {!hideHeader && (
            <section className="border-b border-border bg-secondary/30 py-12">
              <div className="container text-center">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground shadow-md", currentTool?.bgClass || categoryColors[category])}>
                    {icon}
                  </div>
                  <div>
                    <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
                    <p className="mx-auto mt-2 max-w-lg text-muted-foreground">{description}</p>
                  </div>
                </motion.div>
              </div>
            </section>
          )}


          {/* Main content */}
          <section className="container max-w-[1600px] w-[95%] py-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              {children}
            </motion.div>
          </section>
        </main>
      </div>
    </>
  );
};

export default ToolLayout;
