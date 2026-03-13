import ToolLayout from "@/components/ToolLayout";
import { Info, Target, Heart, ShieldCheck, Globe } from "lucide-react";

const AboutUs = () => {
    return (
        <ToolLayout
            title="About Us"
            description="Learn about our mission to democratize document tools."
            metaTitle="About Us - MagicDOCX"
            metaDescription="MagicDOCX is a suite of free, secure, and AI-powered document tools designed to help you work smarter and faster."
            category="edit"
            icon={<Info className="h-7 w-7" />}
        >
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-12">
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                            <Info className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground m-0">Our Story</h2>
                    </div>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                        MagicDOCX was born out of a simple frustration: document tools are either too expensive,
                        too slow, or too invasive with privacy. We wanted to build a platform that is
                        <strong> 100% free</strong>, <strong>lightning fast</strong>, and <strong>inherently private</strong>.
                    </p>
                </section>

                <div className="grid gap-8 md:grid-cols-2">
                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-bold text-foreground">
                            <Target className="h-5 w-5 text-primary" />
                            Our Mission
                        </h3>
                        <p>
                            To democratize advanced document processing. We believe that everyone should have access to
                            professional-grade tools for merging, splitting, compressing, and analyzing documents without
                            being locked behind a paywall or a sign-up form.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h3 className="flex items-center gap-2 text-xl font-bold text-foreground">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Privacy First
                        </h3>
                        <p>
                            We've pioneered "Browser-Based Processing" where your files never even hit our servers.
                            By doing the heavy lifting right in your browser, we ensure your data stays where it belongs:
                            with you.
                        </p>
                    </section>
                </div>

                <section className="bg-secondary/30 p-8 rounded-3xl border border-border text-center">
                    <div className="flex justify-center mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <Heart className="h-7 w-7 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">Built for You</h3>
                    <p className="max-w-xl mx-auto mb-0">
                        Whether you're a student summarizing a thesis, a professional optimizing a resume,
                        or a business owner translating a contract, MagicDOCX is built to save you time and
                        hassle every single day.
                    </p>
                </section>

                <section className="space-y-4">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-foreground">
                        <Globe className="h-5 w-5 text-primary" />
                        A Global Toolset
                    </h3>
                    <p>
                        With support for over 12 languages on our interface and 65+ languages in our translation engine,
                        we are building for a global audience. We are constantly adding new tools and improving our
                        AI algorithms to stay at the cutting edge of document technology.
                    </p>
                </section>
            </div>
        </ToolLayout>
    );
};

export default AboutUs;
