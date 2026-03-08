import { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";

interface ToolLayoutProps {
  title: string;
  description: string;
  category: ToolCategory;
  icon: ReactNode;
  children: ReactNode;
  metaTitle?: string;
  metaDescription?: string;
}

const ToolLayout = ({ title, description, category, icon, children, metaTitle, metaDescription }: ToolLayoutProps) => (
  <>
    <Helmet>
      <title>{metaTitle || `${title} - My Love PDF`}</title>
      <meta name="description" content={metaDescription || description} />
    </Helmet>
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-secondary/30 py-12">
          <div className="container text-center">
            <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-primary-foreground", categoryColors[category])}>
              {icon}
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">{description}</p>
          </div>
        </section>
        <section className="container max-w-3xl py-10">
          {children}
        </section>
      </main>
      <Footer />
    </div>
  </>
);

export default ToolLayout;
