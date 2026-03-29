import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SiteErrorBoundary } from "./components/SiteErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./lib/i18n/LanguageContext";
import { ThemeProvider } from "./components/ThemeProvider";
import GlobalDropOverlay from "./components/GlobalDropOverlay";
import GlobalUploadHint from "./components/GlobalUploadHint";
import { GlobalUploadProvider } from "./components/GlobalUploadContext";
import PageSkeleton from "./components/PageSkeleton";

// ── Core (always needed, no lazy) ─────────────────────────────────────────────
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// ── Tool Pages — lazy-loaded per route ───────────────────────────────────────
const MergePdf        = lazy(() => import("./pages/MergePdf"));
const SplitPdf        = lazy(() => import("./pages/SplitPdf"));
const CompressPdf     = lazy(() => import("./pages/CompressPdf"));
const PdfToJpg        = lazy(() => import("./pages/PdfToJpg"));
const JpgToPdf        = lazy(() => import("./pages/JpgToPdf"));
const PdfToWord       = lazy(() => import("./pages/PdfToWord"));
const WordToPdf       = lazy(() => import("./pages/WordToPdf"));
const PdfToPpt        = lazy(() => import("./pages/PdfToPpt"));
const PptToPdf        = lazy(() => import("./pages/PptToPdf"));
const PdfToExcel      = lazy(() => import("./pages/PdfToExcel"));
const ExcelToPdf      = lazy(() => import("./pages/ExcelToPdf"));
const ExcelToPpt      = lazy(() => import("./pages/ExcelToPpt"));
const EditPdf         = lazy(() => import("./pages/EditPdf"));
const RotatePdf       = lazy(() => import("./pages/RotatePdf"));
const WatermarkPdf    = lazy(() => import("./pages/WatermarkPdf"));
const ProtectPdf      = lazy(() => import("./pages/ProtectPdf"));
const UnlockPdf       = lazy(() => import("./pages/UnlockPdf"));
const PageNumbers     = lazy(() => import("./pages/PageNumbers"));
const OrganizePdf     = lazy(() => import("./pages/OrganizePdf"));
const RepairPdf       = lazy(() => import("./pages/RepairPdf"));
const PdfSummarizer   = lazy(() => import("./pages/PdfSummarizer"));
const QuizGenerator   = lazy(() => import("./pages/QuizGenerator"));
const ChatWithPdf     = lazy(() => import("./pages/ChatWithPdf"));
const AtsChecker      = lazy(() => import("./pages/AtsChecker"));
const DeletePages     = lazy(() => import("./pages/DeletePages"));
const ExtractPages    = lazy(() => import("./pages/ExtractPages"));
const SignPdf         = lazy(() => import("./pages/SignPdf"));
const CropPdf         = lazy(() => import("./pages/CropPdf"));
const RedactPdf       = lazy(() => import("./pages/RedactPdf"));
const FlattenPdf      = lazy(() => import("./pages/FlattenPdf"));
const TranslatePdf    = lazy(() => import("./pages/TranslatePdf"));
const HtmlToPdf       = lazy(() => import("./pages/HtmlToPdf"));
const OcrPdf          = lazy(() => import("./pages/OcrPdf"));
const PdfToPdfa       = lazy(() => import("./pages/PdfToPdfa"));
const ComparePdf      = lazy(() => import("./pages/ComparePdf"));
const PrivacyPolicy   = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService  = lazy(() => import("./pages/TermsOfService"));
const AboutUs         = lazy(() => import("./pages/AboutUs"));
const ContactUs       = lazy(() => import("./pages/ContactUs"));

// ── SEO Landing Pages ─────────────────────────────────────────────────────────
const SummarizePdf           = lazy(() => import("./pages/seo/SummarizePdf"));
const SummarizePdfForStudents = lazy(() => import("./pages/seo/SummarizePdfForStudents"));
const SummarizeResearchPaper  = lazy(() => import("./pages/seo/SummarizeResearchPaper"));
const SummarizeBookPdf        = lazy(() => import("./pages/seo/SummarizeBookPdf"));
const SummarizeLegalDocument  = lazy(() => import("./pages/seo/SummarizeLegalDocument"));
const SummarizeBusinessReport = lazy(() => import("./pages/seo/SummarizeBusinessReport"));
const AskQuestionsPdf         = lazy(() => import("./pages/seo/AskQuestionsPdf"));

// ── Blog ──────────────────────────────────────────────────────────────────────
const Blog                  = lazy(() => import("./pages/Blog"));
const BestAiToolsForStudents = lazy(() => import("./pages/blog/BestAiToolsForStudents"));
const HowToSummarizeLongPdfs = lazy(() => import("./pages/blog/HowToSummarizeLongPdfs"));
const AiStudyToolsForCollege = lazy(() => import("./pages/blog/AiStudyToolsForCollege"));
const BestPdfToolsOnline     = lazy(() => import("./pages/blog/BestPdfToolsOnline"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <ThemeProvider defaultTheme="light" storageKey="magicdocx-ui-theme">
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <GlobalUploadProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageSkeleton />}>
                  <Routes>
                    {/* Home — eagerly loaded (no Suspense overhead on landing page) */}
                    <Route path="/" element={<Index />} />

                    <Route element={<SiteErrorBoundary><Outlet /></SiteErrorBoundary>}>
                      {/* PDF Tools */}
                      <Route path="/merge-pdf"      element={<MergePdf />} />
                      <Route path="/split-pdf"      element={<SplitPdf />} />
                      <Route path="/compress-pdf"   element={<CompressPdf />} />
                      <Route path="/pdf-to-jpg"     element={<PdfToJpg />} />
                      <Route path="/jpg-to-pdf"     element={<JpgToPdf />} />
                      <Route path="/pdf-to-word"    element={<PdfToWord />} />
                      <Route path="/word-to-pdf"    element={<WordToPdf />} />
                      <Route path="/pdf-to-ppt"     element={<PdfToPpt />} />
                      <Route path="/ppt-to-pdf"     element={<PptToPdf />} />
                      <Route path="/pdf-to-excel"   element={<PdfToExcel />} />
                      <Route path="/excel-to-pdf"   element={<ExcelToPdf />} />
                      <Route path="/excel-to-ppt"   element={<ExcelToPpt />} />
                      <Route path="/edit-pdf"       element={<EditPdf />} />
                      <Route path="/rotate-pdf"     element={<RotatePdf />} />
                      <Route path="/add-watermark"  element={<WatermarkPdf />} />
                      <Route path="/protect-pdf"    element={<ProtectPdf />} />
                      <Route path="/unlock-pdf"     element={<UnlockPdf />} />
                      <Route path="/page-numbers"   element={<PageNumbers />} />
                      <Route path="/organize-pdf"   element={<OrganizePdf />} />
                      <Route path="/repair-pdf"     element={<RepairPdf />} />
                      <Route path="/delete-pages"   element={<DeletePages />} />
                      <Route path="/extract-pages"  element={<ExtractPages />} />
                      <Route path="/sign-pdf"       element={<SignPdf />} />
                      <Route path="/crop-pdf"       element={<CropPdf />} />
                      <Route path="/redact-pdf"     element={<RedactPdf />} />
                      <Route path="/flatten-pdf"    element={<FlattenPdf />} />
                      <Route path="/ocr-pdf"        element={<OcrPdf />} />
                      <Route path="/pdf-to-pdfa"    element={<PdfToPdfa />} />
                      <Route path="/compare-pdf"    element={<ComparePdf />} />
                      <Route path="/html-to-pdf"    element={<HtmlToPdf />} />
                    </Route>

                    {/* Static Pages */}
                    <Route path="/privacy"         element={<PrivacyPolicy />} />
                    <Route path="/privacy-policy"  element={<PrivacyPolicy />} />
                    <Route path="/terms"           element={<TermsOfService />} />
                    <Route path="/about"    element={<AboutUs />} />
                    <Route path="/contact"  element={<ContactUs />} />

                    {/* SEO Landing Pages */}
                    <Route path="/summarize-pdf"                  element={<SummarizePdf />} />
                    <Route path="/summarize-pdf-for-students"     element={<SummarizePdfForStudents />} />
                    <Route path="/summarize-research-paper"       element={<SummarizeResearchPaper />} />
                    <Route path="/summarize-book-pdf"             element={<SummarizeBookPdf />} />
                    <Route path="/summarize-legal-document"       element={<SummarizeLegalDocument />} />
                    <Route path="/summarize-business-report"      element={<SummarizeBusinessReport />} />
                    <Route path="/ask-questions-from-pdf"         element={<AskQuestionsPdf />} />

                    {/* Blog */}
                    <Route path="/blog"                                    element={<Blog />} />
                    <Route path="/blog/best-ai-tools-for-students"         element={<BestAiToolsForStudents />} />
                    <Route path="/blog/how-to-summarize-long-pdfs"         element={<HowToSummarizeLongPdfs />} />
                    <Route path="/blog/ai-study-tools-for-college-students" element={<AiStudyToolsForCollege />} />
                    <Route path="/blog/best-pdf-tools-online"              element={<BestPdfToolsOnline />} />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <GlobalDropOverlay />
                <GlobalUploadHint />
              </BrowserRouter>
            </GlobalUploadProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </HelmetProvider>
);

export default App;
