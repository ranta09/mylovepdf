import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    Zap, ShieldCheck, Monitor, Star, ChevronDown, ChevronRight,
    LucideIcon, Lock, Clock, CheckCircle2, Globe, Cpu,
    ArrowRight
} from "lucide-react";
import { type ToolCategory, categoryColors } from "@/lib/tools";
import { cn } from "@/lib/utils";

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
    relatedTools: SeoRelatedTool[];
    formats: string[];
    faqs?: SeoFaq[];
    schemaName?: string;
    schemaDescription?: string;
}

const defaultFeatures: SeoFeature[] = [
    { icon: Zap, title: "Fast Processing", desc: "Convert and process files in seconds directly in your browser: no server queues." },
    { icon: ShieldCheck, title: "Secure File Handling", desc: "Your files are processed locally or with encrypted transfers and are never stored." },
    { icon: Star, title: "High-Quality Output", desc: "Industry-standard algorithms ensure maximum fidelity and accuracy in every result." },
    { icon: Monitor, title: "Works on All Devices", desc: "Fully responsive: use it on desktop, tablet, or mobile without installing anything." },
];

const defaultFaqs: SeoFaq[] = [
    { q: "Is this tool free to use?", a: "Yes, MagicDocx tools are completely free to use. There are no hidden fees, no subscriptions required, and no sign-up needed for most tools." },
    { q: "Are my files secure?", a: "Absolutely. All file transfers use HTTPS encryption. Files processed in the browser never leave your device. Server-processed files are automatically deleted within minutes after processing." },
    { q: "Do you store my uploaded files?", a: "No. MagicDocx does not permanently store your files. Any server-side processed files are automatically deleted shortly after your download. Your privacy is our priority." },
    { q: "Can I use this tool on mobile?", a: "Yes! MagicDocx is fully responsive and works on any modern smartphone or tablet browser: iOS Safari, Android Chrome, and more. No app installation required." },
    { q: "What is the maximum file size supported?", a: "Most tools support files up to 100 MB. For very large files, we recommend compressing them first or splitting them into smaller parts before processing." },
];

const FAQ: React.FC<{ faqs: SeoFaq[] }> = ({ faqs }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    return (
        <div className="space-y-3">
            {faqs.map((faq, i) => (
                <div key={i} className="border border-border rounded-2xl overflow-hidden bg-background">
                    <button
                        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-secondary/20 transition-colors"
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        aria-expanded={openIndex === i}
                    >
                        <span className="text-sm font-bold text-foreground">{faq.q}</span>
                        <ChevronDown
                            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", openIndex === i && "rotate-180")}
                        />
                    </button>
                    {openIndex === i && (
                        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
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
    category,
    intro,
    features,
    steps,
    relatedTools,
    formats,
    faqs,
    schemaName,
    schemaDescription,
}) => {
    const resolvedFeatures = features && features.length > 0 ? features : defaultFeatures;
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

    const colorCls = categoryColors[category]; // e.g. "bg-tool-merge text-white"

    return (
        <>
            {/* JSON-LD Structured Data */}
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

            <div className="mt-16 space-y-16 pb-16">

                {/* ── SECTION 1: INTRO ── */}
                <section aria-labelledby="seo-intro-heading">
                    <div className="max-w-3xl">
                        <h1 id="seo-intro-heading" className="font-display text-3xl md:text-4xl font-black text-foreground tracking-tight mb-5">
                            {toolName} | Free Online PDF Tool
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                            {intro}
                        </p>
                    </div>
                </section>

                {/* Divider */}
                <div className="border-t border-border border-dashed" />

                {/* ── SECTION 2: KEY FEATURES ── */}
                <section aria-labelledby="seo-features-heading">
                    <h2 id="seo-features-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        Key Features
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {resolvedFeatures.map((feat, i) => (
                            <div
                                key={i}
                                className="p-5 rounded-2xl border border-border bg-background hover:border-primary/30 hover:shadow-sm transition-all duration-300 group"
                            >
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0", colorCls)}>
                                    <feat.icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-sm font-black text-foreground mb-1.5 tracking-tight">{feat.title}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 3: HOW TO USE ── */}
                <section aria-labelledby="seo-howto-heading">
                    <h2 id="seo-howto-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        How to Use This Tool
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {steps.map((step, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-background"
                            >
                                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black", colorCls)}>
                                    {i + 1}
                                </div>
                                <p className="text-sm text-foreground font-medium leading-snug pt-0.5">{step}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 4: WHY MAGICDOCX ── */}
                <section aria-labelledby="seo-why-heading" className="rounded-2xl border border-border bg-secondary/10 p-8 md:p-10">
                    <h2 id="seo-why-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-5">
                        Why Use MagicDocx
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                MagicDocx is a free, browser-based toolkit that lets you work with PDFs, Office documents, and images
                                without downloading any software. All tools run at high speed and are built to handle files of all
                                types: whether you're converting a PDF to Word for editing, compressing a heavy document before
                                emailing, or merging reports into a single file.
                            </p>
                        </div>
                        <div>
                            <ul className="space-y-3">
                                {[
                                    { icon: Zap, label: "Instant processing: results in seconds" },
                                    { icon: Globe, label: "100% browser-based: no installation needed" },
                                    { icon: ShieldCheck, label: "Encrypted file handling and auto-deletion" },
                                    { icon: Cpu, label: "High-quality output using modern algorithms" },
                                    { icon: Clock, label: "Available 24/7, completely free" },
                                ].map(({ icon: Icon, label }, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        {label}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── SECTION 5: SUPPORTED FORMATS ── */}
                <section aria-labelledby="seo-formats-heading">
                    <h2 id="seo-formats-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        Supported File Formats
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        {formats.map((fmt, i) => (
                            <div
                                key={i}
                                className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-black uppercase tracking-widest text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-colors"
                            >
                                {fmt}
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── SECTION 6: FILE SECURITY ── */}
                <section aria-labelledby="seo-security-heading" className="rounded-2xl border border-border bg-background p-8 md:p-10">
                    <div className="flex items-start gap-5">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", colorCls)}>
                            <Lock className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 id="seo-security-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
                                Your Files Are Secure
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                                We take your privacy and data security seriously. All file uploads use HTTPS encryption to ensure your
                                documents are protected during transit. For browser-based tools, your files never leave your device at
                                all: processing happens entirely on your computer. For server-side operations, uploaded files are stored
                                in isolated temporary environments and are permanently deleted within minutes after processing. We do not
                                read, share, or analyze your file content in any way. MagicDocx does not retain any personal data or
                                document metadata from your sessions. Your trust is the foundation of our service.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ── SECTION 7: FAQ ── */}
                <section aria-labelledby="seo-faq-heading">
                    <h2 id="seo-faq-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                        Frequently Asked Questions
                    </h2>
                    <FAQ faqs={resolvedFaqs} />
                </section>

                {/* ── SECTION 8: RELATED TOOLS ── */}
                {relatedTools.length > 0 && (
                    <section aria-labelledby="seo-related-heading">
                        <h2 id="seo-related-heading" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-6">
                            Related Tools
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {relatedTools.map((rt, i) => (
                                <Link
                                    key={i}
                                    to={rt.path}
                                    className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-background hover:border-primary/30 hover:shadow-sm transition-all duration-300 group"
                                >
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", colorCls)}>
                                        <rt.icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex-1">{rt.name}</span>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            </div>
        </>
    );
};

export default ToolSeoSection;
