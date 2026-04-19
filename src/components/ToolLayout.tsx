import React, { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import SEOHead from "./SEOHead";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Footer from "./Footer";



import { useGlobalUpload } from "./GlobalUploadContext";
import { tools, aiTools } from "@/lib/tools";
import { toolSchemas } from "@/lib/toolSchemas";

const allTools = [...tools, ...aiTools];

interface ToolLayoutProps {
  title: string;
  description: string;
  category: ToolCategory;
  icon: ReactNode;
  children: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  hideHeader?: boolean;
  toolId?: string;
  className?: string;
}

const ToolLayout = ({
  title,
  description,
  category,
  icon,
  children,
  metaTitle,
  metaDescription,
  canonicalUrl,
  ogImage,
  hideHeader,
  toolId,
  className,
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

  // Auto-derive canonical from current path if not explicitly provided
  const resolvedCanonical = canonicalUrl ?? location.pathname;

  // Auto-lookup JSON-LD schemas for this route
  const pageSchemas = toolSchemas[location.pathname];
  const resolvedJsonLd = pageSchemas
    ? [pageSchemas.softwareApplication, pageSchemas.howTo]
    : undefined;

  return (
    <>
      <SEOHead
        title={metaTitle || `${title}, MagicDOCX`}
        description={metaDescription || description}
        canonicalUrl={resolvedCanonical}
        ogImage={ogImage}
        jsonLd={resolvedJsonLd}
      />

      <div
        className={cn("flex min-h-screen flex-col bg-background", className)}
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


              {children}
            </motion.div>
          </section>
        </main>
        <Footer />
      </div>

    </>
  );
};

export default ToolLayout;
