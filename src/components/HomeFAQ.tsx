import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is MagicDOCX?",
    a: "MagicDOCX is a free online PDF toolkit that lets you merge, split, compress, convert, edit, protect, and work with PDF files. It also includes AI-powered tools like PDF Summarizer, Quiz Generator, Chat with PDF, ATS Resume Checker, and PDF Translator: all completely free."
  },
  {
    q: "Is MagicDOCX really free?",
    a: "Yes! All tools on MagicDOCX are 100% free with no hidden limits, no sign-ups, and no watermarks. You can use every tool as many times as you want."
  },
  {
    q: "Are my files safe and secure?",
    a: "Absolutely. Most PDF processing happens directly in your browser: your files are never uploaded to a server. For AI-powered features, files are processed securely and automatically deleted after use. We use encryption to protect all data transfers."
  },
  {
    q: "How do I merge PDF files?",
    a: "Simply go to the Merge PDF tool, upload two or more PDF files, arrange them in your preferred order, and click Merge. Your combined PDF will be ready to download instantly."
  },
  {
    q: "How do I compress a PDF without losing quality?",
    a: "Use our Compress PDF tool to reduce file size while maintaining document quality. Upload your PDF, and our compression algorithm will optimize it for the smallest possible size without visible quality loss."
  },
  {
    q: "Can I convert PDF to Word, Excel, or PowerPoint?",
    a: "Yes! MagicDOCX supports converting PDFs to Word (.docx), Excel (.csv), PowerPoint (.pptx), and JPG images. You can also convert these formats back to PDF."
  },
  {
    q: "What AI tools are available?",
    a: "MagicDOCX offers 5 AI-powered tools: PDF Summarizer (get instant summaries), Quiz Generator (create quizzes from documents), Chat with PDF (ask questions about your document), ATS Resume Checker (check your resume score), and Translate PDF (translate documents to other languages)."
  },
  {
    q: "How do I add a password to a PDF?",
    a: "Use the Protect PDF tool. Upload your PDF, set a password, and download the protected file. You can also use the Unlock PDF tool to remove passwords from PDFs you own."
  },
  {
    q: "Can I edit text in a PDF?",
    a: "Yes! Our Edit PDF tool lets you add text, shapes, and annotations to any PDF. You can also use Sign PDF to draw or type your signature, and Watermark to add text or image stamps."
  },
  {
    q: "What is OCR and how does it work?",
    a: "OCR (Optical Character Recognition) converts scanned images of text into searchable, selectable text. Our OCR PDF tool processes scanned PDFs so you can search, copy, and edit the text within them."
  },
  {
    q: "How do I split a PDF into separate pages?",
    a: "Go to the Split PDF tool, upload your document, choose which pages to separate, and download individual PDF files for each page or page range."
  },
  {
    q: "Can I compare two PDF documents?",
    a: "Yes! Use our Compare PDF tool to upload two documents and view them side by side. The tool extracts and displays text from both documents so you can spot differences easily."
  },
  {
    q: "What is PDF/A and why would I need it?",
    a: "PDF/A is an ISO-standardized version of PDF designed for long-term digital archiving. It ensures your document preserves its formatting and can be reliably opened in the future. Use our PDF to PDF/A tool to convert your files."
  },
  {
    q: "Do I need to create an account?",
    a: "No! MagicDOCX requires no sign-up or account creation. All tools are available immediately: just visit the tool page and start working with your PDFs."
  },
  {
    q: "What file size limits are there?",
    a: "Most tools support files up to 100MB. For AI-powered tools, the limit is 20MB per file. There are no limits on the number of files you can process."
  },
  {
    q: "Does MagicDOCX work on mobile devices?",
    a: "Yes! MagicDOCX is fully responsive and works on smartphones, tablets, and desktop computers. All tools are accessible from any modern web browser."
  },
];

const HomeFAQ = () => (
  <section className="border-t border-border bg-card py-16">
    <div className="container max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2 md:text-3xl">
        Frequently Asked Questions
      </h2>
      <p className="text-center text-muted-foreground mb-8">
        Everything you need to know about MagicDOCX
      </p>
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-secondary/30 px-5">
            <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline text-sm md:text-base">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export { faqs };
export default HomeFAQ;
