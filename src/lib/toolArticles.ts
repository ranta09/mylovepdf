import { Zap, Shield, Globe, Sparkles, FileText, Lock, Eye, Layers, type LucideIcon } from "lucide-react";

export interface ToolFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface ToolArticle {
  features: ToolFeature[];
  howTo: string[];
}

const defaultFeatures: ToolFeature[] = [
  { icon: Zap, title: "Fast & Free", desc: "Process your files instantly in the browser — no waiting, no sign-ups, no cost." },
  { icon: Shield, title: "Secure Processing", desc: "Your files never leave your device. All processing happens locally in your browser for maximum privacy." },
  { icon: Globe, title: "Works Everywhere", desc: "Use on any device — desktop, tablet, or phone. No software installation needed." },
];

const toolArticles: Record<string, ToolArticle> = {
  merge: {
    features: [
      { icon: Zap, title: "Instant PDF Merging", desc: "Combine multiple PDF files into one document in seconds — no file limits, no watermarks." },
      { icon: Layers, title: "Preserve Quality", desc: "All pages retain their original formatting, images, fonts, and layout after merging." },
      { icon: Shield, title: "100% Browser-Based", desc: "Your files are processed entirely in your browser. Nothing is uploaded to any server." },
    ],
    howTo: [
      "Click 'Select PDF files' to upload two or more PDFs.",
      "Drag to reorder the files in your preferred sequence.",
      "Click 'Merge' and download your combined PDF instantly.",
    ],
  },
  split: {
    features: [
      { icon: Zap, title: "Split by Page Range", desc: "Extract specific pages or ranges from your PDF into a new, smaller document." },
      { icon: FileText, title: "Keep Original Quality", desc: "Split pages retain all formatting, images, and text from the original PDF." },
      { icon: Shield, title: "Private & Secure", desc: "Everything runs in your browser — no files are uploaded to external servers." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Enter the page numbers or range you want to extract.",
      "Click 'Split' and download the new PDF with your selected pages.",
    ],
  },
  compress: {
    features: [
      { icon: Zap, title: "Smart Compression", desc: "Reduce PDF file size significantly while maintaining readable quality for text and images." },
      { icon: FileText, title: "No Visible Quality Loss", desc: "Our algorithm optimizes internal structures without degrading the visual appearance of your document." },
      { icon: Shield, title: "Offline Processing", desc: "Compression happens entirely in your browser — your files stay on your device." },
    ],
    howTo: [
      "Upload your PDF file.",
      "The tool automatically compresses it using smart optimization.",
      "Download the smaller PDF — ready to share or upload.",
    ],
  },
  "pdf-to-jpg": {
    features: [
      { icon: Zap, title: "High-Resolution Output", desc: "Each PDF page is converted to a crisp, high-quality JPG image suitable for presentations or sharing." },
      { icon: Layers, title: "Batch Conversion", desc: "All pages are converted at once and packaged into a convenient ZIP file for easy download." },
      { icon: Shield, title: "Browser-Based", desc: "No server uploads — your PDF is rendered and converted entirely on your device." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Each page is automatically converted to a JPG image.",
      "Download all images as a ZIP file.",
    ],
  },
  "jpg-to-pdf": {
    features: [
      { icon: Zap, title: "Multiple Image Support", desc: "Upload several JPG or PNG images and combine them into a single, organized PDF document." },
      { icon: Layers, title: "Maintain Image Quality", desc: "Images are embedded at their original resolution — no compression or quality loss." },
      { icon: Shield, title: "No Upload Required", desc: "Images are processed locally in your browser for complete privacy." },
    ],
    howTo: [
      "Select one or more JPG or PNG images.",
      "Arrange them in the order you want.",
      "Click 'Convert' and download your new PDF.",
    ],
  },
  "pdf-to-word": {
    features: [
      { icon: Zap, title: "Quick Conversion", desc: "Turn a PDF into an editable Word document in seconds — fast, free, and ready for download." },
      { icon: FileText, title: "Text Extraction", desc: "Extracts all selectable text from your PDF and formats it into a clean .docx document." },
      { icon: Shield, title: "Safe & Private", desc: "Your files are processed entirely in the browser. No data is sent to any server." },
    ],
    howTo: [
      "Upload your PDF file.",
      "The tool extracts text content from the document.",
      "Download the converted Word (.docx) file.",
    ],
  },
  "word-to-pdf": {
    features: [
      { icon: Zap, title: "Instant Conversion", desc: "Convert text documents to PDF format in seconds with preserved formatting." },
      { icon: FileText, title: "Multiple Format Support", desc: "Supports .docx and .txt files for seamless conversion to PDF." },
      { icon: Shield, title: "Completely Private", desc: "All conversion happens in your browser — no files leave your device." },
    ],
    howTo: [
      "Upload your Word or text document.",
      "The tool converts it to a properly formatted PDF.",
      "Download your new PDF file instantly.",
    ],
  },
  "pdf-to-ppt": {
    features: [
      { icon: Zap, title: "PDF to Slides", desc: "Each PDF page becomes a slide in your PowerPoint presentation, ready for editing." },
      { icon: Layers, title: "Visual Fidelity", desc: "Pages are rendered as high-quality images on each slide to preserve the original layout." },
      { icon: Shield, title: "No Server Processing", desc: "Your document is converted entirely in the browser for maximum security." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Each page is converted into a PowerPoint slide.",
      "Download the .pptx file and edit in PowerPoint or Google Slides.",
    ],
  },
  "ppt-to-pdf": {
    features: [
      { icon: Zap, title: "Slides to PDF", desc: "Convert presentation slide images into a polished PDF document for easy sharing." },
      { icon: Layers, title: "Preserve Layout", desc: "Each slide image is placed on its own page maintaining the original dimensions." },
      { icon: Shield, title: "Browser-Based", desc: "No uploads to external servers — everything is processed on your device." },
    ],
    howTo: [
      "Upload your slide images (JPG or PNG format).",
      "Each image becomes a page in the PDF.",
      "Download the combined PDF presentation.",
    ],
  },
  "pdf-to-excel": {
    features: [
      { icon: Zap, title: "Table Extraction", desc: "Extract structured data and tables from PDFs into CSV format compatible with Excel and Google Sheets." },
      { icon: FileText, title: "Clean Data Output", desc: "Text content is organized into rows and columns for easy spreadsheet editing." },
      { icon: Shield, title: "Private Processing", desc: "Your financial data and documents stay on your device — nothing is uploaded." },
    ],
    howTo: [
      "Upload your PDF with tables or data.",
      "The tool extracts text and tabular content.",
      "Download the CSV file and open it in Excel.",
    ],
  },
  "excel-to-pdf": {
    features: [
      { icon: Zap, title: "Spreadsheet to PDF", desc: "Convert CSV data into a professionally formatted PDF table document." },
      { icon: FileText, title: "Clean Table Formatting", desc: "Data is rendered with proper table borders, headers, and cell formatting." },
      { icon: Shield, title: "Secure Conversion", desc: "All processing runs locally — your spreadsheet data never leaves your browser." },
    ],
    howTo: [
      "Upload your CSV or spreadsheet file.",
      "The tool formats the data into a PDF table.",
      "Download the formatted PDF document.",
    ],
  },
  edit: {
    features: [
      { icon: Zap, title: "Add Text Annotations", desc: "Click anywhere on your PDF to add text overlays with custom font size and color." },
      { icon: Layers, title: "Visual Page Preview", desc: "See your PDF pages rendered as images so you can precisely position annotations." },
      { icon: Shield, title: "In-Browser Editor", desc: "No plugins or software needed — edit directly in your web browser." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Click on any page to add text annotations.",
      "Customize font size and color, then download the edited PDF.",
    ],
  },
  rotate: {
    features: [
      { icon: Zap, title: "Quick Rotation", desc: "Rotate all pages in your PDF by 90°, 180°, or 270° with a single click." },
      { icon: Layers, title: "Lossless Operation", desc: "Rotation is a metadata change — no re-encoding means zero quality loss." },
      { icon: Shield, title: "Offline Processing", desc: "Your PDF is rotated entirely in the browser. No files are sent anywhere." },
    ],
    howTo: [
      "Upload your PDF file.",
      "Select the rotation angle (90°, 180°, or 270°).",
      "Click 'Rotate' and download the corrected PDF.",
    ],
  },
  watermark: {
    features: [
      { icon: Zap, title: "Custom Text Watermark", desc: "Add branded or confidential text stamps with customizable size, color, opacity, and angle." },
      { icon: Layers, title: "All Pages at Once", desc: "Your watermark is applied consistently to every page of the document." },
      { icon: Shield, title: "Private & Secure", desc: "Watermarking happens in your browser — documents never leave your device." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Enter watermark text and customize appearance.",
      "Download the watermarked PDF.",
    ],
  },
  protect: {
    features: [
      { icon: Lock, title: "Password Protection", desc: "Add a password to your PDF so only authorized people can open and view it." },
      { icon: Shield, title: "Standard Encryption", desc: "Uses standard PDF encryption to secure your documents against unauthorized access." },
      { icon: Zap, title: "Instant Protection", desc: "Set a password and download the protected file in seconds — no waiting." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Enter a strong password.",
      "Download the password-protected PDF.",
    ],
  },
  unlock: {
    features: [
      { icon: Lock, title: "Remove Password", desc: "Unlock your password-protected PDF by entering the current password to create a restriction-free copy." },
      { icon: Shield, title: "Secure Process", desc: "Your password and document are processed locally — nothing is sent to any server." },
      { icon: Zap, title: "Quick & Easy", desc: "Enter the password, click unlock, and download your unrestricted PDF." },
    ],
    howTo: [
      "Upload your protected PDF.",
      "Enter the current password.",
      "Download the unlocked, restriction-free PDF.",
    ],
  },
  "page-numbers": {
    features: [
      { icon: Zap, title: "Flexible Positioning", desc: "Place page numbers at the top or bottom, aligned left, center, or right on every page." },
      { icon: FileText, title: "Custom Numbering", desc: "Choose your starting page number and format to match your document needs." },
      { icon: Shield, title: "Browser Processing", desc: "Numbers are added locally — your document stays on your device." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Choose position and starting number.",
      "Download the numbered PDF.",
    ],
  },
  organize: {
    features: [
      { icon: Zap, title: "Drag & Drop Reorder", desc: "Visually rearrange pages with an intuitive drag-and-drop interface." },
      { icon: Layers, title: "Page Thumbnails", desc: "See thumbnail previews of every page so you know exactly what you're moving." },
      { icon: Shield, title: "In-Browser Tool", desc: "All page manipulation happens locally — your document never leaves your device." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Drag pages to reorder or click to remove them.",
      "Download the reorganized PDF.",
    ],
  },
  repair: {
    features: [
      { icon: Zap, title: "Fix Corrupted PDFs", desc: "Repair broken PDF structures by re-serializing the document with a clean internal format." },
      { icon: FileText, title: "Recover Content", desc: "Attempts to recover as much text, images, and formatting as possible from damaged files." },
      { icon: Shield, title: "Safe Recovery", desc: "Your corrupted file is processed locally — no uploads to external services." },
    ],
    howTo: [
      "Upload your corrupted or broken PDF.",
      "The tool re-serializes the internal structure.",
      "Download the repaired PDF file.",
    ],
  },
  "delete-pages": {
    features: [
      { icon: Zap, title: "Select & Remove", desc: "Preview all pages and choose exactly which ones to remove from your document." },
      { icon: Layers, title: "Visual Selection", desc: "See page thumbnails so you can confidently select the right pages to delete." },
      { icon: Shield, title: "Non-Destructive", desc: "Your original file stays unchanged — a new PDF is created without the selected pages." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Select the pages you want to remove.",
      "Download the PDF without those pages.",
    ],
  },
  "extract-pages": {
    features: [
      { icon: Zap, title: "Pull Specific Pages", desc: "Extract individual pages or ranges into a new, smaller PDF document." },
      { icon: Layers, title: "Visual Page Selection", desc: "Preview pages before extracting so you always get the right content." },
      { icon: Shield, title: "Original Unchanged", desc: "A new PDF is created with your selected pages — the original remains intact." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Select the pages you want to extract.",
      "Download a new PDF containing only those pages.",
    ],
  },
  "sign-pdf": {
    features: [
      { icon: Zap, title: "Draw or Type Signature", desc: "Create your signature by drawing on a canvas or typing — place it anywhere on your PDF." },
      { icon: Eye, title: "Visual Placement", desc: "See your PDF pages and position your signature exactly where it needs to go." },
      { icon: Shield, title: "Private Signing", desc: "Your signature and document are processed entirely in your browser." },
    ],
    howTo: [
      "Upload the PDF you need to sign.",
      "Draw or type your signature on the canvas.",
      "Position it on the page and download the signed PDF.",
    ],
  },
  "crop-pdf": {
    features: [
      { icon: Zap, title: "Custom Crop Area", desc: "Define exact crop boundaries to trim margins and remove unwanted whitespace from your PDF." },
      { icon: Layers, title: "Uniform Cropping", desc: "Crop settings are applied consistently across all pages for a uniform look." },
      { icon: Shield, title: "Browser-Based", desc: "Cropping happens locally — your document stays on your device." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Set the crop margins (top, bottom, left, right).",
      "Download the cropped PDF.",
    ],
  },
  "redact-pdf": {
    features: [
      { icon: Eye, title: "Black Out Sensitive Info", desc: "Permanently redact confidential information by drawing black boxes over sensitive areas." },
      { icon: Shield, title: "Permanent Redaction", desc: "Redacted areas are permanently blacked out and cannot be recovered from the downloaded file." },
      { icon: Zap, title: "Visual Redaction", desc: "Preview pages and precisely select areas to redact with click-and-drag." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Draw rectangles over the areas you want to redact.",
      "Download the permanently redacted PDF.",
    ],
  },
  "flatten-pdf": {
    features: [
      { icon: Layers, title: "Merge All Layers", desc: "Flatten form fields, annotations, and layers into a single, non-editable PDF layer." },
      { icon: FileText, title: "Universal Compatibility", desc: "Flattened PDFs display consistently across all viewers and devices." },
      { icon: Shield, title: "Local Processing", desc: "Your document is flattened entirely in the browser — nothing is uploaded." },
    ],
    howTo: [
      "Upload your PDF with form fields or annotations.",
      "Click 'Flatten' to merge all layers.",
      "Download the flattened, non-editable PDF.",
    ],
  },
  "html-to-pdf": {
    features: [
      { icon: Globe, title: "Any Webpage to PDF", desc: "Enter any URL and convert the webpage into a downloadable PDF document." },
      { icon: FileText, title: "Capture Full Content", desc: "The tool renders the page and captures the visible content as a PDF." },
      { icon: Zap, title: "Quick Conversion", desc: "Just paste a URL and get your PDF — no complicated settings needed." },
    ],
    howTo: [
      "Enter the URL of the webpage you want to convert.",
      "Click 'Convert' and wait for the page to be rendered.",
      "Download the generated PDF document.",
    ],
  },
  "ocr-pdf": {
    features: [
      { icon: Eye, title: "Text Recognition", desc: "Convert scanned images of text into searchable, selectable text using OCR technology." },
      { icon: FileText, title: "Make PDFs Searchable", desc: "Transform image-based PDFs so you can search, copy, and extract text content." },
      { icon: Zap, title: "Instant Processing", desc: "Upload your scanned PDF and get searchable text extracted in seconds." },
    ],
    howTo: [
      "Upload your scanned or image-based PDF.",
      "The OCR engine recognizes and extracts text.",
      "Download the searchable PDF or copy the extracted text.",
    ],
  },
  "pdf-to-pdfa": {
    features: [
      { icon: FileText, title: "Archival Standard", desc: "Convert your PDF to PDF/A — the ISO standard for long-term document preservation." },
      { icon: Layers, title: "Preserve Formatting", desc: "Your document's formatting is maintained while embedding all fonts and resources." },
      { icon: Shield, title: "Compliance Ready", desc: "Meet regulatory and archival requirements with PDF/A-compliant documents." },
    ],
    howTo: [
      "Upload your PDF document.",
      "The tool converts it to PDF/A archival format.",
      "Download the PDF/A-compliant file.",
    ],
  },
  "compare-pdf": {
    features: [
      { icon: Eye, title: "Side-by-Side View", desc: "View two PDFs side by side to quickly spot differences in text and layout." },
      { icon: FileText, title: "Text Comparison", desc: "Extracted text from both documents is displayed for easy visual comparison." },
      { icon: Zap, title: "Quick Analysis", desc: "Upload two files and instantly see their content compared." },
    ],
    howTo: [
      "Upload two PDF documents.",
      "The tool extracts and displays text from both files.",
      "Review the side-by-side comparison to spot differences.",
    ],
  },
  "ai-summarizer": {
    features: [
      { icon: Sparkles, title: "AI-Powered Summaries", desc: "Get concise notes, bullet points, and key highlights from any PDF using advanced AI." },
      { icon: FileText, title: "Multiple Formats", desc: "Choose between short summaries, detailed notes, or structured bullet points." },
      { icon: Zap, title: "Instant Results", desc: "Upload your document and receive a summary in seconds — perfect for quick review." },
    ],
    howTo: [
      "Upload your PDF document.",
      "AI analyzes the content and identifies key points.",
      "Read, copy, or download your AI-generated summary.",
    ],
  },
  "ai-quiz": {
    features: [
      { icon: Sparkles, title: "AI Question Generation", desc: "Automatically create multiple-choice questions from your study materials and documents." },
      { icon: FileText, title: "Perfect for Studying", desc: "Generate practice quizzes from textbook chapters, notes, or any educational PDF." },
      { icon: Zap, title: "Instant Quiz Creation", desc: "Upload a document and get a complete quiz with answers in seconds." },
    ],
    howTo: [
      "Upload your study material or document.",
      "Choose the number of questions to generate.",
      "AI creates a quiz with questions, options, and explanations.",
    ],
  },
  "ai-chat": {
    features: [
      { icon: Sparkles, title: "Chat With Your Document", desc: "Ask questions about your PDF and get accurate, context-aware answers from AI." },
      { icon: FileText, title: "Deep Understanding", desc: "AI reads and understands your entire document to provide relevant, precise answers." },
      { icon: Zap, title: "Conversational Interface", desc: "Have a natural conversation — ask follow-up questions and explore your document interactively." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Type a question about the document content.",
      "Get instant AI-powered answers based on your PDF.",
    ],
  },
  "ai-ats": {
    features: [
      { icon: Sparkles, title: "ATS Compatibility Score", desc: "Get a detailed score showing how well your resume passes automated screening systems." },
      { icon: FileText, title: "Actionable Feedback", desc: "Receive specific tips on keywords, formatting, and structure to improve your resume." },
      { icon: Zap, title: "Instant Analysis", desc: "Upload your resume and get comprehensive ATS feedback in seconds." },
    ],
    howTo: [
      "Upload your resume PDF.",
      "Optionally paste the job description for targeted analysis.",
      "Review your ATS score and improvement suggestions.",
    ],
  },
  "ai-translate": {
    features: [
      { icon: Sparkles, title: "AI Translation", desc: "Translate your PDF content to any language using advanced AI language models." },
      { icon: Globe, title: "Multiple Languages", desc: "Support for Spanish, French, German, Chinese, Japanese, Arabic, Hindi, and many more." },
      { icon: Zap, title: "Fast & Accurate", desc: "Get high-quality translations in seconds while preserving document meaning." },
    ],
    howTo: [
      "Upload your PDF document.",
      "Select the target language from the dropdown.",
      "AI translates the text and displays the result.",
    ],
  },
};

export default toolArticles;
