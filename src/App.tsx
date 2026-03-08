import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
