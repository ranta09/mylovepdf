import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    Zap, ShieldCheck, Monitor, Star, ChevronDown, ChevronRight,
    LucideIcon, Lock, CheckCircle2, Globe, FileText, Minimize2,
    Merge, Scissors, RotateCcw, Layers, Trash2, Copy, Edit3, Hash,
    Crop, ShieldAlert, Droplets, Wrench, GitCompare, FileSpreadsheet,
    Presentation, PenTool, Unlock, Square, Scan, Image as ImageIcon
} from "lucide-react";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";

// Types
export interface SeoFeature {
    icon: LucideIcon;
    title: string;
    desc: string;
}

export interface SeoFaq {
    q: string;
    a: string;
}

export interface SeoRelatedTool {
    name: string;
    path: string;
    icon: LucideIcon;
}

export interface ToolSeoSectionProps {
    toolName: string;
    category: ToolCategory;
    intro: string;
    features?: SeoFeature[];
    steps: string[];
    relatedTools: SeoRelatedTool[]; // Unused globally but kept for interface compatibility
    formats: string[];
    faqs?: SeoFaq[];
    schemaName?: string;
    schemaDescription?: string;
}

const getDynamicFeatures = (toolName: string): SeoFeature[] => [
    {
        icon: Zap,
        title: `The Best Free ${toolName} Tool Online`,
        desc: `Need to process a document quickly and easily? MagicDOCX is the top choice for ${toolName}. Our tool is fast, reliable, and completely free, the perfect choice for email attachments, web uploads, and secure document management.`
    },
    {
        icon: Lock,
        title: "Permanent File Deletion for Privacy",
        desc: "Your security matters. Most files are processed locally in your browser and are never uploaded to any server. No copies are retained, ensuring your documents remain 100% private."
    },
    {
        icon: ShieldCheck,
        title: `Encrypted & Secure ${toolName}`,
        desc: `Every file is handled with the highest security standards. Even the most sensitive documents stay completely private while using ${toolName}, giving you peace of mind.`
    },
    {
        icon: Monitor,
        title: `Access ${toolName} Anywhere`,
        desc: `Our advanced ${toolName} tool works online across all devices and operating systems. Whether you're on Windows, Mac, Linux, iOS, or Android, you can process documents online anytime, anywhere.`
    },
    {
        icon: Star,
        title: `Free ${toolName} with Unlimited Use`,
        desc: `Process as many files as you like instantly with no limits. Our ${toolName} features are fast, free, and always available, no software, account, or subscription required.`
    },
    {
        icon: Merge,
        title: "All-in-One PDF Tools Beyond Processing",
        desc: "More than just a single tool, MagicDOCX offers powerful utilities to merge, split, compress, rotate, and convert PDFs. Whatever your editing needs, our platform provides a complete solution for working with documents online."
    }
];

const getDynamicTutorials = (toolName: string) => [
    {
      bg: "from-primary to-primary/70",
      category: `HOW TO USE ${toolName.toUpperCase()}`,
      title: `The Ultimate Guide to ${toolName} Online`,
      desc: `Step-by-step guide to using our free, fast ${toolName} tool without installing any software.`,
      path: "/blog",
    },
    {
      bg: "from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800",
      category: `HOW TO USE ${toolName.toUpperCase()}`,
      title: `Master ${toolName} in 3 Easy Steps`,
      desc: `Learn how to process your documents effortlessly. An introductory tutorial to get you started in just a few clicks.`,
      path: "/blog",
    },
    {
      bg: "from-rose-400 to-rose-300",
      category: `PRO TIPS FOR ${toolName.toUpperCase()}`,
      title: `Advanced ${toolName} Techniques for Professionals`,
      desc: `Enhance your document workflow with advanced tips and tricks for securely handling files online.`,
      path: "/blog",
    },
];

const defaultFaqs: SeoFaq[] = [
    { q: "Is this tool free to use?", a: "Yes, MagicDocx tools are completely free to use. There are no hidden fees, no subscriptions required, and no sign-up needed for most tools." },
    { q: "Are my files secure?", a: "Absolutely. All file transfers use HTTPS encryption. Files processed in the browser never leave your device. Server-processed files are automatically deleted within minutes after processing." },
    { q: "Do you store my uploaded files?", a: "No. MagicDocx does not permanently store your files. Any server-side processed files are automatically deleted shortly after your download. Your privacy is our priority." },
    { q: "Can I use this tool on mobile?", a: "Yes! MagicDocx is fully responsive and works on any modern smartphone or tablet browser: iOS Safari, Android Chrome, and more. No app installation required." },
    { q: "What is the maximum file size supported?", a: "Most tools support files up to 100 MB. For very large files, we recommend compressing them first or splitting them into smaller parts before processing." },
];

// PRODUCT FAMILY 
const PRODUCT_FAMILY = [
  {
    category: "Compress & Convert",
    tools: [
      { name: "Compress PDF", path: "/compress-pdf", icon: Minimize2, iconColor: "text-red-500" },
      { name: "HTML to PDF", path: "/html-to-pdf", icon: Globe, iconColor: "text-blue-500" },
    ]
  },
  {
    category: "Organize",
    tools: [
      { name: "Merge PDF", path: "/merge-pdf", icon: Merge, iconColor: "text-violet-600" },
      { name: "Split PDF", path: "/split-pdf", icon: Scissors, iconColor: "text-violet-600" },
      { name: "Rotate PDF", path: "/rotate-pdf", icon: RotateCcw, iconColor: "text-violet-600" },
      { name: "Organize PDF", path: "/organize-pdf", icon: Layers, iconColor: "text-violet-600" },
      { name: "Delete PDF Pages", path: "/delete-pages", icon: Trash2, iconColor: "text-violet-600" },
      { name: "Extract PDF Pages", path: "/extract-pages", icon: Copy, iconColor: "text-violet-600" },
    ]
  },
  {
    category: "View & Edit",
    tools: [
      { name: "Edit PDF", path: "/edit-pdf", icon: Edit3, iconColor: "text-cyan-500" },
      { name: "Number Pages", path: "/page-numbers", icon: Hash, iconColor: "text-cyan-500" },
      { name: "Crop PDF", path: "/crop-pdf", icon: Crop, iconColor: "text-cyan-500" },
      { name: "Redact PDF", path: "/redact-pdf", icon: ShieldAlert, iconColor: "text-cyan-500" },
      { name: "Watermark PDF", path: "/add-watermark", icon: Droplets, iconColor: "text-cyan-500" },
      { name: "Repair PDF", path: "/repair-pdf", icon: Wrench, iconColor: "text-cyan-500" },
      { name: "Compare PDF", path: "/compare-pdf", icon: GitCompare, iconColor: "text-cyan-500" },
    ]
  },
  {
    category: "Convert from PDF",
    tools: [
      { name: "PDF to Word", path: "/pdf-to-word", icon: FileText, iconColor: "text-blue-500" },
      { name: "PDF to Excel", path: "/pdf-to-excel", icon: FileSpreadsheet, iconColor: "text-emerald-500" },
      { name: "PDF to JPG", path: "/pdf-to-jpg", icon: ImageIcon, iconColor: "text-orange-400" },
      { name: "PDF to PPT", path: "/pdf-to-ppt", icon: Presentation, iconColor: "text-red-400" },
    ]
  },
  {
    category: "Convert to PDF",
    tools: [
      { name: "Word to PDF", path: "/word-to-pdf", icon: FileText, iconColor: "text-blue-600" },
      { name: "Excel to PDF", path: "/excel-to-pdf", icon: FileSpreadsheet, iconColor: "text-green-600" },
      { name: "PPT to PDF", path: "/ppt-to-pdf", icon: Presentation, iconColor: "text-orange-600" },
      { name: "JPG to PDF", path: "/jpg-to-pdf", icon: ImageIcon, iconColor: "text-amber-500" },
      { name: "OCR PDF", path: "/ocr-pdf", icon: Scan, iconColor: "text-red-500" },
    ]
  },
  {
    category: "Sign & Secure",
    tools: [
      { name: "Sign PDF", path: "/sign-pdf", icon: PenTool, iconColor: "text-pink-500" },
      { name: "Protect PDF", path: "/protect-pdf", icon: Lock, iconColor: "text-red-400" },
      { name: "Unlock PDF", path: "/unlock-pdf", icon: Unlock, iconColor: "text-red-400" },
      { name: "Flatten PDF", path: "/flatten-pdf", icon: Square, iconColor: "text-red-400" },
    ]
  }
];

const RatingBar = () => {
    const [userRating, setUserRating] = useState<number>(0);
    const [hovered, setHovered] = useState<number>(0);
    const fixed = 4.8;
    const votes = 245102;
  
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-6 border-y border-border">
        <span className="text-sm font-bold text-foreground">Rate this tool</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = hovered ? star <= hovered : userRating ? star <= userRating : star <= fixed;
            const isHalf = !hovered && !userRating && star === 5 && fixed % 1 !== 0;
            return (
              <button
                key={star}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setUserRating(star)}
                className="relative focus:outline-none"
                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    active ? "text-yellow-400 fill-yellow-400" : "text-yellow-200 fill-yellow-100"
                  )}
                />
                {isHalf && (
                  <Star
                    className="h-6 w-6 text-yellow-400 fill-yellow-400 absolute inset-0"
                    style={{ clipPath: "inset(0 50% 0 0)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {userRating ? `${userRating}.0 / 5` : `${fixed} / 5`} -{" "}
          <span className="text-foreground font-semibold">{votes.toLocaleString()} votes</span>
        </span>
      </div>
    );
};

const FaqAccordion: React.FC<{ faqs: SeoFaq[] }> = ({ faqs }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    return (
        <div className="space-y-2">
            {faqs.map((faq, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                    <button
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/40 transition-colors"
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        aria-expanded={openIndex === i}
                    >
                        <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                        <ChevronDown
                            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", openIndex === i && "rotate-180")}
                        />
                    </button>
                    {openIndex === i && (
                        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                            {faq.a}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const ToolSeoSection: React.FC<ToolSeoSectionProps> = ({
    toolName,
    intro,
    features,
    steps,
    faqs,
    schemaName,
    schemaDescription,
}) => {
    const resolvedFeatures = features && features.length >= 6 ? features : getDynamicFeatures(toolName);
    const resolvedFaqs = faqs && faqs.length > 0 ? faqs : defaultFaqs;

    // JSON-LD structured data
    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": schemaName || toolName,
        "description": schemaDescription || intro,
        "applicationCategory": "UtilitiesApplication",
        "operatingSystem": "Web",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "url": typeof window !== "undefined" ? window.location.href : "",
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": resolvedFaqs.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a },
        })),
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": typeof window !== "undefined" ? window.location.origin : "" },
            { "@type": "ListItem", "position": 2, "name": toolName, "item": typeof window !== "undefined" ? window.location.href : "" },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            <div className="w-full px-6 pb-16 space-y-16 mt-12">
                
                {/* ── How it works ── */}
                <section>
                    <h2 className="text-2xl font-bold text-foreground text-center mb-8">How It Works</h2>
                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="hidden sm:block absolute top-6 left-[calc(16.67%)] right-[calc(16.67%)] border-t-2 border-dashed border-border" />
                        {steps.slice(0, 3).map((step, i) => (
                            <div key={i} className="relative flex flex-col items-center text-center flex-1 gap-3">
                                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-black shadow-lg shadow-primary/20 z-10">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Step {i + 1}</p>
                                    <p className="text-xs text-muted-foreground mt-1 mx-auto max-w-[200px]">{step}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Why MagicDOCX ── */}
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
                        {resolvedFeatures.map((feat, i) => (
                            <div key={i} className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl border-2 border-border flex items-center justify-center shrink-0 bg-background">
                                    <feat.icon className="h-7 w-7 text-foreground" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground mb-2">{feat.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section>
                    <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
                    <FaqAccordion faqs={resolvedFaqs} />
                </section>

                {/* ── Meet our full product family ── */}
                <section>
                    <h2 className="text-2xl font-bold text-foreground text-center mb-10">Meet our full product family</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 lg:gap-x-8 gap-y-10 mt-16 px-4">
                        {PRODUCT_FAMILY.map((column, idx) => (
                            <div key={idx} className="flex flex-col gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                                        {column.category}
                                    </h3>
                                    <div className="flex flex-col gap-1">
                                        {column.tools.map((tool) => (
                                            <a
                                                key={tool.name}
                                                href={tool.path}
                                                className={cn(
                                                    "group flex items-center gap-3 px-1 py-1.5 rounded-lg transition-all hover:bg-primary/5",
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
                                                    "bg-background border border-border group-hover:border-primary/20 shadow-sm"
                                                )}>
                                                    <tool.icon className={cn("h-4 w-4", tool.iconColor)} strokeWidth={2} />
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-bold leading-tight transition-colors",
                                                    "text-foreground/80 group-hover:text-primary"
                                                )}>
                                                    {tool.name}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Tutorials ── */}
                <section>
                    <h2 className="text-2xl font-bold text-foreground text-center mb-10">Tutorials on {toolName}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {getDynamicTutorials(toolName).map((article, i) => (
                            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow group">
                                <div className={cn("h-44 bg-gradient-to-br flex items-center justify-center", article.bg)}>
                                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                        <FileText className="h-8 w-8 text-white drop-shadow" />
                                    </div>
                                </div>
                                <div className="p-5 space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{article.category}</p>
                                    <h3 className="text-sm font-bold text-foreground leading-snug">{article.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{article.desc}</p>
                                    <a
                                        href={article.path}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-2 pt-1"
                                    >
                                        Read article <ChevronRight className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <a href="/blog" className="text-sm font-semibold text-primary hover:underline">Show more articles</a>
                    </div>
                </section>

                {/* ── Rate this tool ── */}
                <section>
                    <RatingBar />
                </section>

            </div>
        </>
    );
};

export default ToolSeoSection;
