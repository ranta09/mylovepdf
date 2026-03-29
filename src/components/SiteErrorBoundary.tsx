import React, { ErrorInfo, Component, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children?: ReactNode;
  toolName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryCore extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Crash caught in ${this.props.toolName}:`, error, errorInfo);
  }

  private handleReset = () => {
    // Reset internal state
    this.setState({ hasError: false, error: null });
    // Reload safely clears any corrupted Web Worker / WASM memory (pdf.js/canvas)
    window.location.reload(); 
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-card border border-border/50 rounded-3xl p-8 shadow-elevated relative overflow-hidden"
          >
            {/* Soft decorative glow */}
            <div className="absolute top-0 inset-x-0 h-40 bg-rose-500/5 blur-[50px] pointer-events-none" />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 mb-6 border border-rose-500/20">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>

            <h2 className="text-2xl font-display font-bold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-8">
              The <strong className="text-foreground">{this.props.toolName}</strong> tool encountered an unexpected error and had to stop. Don't worry, your files are secure.
            </p>

            {/* Error Message Snippet (Hidden in prod ideally, but helpful for debugging) */}
            {this.state.error?.message && (
              <div className="bg-secondary/50 rounded-xl p-3 mb-8 text-left border border-border">
                <p className="text-xs font-mono text-muted-foreground truncate" title={this.state.error.message}>
                  Error: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={this.handleReset} className="w-full gap-2 rounded-xl shadow-lg shadow-primary/20">
                <RefreshCcw className="h-4 w-4" /> Try Again
              </Button>
              <Button variant="ghost" size="lg" onClick={() => window.location.href = '/'} className="w-full gap-2 rounded-xl hover:bg-secondary">
                <Home className="h-4 w-4" /> Go to Homepage
              </Button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional Wrapper to inject `useLocation` routing context into the class component.
 * We pass `key={location.pathname}` so that the boundary fully unmounts and remounts
 * whenever the user successfully navigates away, clearing lingering error states automatically.
 */
export const SiteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  
  // Format tool name neatly from pathname: "/merge-pdf" -> "Merge Pdf"
  const path = location.pathname.replace(/^\//, '');
  const toolName = path
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Platform';

  return (
    <ErrorBoundaryCore toolName={toolName} key={location.pathname}>
      {children}
    </ErrorBoundaryCore>
  );
};
