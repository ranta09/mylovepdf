import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ReportIssue from "./ReportIssue";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface ToolLayoutProps {
  title: string;
  description: string;
  category: ToolCategory;
  icon: ReactNode;
  children: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
  hideHeader?: boolean;
}

const ToolLayout = ({ title, description, category, icon, children, metaTitle, metaDescription, hideHeader }: ToolLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const showBack = location.pathname !== "/";

  return (
    <>
      <Helmet>
        <title>{metaTitle || `${title} - DocuMind`}</title>
        <meta name="description" content={metaDescription || description} />
      </Helmet>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          {!hideHeader && (
            <section className="border-b border-border bg-secondary/30 py-12">
              <div className="container text-center">
                <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground", categoryColors[category])}>
                  {icon}
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{description}</p>
              </div>
            </section>
          )}
          <section className="container max-w-3xl py-10">
            {showBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="mb-6 gap-2 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all tools
              </Button>
            )}
            {children}
            <ReportIssue />
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ToolLayout;
