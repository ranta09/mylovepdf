const BASE_URL = "https://magicdocx.com";

interface ToolSchema {
  softwareApplication: object;
  howTo: object;
}

const makeApp = (
  name: string,
  description: string,
  path: string
): object => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name,
  description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web",
  url: `${BASE_URL}${path}`,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
});

const makeHowTo = (
  name: string,
  steps: { name: string; text: string }[]
): object => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name,
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
  })),
});

export const toolSchemas: Record<string, ToolSchema> = {
  "/merge-pdf": {
    softwareApplication: makeApp(
      "Merge PDF",
      "Combine multiple PDF files into a single document online for free. Drag, drop, reorder, and merge instantly.",
      "/merge-pdf"
    ),
    howTo: makeHowTo("How to Merge PDF Files", [
      {
        name: "Upload your PDF files",
        text: "Click the upload area or drag and drop two or more PDF files onto the Merge PDF tool.",
      },
      {
        name: "Arrange the order",
        text: "Drag files or individual pages into the order you want them to appear in the merged document.",
      },
      {
        name: "Merge and download",
        text: "Click 'Merge PDF' and your combined PDF will download automatically to your device.",
      },
    ]),
  },

  "/split-pdf": {
    softwareApplication: makeApp(
      "Split PDF",
      "Split a PDF into multiple files or extract specific page ranges online for free. No software needed.",
      "/split-pdf"
    ),
    howTo: makeHowTo("How to Split a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to split into the tool.",
      },
      {
        name: "Choose split mode",
        text: "Select 'Split by Range' to define custom page ranges, or 'Extract Every Page' to get individual page files.",
      },
      {
        name: "Download your files",
        text: "Click 'Split PDF' and download the resulting files individually or as a ZIP archive.",
      },
    ]),
  },

  "/compress-pdf": {
    softwareApplication: makeApp(
      "Compress PDF",
      "Reduce PDF file size without losing quality. Choose strong, recommended, or professional compression online for free.",
      "/compress-pdf"
    ),
    howTo: makeHowTo("How to Compress a PDF", [
      {
        name: "Upload your PDF",
        text: "Drag and drop or click to upload one or more PDF files to the Compress PDF tool.",
      },
      {
        name: "Select a compression level",
        text: "Choose Strong, Recommended, or Professional compression. Optionally set a custom target file size.",
      },
      {
        name: "Download the compressed PDF",
        text: "Click 'Start Compression' and your optimized PDF will download automatically.",
      },
    ]),
  },

  "/pdf-to-word": {
    softwareApplication: makeApp(
      "PDF to Word Converter",
      "Convert PDF files to editable Word (DOCX) documents online for free. Accurate text extraction with layout preservation.",
      "/pdf-to-word"
    ),
    howTo: makeHowTo("How to Convert PDF to Word", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to convert to Word.",
      },
      {
        name: "Start the conversion",
        text: "Click 'Convert to Word' and the tool will extract text and preserve formatting automatically.",
      },
      {
        name: "Download the DOCX file",
        text: "Once conversion is complete, click 'Download' to save your editable Word document.",
      },
    ]),
  },

  "/word-to-pdf": {
    softwareApplication: makeApp(
      "Word to PDF Converter",
      "Convert Word documents (DOC, DOCX) to high-quality PDF online for free. Preserves tables, images, and formatting.",
      "/word-to-pdf"
    ),
    howTo: makeHowTo("How to Convert Word to PDF", [
      {
        name: "Upload your Word document",
        text: "Drag and drop or click to upload a DOC or DOCX file.",
      },
      {
        name: "Convert the document",
        text: "Click 'Convert to PDF'. The tool processes your file in the browser and preserves all formatting.",
      },
      {
        name: "Download the PDF",
        text: "Click 'Download' to save the generated PDF file to your device.",
      },
    ]),
  },

  "/pdf-to-excel": {
    softwareApplication: makeApp(
      "PDF to Excel Converter",
      "Convert PDF tables and data to Excel (XLSX) spreadsheets online for free. Fast and accurate data extraction.",
      "/pdf-to-excel"
    ),
    howTo: makeHowTo("How to Convert PDF to Excel", [
      {
        name: "Upload your PDF",
        text: "Click or drag and drop the PDF containing tables or data you want in Excel.",
      },
      {
        name: "Convert the file",
        text: "Click 'Convert to Excel'. The tool extracts structured data and tables from your PDF.",
      },
      {
        name: "Download the spreadsheet",
        text: "Download the XLSX file and open it in Excel or Google Sheets.",
      },
    ]),
  },

  "/excel-to-pdf": {
    softwareApplication: makeApp(
      "Excel to PDF Converter",
      "Convert Excel spreadsheets (XLSX, XLS) to PDF online for free. Preserves table formatting, colors, and data.",
      "/excel-to-pdf"
    ),
    howTo: makeHowTo("How to Convert Excel to PDF", [
      {
        name: "Upload your spreadsheet",
        text: "Click to upload or drag and drop your XLSX or XLS file into the tool.",
      },
      {
        name: "Convert the spreadsheet",
        text: "Click 'Convert to PDF'. The tool renders your spreadsheet preserving all table formatting.",
      },
      {
        name: "Download the PDF",
        text: "Download the resulting PDF file to share or archive your spreadsheet.",
      },
    ]),
  },

  "/pdf-to-ppt": {
    softwareApplication: makeApp(
      "PDF to PowerPoint Converter",
      "Convert PDF pages to editable PowerPoint (PPTX) slides online for free. Each page becomes a slide.",
      "/pdf-to-ppt"
    ),
    howTo: makeHowTo("How to Convert PDF to PowerPoint", [
      {
        name: "Upload your PDF",
        text: "Drag and drop or click to upload the PDF you want to convert to a presentation.",
      },
      {
        name: "Start the conversion",
        text: "Click 'Convert to PPT'. Each PDF page is rendered as a high-quality slide.",
      },
      {
        name: "Download the PPTX file",
        text: "Download your PowerPoint presentation and edit it in Microsoft PowerPoint or Google Slides.",
      },
    ]),
  },

  "/ppt-to-pdf": {
    softwareApplication: makeApp(
      "PowerPoint to PDF Converter",
      "Convert PowerPoint presentations (PPT, PPTX) to PDF online for free. Preserves layouts, images, and animations.",
      "/ppt-to-pdf"
    ),
    howTo: makeHowTo("How to Convert PowerPoint to PDF", [
      {
        name: "Upload your presentation",
        text: "Click to upload or drag and drop your PPT or PPTX file.",
      },
      {
        name: "Convert to PDF",
        text: "Click 'Convert to PDF'. The tool processes each slide and preserves all visual elements.",
      },
      {
        name: "Download the PDF",
        text: "Download the final PDF to share or print your presentation.",
      },
    ]),
  },

  "/pdf-to-jpg": {
    softwareApplication: makeApp(
      "PDF to JPG Converter",
      "Convert PDF pages to high-quality JPG images online for free. Download individual pages or a ZIP archive.",
      "/pdf-to-jpg"
    ),
    howTo: makeHowTo("How to Convert PDF to JPG", [
      {
        name: "Upload your PDF",
        text: "Click or drag and drop the PDF file you want to convert to images.",
      },
      {
        name: "Select image quality",
        text: "Choose the output resolution and quality level for your JPG images.",
      },
      {
        name: "Download the images",
        text: "Download individual JPG files for each page or get them all in a ZIP archive.",
      },
    ]),
  },

  "/jpg-to-pdf": {
    softwareApplication: makeApp(
      "JPG to PDF Converter",
      "Convert JPG and PNG images to a PDF document online for free. Combine multiple images into one PDF.",
      "/jpg-to-pdf"
    ),
    howTo: makeHowTo("How to Convert JPG to PDF", [
      {
        name: "Upload your images",
        text: "Drag and drop or click to upload one or more JPG, PNG, or image files.",
      },
      {
        name: "Arrange the images",
        text: "Reorder the uploaded images to set the page sequence in your PDF.",
      },
      {
        name: "Convert and download",
        text: "Click 'Convert to PDF' and download your completed PDF document.",
      },
    ]),
  },

  "/html-to-pdf": {
    softwareApplication: makeApp(
      "HTML to PDF Converter",
      "Convert web page URLs or HTML content to PDF online for free. Preserves CSS, fonts, images, and layouts.",
      "/html-to-pdf"
    ),
    howTo: makeHowTo("How to Convert a Web Page to PDF", [
      {
        name: "Enter the website URL",
        text: "Paste the full URL of the web page you want to convert into the URL input field.",
      },
      {
        name: "Adjust settings",
        text: "Choose page size, orientation, margins, and screen size to control how the page renders.",
      },
      {
        name: "Convert and download",
        text: "Click 'Convert to PDF' and download the generated PDF document.",
      },
    ]),
  },

  "/ocr-pdf": {
    softwareApplication: makeApp(
      "OCR PDF",
      "Make scanned PDFs searchable and selectable with AI-powered OCR. Supports multi-language text recognition.",
      "/ocr-pdf"
    ),
    howTo: makeHowTo("How to Use OCR on a PDF", [
      {
        name: "Upload your scanned PDF",
        text: "Click to upload or drag and drop the scanned or image-based PDF file.",
      },
      {
        name: "Select language",
        text: "Choose the language of the text in your document for accurate OCR recognition.",
      },
      {
        name: "Download the searchable PDF",
        text: "Click 'Run OCR' and download the fully searchable PDF or DOCX output.",
      },
    ]),
  },


  "/pdf-to-pdfa": {
    softwareApplication: makeApp(
      "PDF to PDF/A Converter",
      "Convert standard PDF files to PDF/A format for long-term archiving and compliance online for free.",
      "/pdf-to-pdfa"
    ),
    howTo: makeHowTo("How to Convert PDF to PDF/A", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to archive.",
      },
      {
        name: "Select the PDF/A standard",
        text: "Choose PDF/A-1b or another archival level appropriate for your compliance requirements.",
      },
      {
        name: "Convert and download",
        text: "Click 'Convert to PDF/A' and download the archived, standards-compliant file.",
      },
    ]),
  },

  "/edit-pdf": {
    softwareApplication: makeApp(
      "Edit PDF Online",
      "Add text, images, shapes, and annotations to any PDF online for free. Full in-browser PDF editor.",
      "/edit-pdf"
    ),
    howTo: makeHowTo("How to Edit a PDF Online", [
      {
        name: "Upload your PDF",
        text: "Click to upload the PDF file you want to edit. It will open in the editor.",
      },
      {
        name: "Add text, images, or annotations",
        text: "Use the toolbar to add text boxes, insert images, draw shapes, or highlight content.",
      },
      {
        name: "Save and download",
        text: "Click 'Save PDF' to apply your edits and download the updated document.",
      },
    ]),
  },

  "/rotate-pdf": {
    softwareApplication: makeApp(
      "Rotate PDF",
      "Rotate PDF pages individually or in bulk online for free. Permanent lossless rotation with custom range support.",
      "/rotate-pdf"
    ),
    howTo: makeHowTo("How to Rotate PDF Pages", [
      {
        name: "Upload your PDF",
        text: "Drag and drop or click to upload the PDF whose pages you want to rotate.",
      },
      {
        name: "Select pages and rotation",
        text: "Choose individual pages, all pages, or a custom range. Select 90°, 180°, or 270° rotation.",
      },
      {
        name: "Apply and download",
        text: "Click 'Rotate PDF' to apply the rotation permanently and download the result.",
      },
    ]),
  },

  "/add-watermark": {
    softwareApplication: makeApp(
      "Add Watermark to PDF",
      "Add text or image watermarks to PDF pages online for free. Customize position, opacity, and rotation.",
      "/add-watermark"
    ),
    howTo: makeHowTo("How to Add a Watermark to a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to watermark.",
      },
      {
        name: "Configure the watermark",
        text: "Enter text or upload an image. Adjust the font, size, color, opacity, position, and rotation.",
      },
      {
        name: "Apply and download",
        text: "Click 'Apply Watermark' and download the watermarked PDF.",
      },
    ]),
  },

  "/page-numbers": {
    softwareApplication: makeApp(
      "Add Page Numbers to PDF",
      "Add page numbers to PDF documents online for free. Customize font, position, format, and page range.",
      "/page-numbers"
    ),
    howTo: makeHowTo("How to Add Page Numbers to a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF you want to number.",
      },
      {
        name: "Customize the numbering",
        text: "Choose the position (header/footer), format (1, i, A), font, size, starting number, and page range.",
      },
      {
        name: "Apply and download",
        text: "Click 'Add Page Numbers' and download the updated PDF.",
      },
    ]),
  },

  "/crop-pdf": {
    softwareApplication: makeApp(
      "Crop PDF",
      "Crop PDF pages to remove margins or focus on specific content areas online for free. Interactive crop tool.",
      "/crop-pdf"
    ),
    howTo: makeHowTo("How to Crop PDF Pages", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to crop.",
      },
      {
        name: "Set the crop area",
        text: "Use the interactive preview to drag the crop handles and define the area to keep on each page.",
      },
      {
        name: "Apply and download",
        text: "Click 'Crop PDF' and download the cropped document.",
      },
    ]),
  },

  "/redact-pdf": {
    softwareApplication: makeApp(
      "Redact PDF",
      "Permanently redact and remove sensitive text and areas from PDF documents online for free.",
      "/redact-pdf"
    ),
    howTo: makeHowTo("How to Redact a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF containing sensitive information to redact.",
      },
      {
        name: "Mark areas for redaction",
        text: "Draw redaction boxes over text, images, or any area you want permanently removed.",
      },
      {
        name: "Apply redactions and download",
        text: "Click 'Apply Redactions' to permanently burn them into the PDF and download the secure document.",
      },
    ]),
  },

  "/compare-pdf": {
    softwareApplication: makeApp(
      "Compare PDF",
      "Compare two PDF documents side-by-side to detect differences in text, formatting, and content online for free.",
      "/compare-pdf"
    ),
    howTo: makeHowTo("How to Compare Two PDFs", [
      {
        name: "Upload both PDF files",
        text: "Upload the original PDF and the revised PDF side by side into the comparison tool.",
      },
      {
        name: "Run the comparison",
        text: "Click 'Compare' to analyze both documents and highlight differences in text and layout.",
      },
      {
        name: "Review and export",
        text: "Browse the highlighted changes in the side-by-side view and download the comparison report.",
      },
    ]),
  },

  "/flatten-pdf": {
    softwareApplication: makeApp(
      "Flatten PDF",
      "Flatten PDF form fields, annotations, and interactive elements into static content online for free.",
      "/flatten-pdf"
    ),
    howTo: makeHowTo("How to Flatten a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF with form fields or annotations to flatten.",
      },
      {
        name: "Choose flatten options",
        text: "Select whether to flatten form fields, annotations, or all interactive elements.",
      },
      {
        name: "Download the flattened PDF",
        text: "Click 'Flatten PDF' and download the static, printer-ready document.",
      },
    ]),
  },

  "/sign-pdf": {
    softwareApplication: makeApp(
      "Sign PDF Online",
      "Add your digital signature to any PDF online for free. Draw, type, or upload an image signature.",
      "/sign-pdf"
    ),
    howTo: makeHowTo("How to Sign a PDF Online", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF document you need to sign.",
      },
      {
        name: "Create your signature",
        text: "Draw your signature with a mouse or touch, type it, or upload a signature image.",
      },
      {
        name: "Place and download",
        text: "Drag your signature to the correct position on the page, then click 'Download' to save the signed PDF.",
      },
    ]),
  },

  "/protect-pdf": {
    softwareApplication: makeApp(
      "Protect PDF with Password",
      "Add password protection to your PDF online for free. Set open and permissions passwords with AES-256 encryption.",
      "/protect-pdf"
    ),
    howTo: makeHowTo("How to Password-Protect a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to protect.",
      },
      {
        name: "Set a password",
        text: "Enter an open password and optionally set permissions to restrict printing, copying, or editing.",
      },
      {
        name: "Download the protected PDF",
        text: "Click 'Protect PDF' and download the AES-256 encrypted document.",
      },
    ]),
  },

  "/unlock-pdf": {
    softwareApplication: makeApp(
      "Unlock PDF",
      "Remove the open password from a protected PDF online for free. Instantly unlock PDFs you own.",
      "/unlock-pdf"
    ),
    howTo: makeHowTo("How to Unlock a PDF", [
      {
        name: "Upload your protected PDF",
        text: "Click to upload or drag and drop the password-protected PDF file.",
      },
      {
        name: "Enter the password",
        text: "Type the current password to authorize the removal of protection.",
      },
      {
        name: "Download the unlocked PDF",
        text: "Click 'Unlock PDF' and download the unrestricted document.",
      },
    ]),
  },

  "/organize-pdf": {
    softwareApplication: makeApp(
      "Organize PDF Pages",
      "Reorder, delete, rotate, and insert pages in your PDF online for free with drag-and-drop.",
      "/organize-pdf"
    ),
    howTo: makeHowTo("How to Organize PDF Pages", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF file you want to reorganize.",
      },
      {
        name: "Rearrange the pages",
        text: "Drag page thumbnails to reorder them. Use the controls to rotate, delete, or duplicate pages.",
      },
      {
        name: "Save and download",
        text: "Click 'Save PDF' to apply your changes and download the reorganized document.",
      },
    ]),
  },

  "/delete-pages": {
    softwareApplication: makeApp(
      "Delete PDF Pages",
      "Remove specific pages from a PDF online for free. Select pages individually or by range.",
      "/delete-pages"
    ),
    howTo: makeHowTo("How to Delete Pages from a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF you want to remove pages from.",
      },
      {
        name: "Select pages to delete",
        text: "Click on page thumbnails to select them for deletion, or enter a page range.",
      },
      {
        name: "Delete and download",
        text: "Click 'Delete Pages' and download the PDF with the selected pages removed.",
      },
    ]),
  },

  "/extract-pages": {
    softwareApplication: makeApp(
      "Extract PDF Pages",
      "Extract specific pages from a PDF into a new file or individual PDFs online for free.",
      "/extract-pages"
    ),
    howTo: makeHowTo("How to Extract Pages from a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF you want to extract pages from.",
      },
      {
        name: "Select pages to extract",
        text: "Click page thumbnails or enter specific page numbers and ranges to extract.",
      },
      {
        name: "Extract and download",
        text: "Click 'Extract Pages' and download the extracted pages as a new PDF or separate files.",
      },
    ]),
  },

  "/repair-pdf": {
    softwareApplication: makeApp(
      "Repair PDF",
      "Fix corrupted or damaged PDF files online for free. Advanced structural recovery with automatic diagnostics.",
      "/repair-pdf"
    ),
    howTo: makeHowTo("How to Repair a Corrupted PDF", [
      {
        name: "Upload your damaged PDF",
        text: "Click to upload or drag and drop the corrupted or broken PDF file.",
      },
      {
        name: "Run the repair",
        text: "Click 'Repair PDF'. The tool automatically detects and fixes structural issues.",
      },
      {
        name: "Download the fixed PDF",
        text: "Download the repaired PDF and verify that your content has been successfully recovered.",
      },
    ]),
  },

  "/pdf-summarizer": {
    softwareApplication: makeApp(
      "AI PDF Summarizer",
      "Summarize PDF documents, Word files, and presentations instantly with AI. Get key insights and study notes for free.",
      "/pdf-summarizer"
    ),
    howTo: makeHowTo("How to Summarize a PDF with AI", [
      {
        name: "Upload your document",
        text: "Click to upload or drag and drop a PDF, Word, PowerPoint, or other document file.",
      },
      {
        name: "Choose summary style",
        text: "Select a summary tone (concise, detailed, bullet points) best suited to your document type.",
      },
      {
        name: "Read or download the summary",
        text: "Review the AI-generated summary on screen, then copy or download it as a text or PDF file.",
      },
    ]),
  },

  "/quiz-generator": {
    softwareApplication: makeApp(
      "AI Quiz Generator",
      "Generate quizzes and flashcards from PDFs, notes, and YouTube videos using AI for free.",
      "/quiz-generator"
    ),
    howTo: makeHowTo("How to Generate a Quiz from a PDF", [
      {
        name: "Upload your study material",
        text: "Upload a PDF, paste text, or enter a YouTube URL as the source for your quiz.",
      },
      {
        name: "Configure the quiz",
        text: "Choose the number of questions, difficulty level, and question type (MCQ or true/false).",
      },
      {
        name: "Take or export the quiz",
        text: "Start the interactive quiz in your browser or download it as a PDF for offline use.",
      },
    ]),
  },

  "/chat-with-pdf": {
    softwareApplication: makeApp(
      "Chat with PDF",
      "Ask questions about your PDF documents using AI. Upload a file and get instant, accurate answers.",
      "/chat-with-pdf"
    ),
    howTo: makeHowTo("How to Chat with a PDF", [
      {
        name: "Upload your PDF",
        text: "Click to upload or drag and drop the PDF document you want to query.",
      },
      {
        name: "Ask a question",
        text: "Type your question in the chat box, for example, 'What are the key conclusions?' or 'Summarize chapter 3'.",
      },
      {
        name: "Get instant AI answers",
        text: "The AI reads your document and responds with accurate, context-aware answers in seconds.",
      },
    ]),
  },

  "/ats-checker": {
    softwareApplication: makeApp(
      "ATS Resume Checker",
      "Scan your resume for ATS compatibility, get a score, keyword analysis, and expert improvement tips for free.",
      "/ats-checker"
    ),
    howTo: makeHowTo("How to Check Your Resume with ATS Checker", [
      {
        name: "Upload your resume",
        text: "Click to upload your resume in PDF, DOCX, or TXT format.",
      },
      {
        name: "Paste the job description",
        text: "Paste the target job description so the AI can compare your resume against it.",
      },
      {
        name: "Review your ATS score",
        text: "Get a detailed ATS compatibility score, missing keywords, and actionable suggestions to improve your resume.",
      },
    ]),
  },

  "/translate-pdf": {
    softwareApplication: makeApp(
      "Translate PDF",
      "Translate PDF documents and Word files into 65+ languages using AI while preserving formatting and layout.",
      "/translate-pdf"
    ),
    howTo: makeHowTo("How to Translate a PDF", [
      {
        name: "Upload your document",
        text: "Click to upload or drag and drop the PDF, Word, or other document you want to translate.",
      },
      {
        name: "Choose the target language",
        text: "Select the language you want to translate into from the list of 65+ supported languages.",
      },
      {
        name: "Download the translation",
        text: "Click 'Translate' and download the translated document as a PDF, DOCX, or TXT file.",
      },
    ]),
  },
};
