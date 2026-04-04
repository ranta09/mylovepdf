import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { tools, aiTools, categoryTextColors, categoryColors } from "@/lib/tools";
import { Helmet } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { getRecommendedTools, type ToolGroup } from "@/lib/fileDetection";
import { useGlobalUpload } from "@/components/GlobalUploadContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileBox, Cpu, Trophy, Lock, MonitorSmartphone,
  Wrench, Code2, Trash2, Cloud, HardDrive, Link2,
  Search, ChevronRight, X
} from "lucide-react";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "MagicDOCX",
  "url": "https://mylovepdf.lovable.app",
  "description": "Free online PDF tools: merge, split, compress, convert, edit, protect PDFs.",
  "applicationCategory": "Productivity",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "12500" },
};

const sitelinksJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MagicDOCX",
  "url": "https://mylovepdf.lovable.app",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://mylovepdf.lovable.app/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

const steps = [
  { id: 1, title: "Upload", desc: "Simply drag & drop or select the PDF, Word, or multimedia file you need to process natively." },
  { id: 2, title: "Start processing", desc: "Our advanced browser-based engine will manipulate, convert, or compress your file instantly." },
  { id: 3, title: "Download", desc: "Your optimized document is ready! Since MagicDOCX processes everything locally, your privacy is 100% guaranteed." }
];

const features = [
  { icon: Trophy, title: "The Premium Free PDF Toolkit", desc: "Whether you need to merge reports, edit text, or convert spreadsheets, MagicDOCX is your all-in-one productivity powerhouse designed for seamless document management." },
  { icon: Cpu, title: "AI-Powered PDF Intelligence", desc: "Beyond standard merging and splitting, MagicDOCX empowers you with cutting-edge AI. Summarize lengthy reports, generate interactive quizzes, bypass ATS filters, and translate documents instantly." },
  { icon: Lock, title: "Unhackable Local Privacy", desc: "Your data never leaves your device. MagicDOCX leverages WebAssembly to process your sensitive documents directly in your browser, guaranteeing absolute privacy without cloud uploads." },
  { icon: Trash2, title: "Zero Data Retention", desc: "Because processing happens directly on your device, there are no files left behind on external servers. You don't have to worry about manual deletion—your data simply never existed off-device." },
  { icon: MonitorSmartphone, title: "Cross-Platform Access", desc: "MagicDOCX runs flawlessly on Windows, macOS, Linux, and even mobile devices. Enjoy enterprise-grade PDF processing anywhere without downloading hefty software installations." },
  { icon: Wrench, title: "No Signup Required", desc: "Say goodbye to paywalls and premium subscriptions. MagicDOCX provides its entire suite of over 30 professional tools completely free of charge, with rapid processing and no restrictive limits." },
];

const Index = () => {
  const allTools = [...aiTools, ...tools];
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setGlobalFiles } = useGlobalUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<ToolGroup[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const recs = getRecommendedTools(files);
      setSelectedFile(files[0]);
      setSuggestions(recs);
      setShowSuggestions(true);
      setSearchQuery("");
    }
  };

  const filteredSuggestions = suggestions.map(group => ({
    ...group,
    tools: group.tools.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(group => group.tools.length > 0);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  useEffect(() => {
    const lastTool = sessionStorage.getItem("lastVisitedTool");
    if (lastTool) {
      sessionStorage.removeItem("lastVisitedTool");
    }
    // If a hash is present, scroll to that element; otherwise scroll to top
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <>
      <SEOHead
        title="MagicDOCX — Free PDF & DOCX Tools Online"
        description="Free online PDF tools: merge, split, compress, convert, edit, protect PDFs plus AI-powered summarizer and translator. No sign-up."
        canonicalUrl="/"
      />
      <Helmet>
        <meta name="keywords" content="PDF tools, merge PDF, split PDF, compress PDF, PDF to Word, convert PDF" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(sitelinksJsonLd)}</script>
      </Helmet>

      <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 bg-background">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[30%] h-[50%] rounded-full bg-primary/10 blur-[100px]" />
          <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        </div>
        <Navbar />
        
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          
          {/* ─── HERO SECTION ─── */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-card/60 backdrop-blur-3xl rounded-[2rem] border-2 border-dashed border-primary/25 p-10 md:p-32 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden mb-24 transition-all cursor-pointer group/hero hover:border-primary/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <span 
                className="relative z-10 flex items-baseline gap-0 font-heading tracking-tight select-none"
                style={{ letterSpacing: "-0.03em" }}
              >
                <span className="text-4xl md:text-5xl font-semibold text-foreground">Mag</span>
                <span className="relative text-4xl md:text-5xl font-semibold text-foreground">
                  <span className="invisible">i</span>
                  <span className="absolute inset-0 flex flex-col items-center">
                    <span className="text-primary animate-bounce text-[14px] leading-none" style={{ marginTop: "-2px" }}>✦</span>
                    <span className="text-foreground text-4xl md:text-5xl font-semibold leading-none" style={{ marginTop: "-4px" }}>ı</span>
                  </span>
                </span>
                <span className="text-4xl md:text-5xl font-semibold text-foreground">c</span>
                <span className="text-4xl md:text-5xl font-bold text-primary">DOCX</span>
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm md:text-base font-medium mb-10 max-w-lg">
              Edit, convert, merge, compress, and sign PDFs securely in your browser. Fully free, no signup required.
            </p>

            <div className="relative flex items-center justify-center w-[90%] max-w-[500px] bg-primary group-hover/hero:bg-primary/90 text-white font-bold text-lg md:text-xl py-4 md:py-5 rounded-full transition-all shadow-xl shadow-primary/25 group-active/hero:scale-[0.98]">
              <span className="flex items-center gap-2">
                <span className="text-[1.3rem] font-bold leading-none -mt-0.5">+</span> Choose file
              </span>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>


          </div>

          {/* ─── HOW TO CONVERT ─── */}
          <div className="mb-24">
            <h2 className="text-xl md:text-2.5xl font-extrabold text-center text-foreground mb-14 tracking-tight">
              Rapid Browser-Based Processing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14 text-center max-w-4xl mx-auto">
              {steps.map(step => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-6 shadow-md shadow-primary/20">
                    {step.id}
                  </div>
                  <h3 className="text-[1.05rem] font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-px bg-border/40 my-16 max-w-5xl mx-auto" />

          {/* ─── FEATURES GRID ─── */}
          <div className="mb-28 max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16">
            {features.map((feat, i) => (
              <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="mb-5">
                  <feat.icon className="h-[26px] w-[26px] text-foreground" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-3">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed block max-w-md">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* ─── MEET PRODUCT FAMILY ─── */}
          <div id="all-tools" className="mb-24">
            <h2 className="text-2xl font-extrabold text-center text-foreground mb-10 tracking-tight">
              Explore the MagicDOCX toolkit
            </h2>
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[10px] md:gap-4 max-w-[1100px] mx-auto">
              {allTools.map(tool => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="bg-card/60 backdrop-blur-3xl border border-border/60 hover:border-primary/40 rounded-2xl p-4 md:p-5 flex flex-col items-center text-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-black/5 group aspect-square"
                >
                  <div className={cn("transition-transform group-hover:scale-110 group-hover:-translate-y-1 duration-300", categoryTextColors[tool.category] || "text-primary")}>
                    <tool.icon className="h-[28px] w-[28px] md:h-[32px] md:w-[32px]" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] md:text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors leading-tight">
                    {tool.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>




          {/* ─── SUGGESTIONS DIALOG ─── */}
          <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
            <DialogContent className="max-w-lg w-[90vw] max-h-[85vh] bg-card rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden animate-slide-up flex flex-col">
              <div className="p-6 md:p-8 flex-1 overflow-hidden flex flex-col">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">
                    File Detected
                  </DialogTitle>
                </DialogHeader>

                {/* File Info Box */}
                <div className="bg-card dark:bg-zinc-900 border border-border/60 rounded-2xl p-4 flex items-center gap-4 mb-8 shadow-sm">
                  <div className="bg-primary/5 border border-primary/10 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-[10px] text-primary">
                    {selectedFile?.name.split('.').pop()?.toUpperCase() || "FILE"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground truncate mb-0.5">
                      {selectedFile?.name}
                    </p>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      {selectedFile ? formatSize(selectedFile.size) : ""}
                    </p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50" />
                  <Input 
                    placeholder="Search for a tool..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 h-12 bg-secondary/30 border-border/40 rounded-xl focus-visible:ring-primary/20 placeholder:text-muted-foreground/40 font-medium"
                  />
                </div>

                {/* Suggestions List */}
                <div className="space-y-8 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((group, idx) => (
                      <div key={idx} className="space-y-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">
                          {group.category}
                        </h3>
                        <div className="space-y-2">
                          {group.tools.map((tool) => (
                            <div
                              key={tool.id}
                              onClick={() => {
                                if (selectedFile) {
                                  setGlobalFiles([selectedFile]);
                                  setShowSuggestions(false);
                                  navigate(tool.path);
                                }
                              }}
                              className="group flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:border-primary/20 bg-card dark:bg-zinc-900 hover:bg-primary/[0.02] dark:hover:bg-primary/[0.05] transition-all hover:shadow-md hover:shadow-primary/5 active:scale-[0.99] cursor-pointer"
                            >
                              <div className={cn(
                                "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300",
                                categoryColors[tool.category] || "bg-primary text-white"
                              )}>
                                <tool.icon className="h-6 w-6" strokeWidth={2} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-bold text-foreground mb-0.5 group-hover:text-primary transition-colors">
                                  {tool.name}
                                </p>
                                <p className="text-[13px] font-medium text-muted-foreground line-clamp-1">
                                  {tool.description}
                                </p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground font-medium">No tools matching your search.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 text-center">
                  <button 
                    onClick={() => setShowSuggestions(false)}
                    className="text-[14px] font-semibold text-primary/80 hover:text-primary transition-colors"
                  >
                    Or <span className="underline underline-offset-4 decoration-primary/30">browse all tools</span>
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Index;
