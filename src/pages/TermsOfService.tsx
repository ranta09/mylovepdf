import ToolLayout from "@/components/ToolLayout";
import { FileText, AlertCircle, Scale, ShieldAlert } from "lucide-react";

const TermsOfService = () => {
    return (
        <ToolLayout
            title="Terms of Service"
            description="The rules and guidelines for using MagicDOCX."
            metaTitle="Terms of Service - MagicDOCX"
            metaDescription="Read our terms of service to understand the rules and guidelines for using our suite of PDF and AI tools."
            category="edit"
            icon={<FileText className="h-7 w-7" />}
        >
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-8">
                <section>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <FileText className="h-5 w-5 text-primary" />
                        1. Acceptance of Terms
                    </h2>
                    <p>
                        By accessing and using MagicDOCX (the "Service"), you agree to be bound by these Terms of Service.
                        If you do not agree to these terms, please do not use our Service.
                    </p>
                </section>

                <section>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Scale className="h-4 w-4 text-primary" />
                        2. Description of Service
                    </h3>
                    <p>
                        MagicDOCX provides a suite of online tools for PDF manipulation and AI-based document analysis.
                        Most tools function locally in your browser, while AI tools require processing via encrypted API connections.
                    </p>
                </section>

                <section>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        3. User Conduct and Content
                    </h3>
                    <p>
                        You are solely responsible for the content of the documents you process using MagicDOCX.
                        You agree not to use the Service for any illegal activities or to process content that violates
                        third-party rights.
                    </p>
                </section>

                <section className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-700 dark:text-amber-400 mt-0">
                        <ShieldAlert className="h-4 w-4" />
                        4. Disclaimer of Warranties
                    </h3>
                    <p className="mb-0 text-amber-800/80 dark:text-amber-400/80">
                        The Service is provided "as is" and "as available" without any warranties of any kind.
                        MagicDOCX does not guarantee that the Service will be uninterrupted, secure, or error-free.
                        We are not responsible for any data loss resulting from the use of our tools.
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-foreground">5. Limitation of Liability</h3>
                    <p>
                        In no event shall MagicDOCX or its operators be liable for any direct, indirect, incidental,
                        special, or consequential damages resulting from the use or inability to use the Service.
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-semibold text-foreground">6. Modifications to Service</h3>
                    <p>
                        We reserve the right to modify or discontinue the Service (or any part thereof) with or without
                        notice at any time.
                    </p>
                </section>

                <section className="text-sm text-muted-foreground border-t border-border pt-6">
                    <p>Last updated: March 13, 2026</p>
                </section>
            </div>
        </ToolLayout>
    );
};

export default TermsOfService;
