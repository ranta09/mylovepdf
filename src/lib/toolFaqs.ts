export interface ToolFaq {
  q: string;
  a: string;
}

const toolFaqs: Record<string, ToolFaq[]> = {
  merge: [
    { q: "How do I merge PDF files?", a: "Upload two or more PDF files, arrange them in your preferred order, and click Merge. Your combined PDF will be ready to download instantly." },
    { q: "Is there a limit on the number of PDFs I can merge?", a: "No, you can merge as many PDF files as you want. There's no file count limit." },
    { q: "Will merging PDFs affect the quality?", a: "No. The merge process preserves all original formatting, images, and text quality." },
  ],
  split: [
    { q: "How do I split a PDF into separate pages?", a: "Upload your document, choose which pages to separate, and download individual PDF files for each page or page range." },
    { q: "Can I split a PDF into custom page ranges?", a: "Yes! You can specify exact page numbers or ranges to create separate PDF files from your document." },
    { q: "Does splitting a PDF reduce quality?", a: "No, splitting preserves the original quality of each page." },
  ],
  compress: [
    { q: "How do I compress a PDF without losing quality?", a: "Upload your PDF and our compression algorithm will optimize it for the smallest possible size without visible quality loss." },
    { q: "How much can a PDF be compressed?", a: "Compression results vary depending on the content. PDFs with images typically see 50-80% size reduction, while text-heavy documents may see 10-30%." },
    { q: "Is the compressed PDF still readable?", a: "Absolutely. Our compression maintains document readability and visual quality while reducing file size." },
  ],
  "pdf-to-jpg": [
    { q: "How do I convert PDF pages to JPG?", a: "Upload your PDF and each page will be converted to a high-quality JPG image that you can download." },
    { q: "What resolution are the output JPG images?", a: "Images are generated at high resolution (typically 150-300 DPI) to maintain clarity and readability." },
    { q: "Can I convert specific pages to JPG?", a: "Yes, you can select which pages to convert rather than converting the entire document." },
  ],
  "jpg-to-pdf": [
    { q: "How do I convert images to PDF?", a: "Upload one or more images (JPG, PNG) and they'll be combined into a single PDF document." },
    { q: "Can I arrange the image order in the PDF?", a: "Yes, you can reorder images before converting them to PDF." },
    { q: "What image formats are supported?", a: "We support JPG, JPEG, and PNG image formats for conversion to PDF." },
  ],
  "pdf-to-word": [
    { q: "How accurate is PDF to Word conversion?", a: "Our tool extracts text content from PDFs with high accuracy. Complex layouts with tables and images are preserved as closely as possible." },
    { q: "Can I edit the converted Word document?", a: "Yes! The output is a standard .docx file that you can edit in Microsoft Word, Google Docs, or any compatible word processor." },
    { q: "Does it preserve formatting?", a: "Text content and basic formatting are preserved. Complex layouts may require minor adjustments after conversion." },
  ],
  "word-to-pdf": [
    { q: "How do I convert a Word document to PDF?", a: "Upload your .docx or .txt file and it will be instantly converted to a PDF document." },
    { q: "Is the formatting preserved?", a: "Yes, text formatting and structure are maintained during the conversion process." },
    { q: "What file types can I convert to PDF?", a: "You can convert .docx and .txt files to PDF format." },
  ],
  "pdf-to-ppt": [
    { q: "How does PDF to PowerPoint conversion work?", a: "Each page of your PDF is converted into a slide in a PowerPoint presentation, preserving the visual layout." },
    { q: "Can I edit the converted slides?", a: "Yes, the output is a standard .pptx file that you can edit in PowerPoint or Google Slides." },
    { q: "Is the text editable in the converted presentation?", a: "Text content is extracted and placed as editable text boxes on each slide." },
  ],
  "ppt-to-pdf": [
    { q: "How do I convert PowerPoint to PDF?", a: "Upload your .pptx file and each slide will be converted into a page in the resulting PDF document." },
    { q: "Are animations preserved in the PDF?", a: "PDFs are static documents, so animations are not preserved. Each slide is captured as a static page." },
    { q: "What PowerPoint formats are supported?", a: "We support .pptx format for conversion to PDF." },
  ],
  "pdf-to-excel": [
    { q: "Can I extract tables from a PDF?", a: "Yes! Our tool extracts text and tabular data from PDFs and exports them as CSV files that open in Excel." },
    { q: "How accurate is the table extraction?", a: "The tool works best with well-structured tables. Complex or merged cells may need minor adjustments." },
    { q: "What format is the output?", a: "The output is a CSV file that can be opened in Microsoft Excel, Google Sheets, or any spreadsheet application." },
  ],
  "excel-to-pdf": [
    { q: "How do I convert Excel to PDF?", a: "Upload your .xlsx or .csv file and it will be converted into a formatted PDF document." },
    { q: "Is the table formatting preserved?", a: "Yes, the table structure and data are preserved in the PDF output." },
    { q: "What spreadsheet formats are supported?", a: "We support .xlsx and .csv file formats." },
  ],
  edit: [
    { q: "What can I do with the PDF editor?", a: "You can add text, shapes, and annotations to any PDF page. Change font size, color, and position of added elements." },
    { q: "Can I edit existing text in a PDF?", a: "You can add new text overlays on top of existing content. Direct editing of embedded text requires OCR capabilities." },
    { q: "Are my edits saved permanently?", a: "Yes, when you download the edited PDF, all your changes are permanently embedded in the document." },
  ],
  rotate: [
    { q: "How do I rotate PDF pages?", a: "Upload your PDF, select the pages you want to rotate, choose the rotation angle (90°, 180°, 270°), and download the result." },
    { q: "Can I rotate individual pages?", a: "Yes, you can rotate all pages or select specific pages to rotate independently." },
    { q: "Does rotation affect document quality?", a: "No, rotation is a lossless operation that preserves all content quality." },
  ],
  watermark: [
    { q: "How do I add a watermark to a PDF?", a: "Upload your PDF, enter your watermark text, customize its appearance (size, color, opacity, rotation), and download the watermarked PDF." },
    { q: "Can I add image watermarks?", a: "Currently, the tool supports text watermarks. You can customize the text, size, color, and transparency." },
    { q: "Is the watermark applied to all pages?", a: "Yes, the watermark is applied consistently across all pages of your PDF." },
  ],
  protect: [
    { q: "How do I password-protect a PDF?", a: "Upload your PDF, set a password, and download the protected file. Anyone opening the file will need the password." },
    { q: "How strong is the encryption?", a: "We use standard PDF encryption to protect your documents. Choose a strong password for maximum security." },
    { q: "Can I remove the password later?", a: "Yes, use our Unlock PDF tool to remove the password if you know the current password." },
  ],
  unlock: [
    { q: "How do I unlock a password-protected PDF?", a: "Upload your protected PDF, enter the current password, and download the unlocked version." },
    { q: "Can I unlock a PDF without the password?", a: "No, you need to know the current password to unlock a PDF. This ensures document security." },
    { q: "Is it legal to unlock a PDF?", a: "You should only unlock PDFs that you own or have permission to access. Our tool is designed for legitimate use." },
  ],
  "page-numbers": [
    { q: "How do I add page numbers to a PDF?", a: "Upload your PDF, choose the position and format for page numbers, and download the numbered PDF." },
    { q: "Can I customize the page number format?", a: "Yes, you can choose the position (top/bottom, left/center/right) and starting number." },
    { q: "Does it work with existing page numbers?", a: "The tool adds new page numbers as overlays. If your PDF already has page numbers, you may want to remove them first." },
  ],
  organize: [
    { q: "How do I rearrange pages in a PDF?", a: "Upload your PDF, drag and drop pages to reorder them, remove unwanted pages, and download the reorganized PDF." },
    { q: "Can I add pages from another PDF?", a: "The organize tool focuses on reordering and removing pages. To add pages from another PDF, use the Merge tool." },
    { q: "Is the original PDF modified?", a: "No, a new PDF is created with your changes. The original file remains unchanged." },
  ],
  repair: [
    { q: "What types of PDF issues can be repaired?", a: "Our tool can fix common issues like corrupted headers, broken cross-references, and damaged page structures." },
    { q: "Will repair recover lost content?", a: "The tool attempts to recover as much content as possible, but severely corrupted files may have unrecoverable data." },
    { q: "How long does repair take?", a: "Most repairs complete within seconds. Larger or more damaged files may take slightly longer." },
  ],
  "delete-pages": [
    { q: "How do I delete specific pages from a PDF?", a: "Upload your PDF, select the pages you want to remove, and download the updated PDF without those pages." },
    { q: "Can I undo page deletion?", a: "The original file is not modified. If you need the deleted pages back, simply re-upload the original PDF." },
    { q: "Is there a limit on pages I can delete?", a: "You can delete as many pages as you want, as long as at least one page remains in the document." },
  ],
  "extract-pages": [
    { q: "How do I extract pages from a PDF?", a: "Upload your PDF, select the pages you want to extract, and download a new PDF containing only those pages." },
    { q: "Can I extract multiple page ranges?", a: "Yes, you can select individual pages or ranges to create a new PDF from specific sections." },
    { q: "Does extraction affect the original PDF?", a: "No, a new PDF is created with the selected pages. The original file remains unchanged." },
  ],
  "sign-pdf": [
    { q: "How do I add a signature to a PDF?", a: "Upload your PDF, draw or type your signature on the canvas, position it on the page, and download the signed PDF." },
    { q: "Is the digital signature legally binding?", a: "Our tool adds a visual signature to the PDF. For legally binding digital signatures, you may need a certificate-based signing service." },
    { q: "Can I save my signature for reuse?", a: "Currently, signatures are created per session. You'll need to draw or type your signature each time." },
  ],
  "crop-pdf": [
    { q: "How do I crop a PDF?", a: "Upload your PDF, select the area you want to keep using the crop tool, and download the cropped PDF." },
    { q: "Can I crop different pages differently?", a: "The crop settings are applied uniformly to all pages. For per-page cropping, process each page separately." },
    { q: "Does cropping remove the hidden content?", a: "Cropping adjusts the visible area of the PDF. The cropped content may still exist in the file but won't be visible." },
  ],
  "redact-pdf": [
    { q: "How does PDF redaction work?", a: "Upload your PDF, draw black boxes over the sensitive information you want to hide, and download the redacted PDF." },
    { q: "Is redacted information permanently removed?", a: "Yes, redacted areas are permanently blacked out in the downloaded PDF and cannot be recovered." },
    { q: "Can I redact specific text?", a: "You can visually select areas to redact by drawing over them. The tool blacks out the selected regions." },
  ],
  "flatten-pdf": [
    { q: "What does flattening a PDF mean?", a: "Flattening merges all layers, form fields, and annotations into a single flat layer, making the PDF non-editable." },
    { q: "Why would I flatten a PDF?", a: "Flattening ensures the document looks the same everywhere, prevents further editing, and can reduce file size." },
    { q: "Can I unflatten a PDF?", a: "No, flattening is permanent. Keep a copy of the original if you may need to edit it later." },
  ],
  "html-to-pdf": [
    { q: "How do I convert a webpage to PDF?", a: "Enter the URL of the webpage you want to convert and we'll generate a PDF version of the page." },
    { q: "Does it capture the full page?", a: "The tool captures the visible content of the webpage as rendered in a browser." },
    { q: "Can I convert any website?", a: "Most public webpages can be converted. Pages that require login or have heavy JavaScript may not render perfectly." },
  ],
  "ocr-pdf": [
    { q: "What is OCR?", a: "OCR (Optical Character Recognition) converts scanned images of text into searchable, selectable text in your PDF." },
    { q: "How accurate is the OCR?", a: "OCR accuracy depends on the quality of the scanned document. Clear, high-resolution scans produce the best results." },
    { q: "What languages are supported?", a: "Our OCR tool supports English text recognition. Additional language support may be added in the future." },
  ],
  "pdf-to-pdfa": [
    { q: "What is PDF/A?", a: "PDF/A is an ISO-standardized version of PDF designed for long-term digital archiving. It ensures reliable document preservation." },
    { q: "Why convert to PDF/A?", a: "PDF/A ensures your document can be reliably opened and displayed in the future, making it ideal for archiving and compliance." },
    { q: "Are all PDF features supported in PDF/A?", a: "PDF/A has some restrictions (no encryption, no external dependencies) to ensure long-term accessibility." },
  ],
  "compare-pdf": [
    { q: "How do I compare two PDFs?", a: "Upload two PDF documents and the tool will display them side by side so you can spot differences in text and layout." },
    { q: "Does it highlight differences?", a: "The tool extracts and displays text from both documents side by side for easy visual comparison." },
    { q: "Can I compare PDFs with images?", a: "The comparison focuses on text content. For image-heavy PDFs, visual side-by-side viewing helps identify differences." },
  ],
  "ai-summarizer": [
    { q: "How does PDF Summarizer work?", a: "Upload your PDF and our AI will analyze the content and generate a concise summary highlighting the key points." },
    { q: "How long of a document can I summarize?", a: "The summarizer works with documents up to 20MB. For best results, documents should have selectable text." },
    { q: "Can I customize the summary length?", a: "The AI generates an appropriate summary length based on the document content. Longer documents get more detailed summaries." },
  ],
  "ai-quiz": [
    { q: "How does the Quiz Generator work?", a: "Upload a PDF with study material and AI will generate multiple-choice and short-answer questions based on the content." },
    { q: "What types of questions are generated?", a: "The AI creates a mix of multiple-choice questions with answer options and explanations based on your document." },
    { q: "Can I use it for exam preparation?", a: "Yes! The Quiz Generator is perfect for studying | upload your notes, textbook chapters, or study guides to generate practice questions." },
  ],
  "ai-chat": [
    { q: "How does Chat with PDF work?", a: "Upload your PDF and then ask questions about its content. The AI will read the document and provide accurate answers." },
    { q: "Can I ask follow-up questions?", a: "Yes! You can have a full conversation about your document, asking multiple questions in sequence." },
    { q: "How accurate are the answers?", a: "The AI bases its answers on the actual content of your PDF, providing accurate and relevant responses." },
  ],
  "ai-ats": [
    { q: "What is an ATS Resume Checker?", a: "ATS (Applicant Tracking System) checkers analyze your resume to ensure it passes automated screening software used by employers." },
    { q: "How does the scoring work?", a: "Your resume is analyzed for key factors like formatting, keywords, structure, and completeness, resulting in an overall ATS compatibility score." },
    { q: "How can I improve my ATS score?", a: "Follow the specific recommendations provided by the tool, such as adding missing sections, using standard formatting, and including relevant keywords." },
  ],
  "ai-translate": [
    { q: "How does PDF translation work?", a: "Upload your PDF, select the target language, and AI will translate the text content while preserving the document structure." },
    { q: "What languages are supported?", a: "We support translation to multiple languages including Spanish, French, German, Chinese, Japanese, Arabic, Hindi, and more." },
    { q: "Is the translation accurate?", a: "Our AI-powered translation provides high-quality results. For critical documents, we recommend professional review." },
  ],
};

export default toolFaqs;
