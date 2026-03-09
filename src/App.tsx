import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./lib/i18n/LanguageContext";
import Index from "./pages/Index";
import MergePdf from "./pages/MergePdf";
import SplitPdf from "./pages/SplitPdf";
import CompressPdf from "./pages/CompressPdf";
import PdfToJpg from "./pages/PdfToJpg";
import JpgToPdf from "./pages/JpgToPdf";
import PdfToWord from "./pages/PdfToWord";
import WordToPdf from "./pages/WordToPdf";
import PdfToPpt from "./pages/PdfToPpt";
import PptToPdf from "./pages/PptToPdf";
import PdfToExcel from "./pages/PdfToExcel";
import ExcelToPdf from "./pages/ExcelToPdf";
import EditPdf from "./pages/EditPdf";
import RotatePdf from "./pages/RotatePdf";
import WatermarkPdf from "./pages/WatermarkPdf";
import ProtectPdf from "./pages/ProtectPdf";
import UnlockPdf from "./pages/UnlockPdf";
import PageNumbers from "./pages/PageNumbers";
import OrganizePdf from "./pages/OrganizePdf";
import RepairPdf from "./pages/RepairPdf";
import NotFound from "./pages/NotFound";
import PdfSummarizer from "./pages/PdfSummarizer";
import QuizGenerator from "./pages/QuizGenerator";
import ChatWithPdf from "./pages/ChatWithPdf";
import AtsChecker from "./pages/AtsChecker";
import DeletePages from "./pages/DeletePages";
import ExtractPages from "./pages/ExtractPages";
import SignPdf from "./pages/SignPdf";
import CropPdf from "./pages/CropPdf";
import RedactPdf from "./pages/RedactPdf";
import FlattenPdf from "./pages/FlattenPdf";
import TranslatePdf from "./pages/TranslatePdf";
import HtmlToPdf from "./pages/HtmlToPdf";
import OcrPdf from "./pages/OcrPdf";
import PdfToPdfa from "./pages/PdfToPdfa";
import ComparePdf from "./pages/ComparePdf";
import RemoveBackground from "./pages/RemoveBackground";
import CompressImage from "./pages/CompressImage";
import ResizeImage from "./pages/ResizeImage";
import CropImage from "./pages/CropImage";
import Chatbot from "./components/Chatbot";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/merge-pdf" element={<MergePdf />} />
            <Route path="/split-pdf" element={<SplitPdf />} />
            <Route path="/compress-pdf" element={<CompressPdf />} />
            <Route path="/pdf-to-jpg" element={<PdfToJpg />} />
            <Route path="/jpg-to-pdf" element={<JpgToPdf />} />
            <Route path="/pdf-to-word" element={<PdfToWord />} />
            <Route path="/word-to-pdf" element={<WordToPdf />} />
            <Route path="/pdf-to-ppt" element={<PdfToPpt />} />
            <Route path="/ppt-to-pdf" element={<PptToPdf />} />
            <Route path="/pdf-to-excel" element={<PdfToExcel />} />
            <Route path="/excel-to-pdf" element={<ExcelToPdf />} />
            <Route path="/edit-pdf" element={<EditPdf />} />
            <Route path="/rotate-pdf" element={<RotatePdf />} />
            <Route path="/add-watermark" element={<WatermarkPdf />} />
            <Route path="/protect-pdf" element={<ProtectPdf />} />
            <Route path="/unlock-pdf" element={<UnlockPdf />} />
            <Route path="/page-numbers" element={<PageNumbers />} />
            <Route path="/organize-pdf" element={<OrganizePdf />} />
            <Route path="/repair-pdf" element={<RepairPdf />} />
            <Route path="/pdf-summarizer" element={<PdfSummarizer />} />
            <Route path="/quiz-generator" element={<QuizGenerator />} />
            <Route path="/chat-with-pdf" element={<ChatWithPdf />} />
            <Route path="/ats-checker" element={<AtsChecker />} />
            <Route path="/delete-pages" element={<DeletePages />} />
            <Route path="/extract-pages" element={<ExtractPages />} />
            <Route path="/sign-pdf" element={<SignPdf />} />
            <Route path="/crop-pdf" element={<CropPdf />} />
            <Route path="/redact-pdf" element={<RedactPdf />} />
            <Route path="/flatten-pdf" element={<FlattenPdf />} />
            <Route path="/translate-pdf" element={<TranslatePdf />} />
            <Route path="/html-to-pdf" element={<HtmlToPdf />} />
            <Route path="/ocr-pdf" element={<OcrPdf />} />
            <Route path="/pdf-to-pdfa" element={<PdfToPdfa />} />
            <Route path="/compare-pdf" element={<ComparePdf />} />
            <Route path="/remove-background" element={<RemoveBackground />} />
            <Route path="/compress-image" element={<CompressImage />} />
            <Route path="/resize-image" element={<ResizeImage />} />
            <Route path="/crop-image" element={<CropImage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Chatbot />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </LanguageProvider>
  </HelmetProvider>
);

export default App;
