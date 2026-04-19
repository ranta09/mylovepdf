import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { tools, aiTools } from "@/lib/tools";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Search, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const ToolsPage = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const allTools = [...tools, ...aiTools];

    const filteredTools = allTools.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Helmet>
                <title>All PDF & AI Tools - MagicDOCX</title>
                <meta name="description" content="Explore our complete suite of free online PDF and AI document tools. Merge, split, compress, convert, and analyze your documents instantly." />
            </Helmet>

            <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30">
                <Navbar />
                
                <main className="flex-1 pb-20">
                    {/* Header Section */}
                    <section className="bg-secondary/30 border-b border-border py-20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 rounded-full blur-[120px] pointer-events-none translate-x-1/3" />
                        
                        <div className="container relative z-10 text-center max-w-3xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                                    <LayoutGrid className="h-4 w-4" /> Tool Directory
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-foreground">
                                    Every tool you need for documents.
                                </h1>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    100% Free. No sign-up. 100% Private. Browse our complete collection of document processing and AI extraction tools.
                                </p>
                                
                                <div className="max-w-md mx-auto relative mt-8">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                        type="text"
                                        placeholder="Search all tools..."
                                        className="pl-12 h-14 rounded-2xl border-border bg-background shadow-lg shadow-black/5 text-lg"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </section>

                    {/* Tools Grid */}
                    <section className="container py-16">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTools.map((tool, idx) => (
                                <motion.div
                                    key={tool.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                >
                                    <Link 
                                        to={tool.path}
                                        className="group flex flex-col h-full p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                            <tool.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {tool.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                                            {tool.description}
                                        </p>
                                        <div className="mt-6 flex items-center text-xs font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Try it now →
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                        
                        {filteredTools.length === 0 && (
                            <div className="text-center py-20 grayscale opacity-50">
                                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <p className="text-lg font-medium">No tools match your search.</p>
                            </div>
                        )}
                    </section>
                </main>
                
                <Footer />
            </div>
        </>
    );
};

export default ToolsPage;
