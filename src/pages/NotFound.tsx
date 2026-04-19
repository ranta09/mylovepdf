import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEOHead
        title="Page Not Found, MagicDOCX"
        description="The page you're looking for doesn't exist. Go back to MagicDOCX to use free PDF and document tools."
      />
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex min-h-screen flex-col bg-background selection:bg-primary/30 relative overflow-hidden">
        <Navbar />
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2" />
        
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto mb-8 relative"
          >
            {/* Custom 404 SVG Illustration */}
            <svg viewBox="0 0 600 400" className="w-full h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="300" cy="200" r="160" fill="currentColor" className="text-secondary/60" />
              <path d="M250 160 C250 140, 230 140, 230 160 C230 180, 270 180, 270 200 C270 220, 250 220, 250 200" stroke="currentColor" className="text-primary/40" strokeWidth="12" strokeLinecap="round" />
              <path d="M350 160 C350 140, 370 140, 370 160 C370 180, 330 180, 330 200 C330 220, 350 220, 350 200" stroke="currentColor" className="text-primary/40" strokeWidth="12" strokeLinecap="round" />
              
              <rect x="230" y="250" width="140" height="20" rx="10" fill="currentColor" className="text-muted-foreground/30" />
              
              <text x="50%" y="60%" dominantBaseline="middle" textAnchor="middle" className="text-[120px] font-bold fill-foreground font-display opacity-90 tracking-tighter" style={{ transform: 'translateY(-20px)' }}>
                404
              </text>
              
              {/* Floating stars/elements */}
              <circle cx="150" cy="100" r="6" fill="currentColor" className="text-primary/60 animate-pulse" />
              <circle cx="450" cy="90" r="8" fill="currentColor" className="text-amber-500/60 animate-bounce" style={{ animationDuration: "3s" }} />
              <circle cx="480" cy="300" r="12" fill="currentColor" className="text-blue-500/40 animate-pulse" style={{ animationDelay: "1s" }} />
              <path d="M120 280 L130 300 L110 300 Z" fill="currentColor" className="text-primary/50" transform="rotate(45 120 290)" />
            </svg>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="mb-4 text-3xl md:text-5xl font-bold font-display tracking-tight text-foreground">
              Page not found
            </h1>
            <p className="mb-10 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              We couldn't find the page you were looking for. It might have been moved, deleted, or possibly never existed.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/20" asChild>
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" /> Go Home
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full bg-background/50 backdrop-blur-sm" asChild>
                <Link to="/#tools">
                  <Search className="mr-2 h-4 w-4" /> Browse All Tools
                </Link>
              </Button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default NotFound;
