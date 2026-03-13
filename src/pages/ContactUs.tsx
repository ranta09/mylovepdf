import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Mail, MessageSquare, Send, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ContactUs = () => {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            fullName: formData.get("fullName") as string,
            email: formData.get("email") as string,
            subject: formData.get("subject") as string,
            message: formData.get("message") as string,
        };

        setLoading(true);
        try {
            const { error } = await supabase.functions.invoke("send-contact", {
                body: data,
            });

            if (error) {
                console.error("Supabase Function Error:", error);
                throw error;
            }

            toast.success("Message sent! We'll get back to you soon.");
            e.currentTarget.reset();
        } catch (err) {
            console.error("Submission Failure Detail:", err);
            toast.error("Failed to send message. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ToolLayout
            title="Contact Us"
            description="We'd love to hear from you. Get in touch with the MagicDOCX team."
            metaTitle="Contact Us - MagicDOCX"
            metaDescription="Have questions or feedback about MagicDOCX? Contact us here. We're always looking to improve our PDF and AI tools."
            category="edit"
            icon={<Mail className="h-7 w-7" />}
        >
            <div className="grid gap-12 md:grid-cols-2">
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold text-foreground">Get in Touch</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Have a question about one of our tools? Found a bug? Or maybe you have a suggestion for
                            a new AI feature? Our team is ready to help.
                        </p>
                    </section>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Email</p>
                                <p className="text-sm text-muted-foreground">support@magicdocx.com</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors">
                                <MessageSquare className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Support</p>
                                <p className="text-sm text-muted-foreground">Available 24/7 for bug reports</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors">
                                <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-foreground">Location</p>
                                <p className="text-sm text-muted-foreground font-medium">Delhi, India</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-border bg-card p-8 shadow-card overflow-hidden">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Full Name</label>
                            <Input name="fullName" placeholder="John Doe" required className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Email Address</label>
                            <Input name="email" type="email" placeholder="john@example.com" required className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Subject</label>
                            <Input name="subject" placeholder="How can we help?" required className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Message</label>
                            <Textarea
                                name="message"
                                placeholder="Tell us more about your inquiry..."
                                required
                                className="rounded-xl min-h-[120px] resize-none"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl py-6 font-bold gap-2 shadow-lg shadow-primary/20"
                        >
                            {loading ? "Sending..." : <><Send className="h-4 w-4" /> Send Message</>}
                        </Button>
                    </form>
                </div>
            </div>
        </ToolLayout>
    );
};

export default ContactUs;
