import ToolLayout from "@/components/ToolLayout";
import { Shield, Lock, Eye, Cookie, Trash2 } from "lucide-react";

const PrivacyPolicy = () => {
    return (
        <ToolLayout
            title="Privacy Policy"
            description="How we protect your data and privacy at MagicDOCX."
            metaTitle="Privacy Policy - MagicDOCX"
            metaDescription="Read our privacy policy to understand how we handle your data. We prioritize your privacy with browser-based processing."
            category="edit"
            icon={<Shield className="h-7 w-7" />}
        >
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-8">
                <section>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <Shield className="h-5 w-5 text-primary" />
                        Our Privacy Commitment
                    </h2>
                    <p>
                        At MagicDOCX, we take your privacy seriously. Our primary goal is to provide powerful document tools
                        while ensuring your data never leaves your control. Unlike many other online PDF tools, most of our
                        processing happens directly in your web browser.
                    </p>
                </section>

                <section className="bg-secondary/30 p-6 rounded-2xl border border-border">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground mt-0">
                        <Lock className="h-4 w-4 text-primary" />
                        Browser-Based Processing
                    </h3>
                    <p className="mb-0">
                        Most of our tools (Merge, Split, Compress, Convert, Edit, etc.) use <strong>client-side processing</strong>.
                        This means your files are processed on your own computer using your browser's resources. Your documents
                        are <strong>never uploaded to our servers</strong> for these tasks.
                    </p>
                </section>

                <section>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Eye className="h-4 w-4 text-primary" />
                        AI Tool Data Handling
                    </h3>
                    <p>
                        For AI-powered tools (Summarizer, Chat, Quiz Generator, Translation, ATS Checker), we use secure
                        API connections to process the text content.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Temporary Storage:</strong> Content is temporarily stored only during the processing phase.</li>
                        <li><strong>Automatic Deletion:</strong> All processed data and files are automatically deleted after 1 hour of inactivity.</li>
                        <li><strong>No Training:</strong> Your data is never used to train AI models.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Cookie className="h-4 w-4 text-primary" />
                        Cookies and Analytics
                    </h3>
                    <p>
                        We use minimal cookies to provide a better user experience and analyze site traffic.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Essential Cookies:</strong> Used for language preferences and tool settings.</li>
                        <li><strong>Analytics:</strong> We use Google Analytics to understand how visitors use our site. This data is anonymized.</li>
                        <li><strong>Advertising:</strong> We may use Google AdSense to show ads. AdSense uses cookies to serve ads based on a user's previous visits.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Trash2 className="h-4 w-4 text-primary" />
                        Data Deletion
                    </h3>
                    <p>
                        If you use our cloud-based tools, you can manually trigger data deletion at any time by clearing your
                        browser cache or using the "Reset" buttons provided in the tools. Regardless, our system performs
                        automated cleanup every hour.
                    </p>
                </section>

                <section className="text-sm text-muted-foreground border-t border-border pt-6">
                    <p>Last updated: March 13, 2026</p>
                    <p>If you have any questions, please contact us at support@magicdocx.com</p>
                </section>
            </div>
        </ToolLayout>
    );
};

export default PrivacyPolicy;
