import * as XLSX from "xlsx";
import pptxgen from "pptxgenjs";

// ──── Types & Interfaces ────────────────────────────────────────────────────────

export type PptTheme = "light" | "dark" | "professional";
export type GenerationMode = "auto" | "sheet_equals_slide" | "table_equals_slide";

export interface ThemeColors {
  bg: string;
  textMain: string;
  textMuted: string;
  primaryBg: string; // Header or accent
  primaryText: string;
  tableBorder: string;
  chartColors: string[];
}

export const THEMES: Record<PptTheme, ThemeColors> = {
  light: {
    bg: "FFFFFF",
    textMain: "333333",
    textMuted: "666666",
    primaryBg: "F1F5F9",
    primaryText: "0F172A",
    tableBorder: "E2E8F0",
    chartColors: ["3B82F6", "10B981", "F59E0B", "EF4444", "8B5CF6", "EC4899", "14B8A6"]
  },
  dark: {
    bg: "0F172A",
    textMain: "F8FAFC",
    textMuted: "94A3B8",
    primaryBg: "1E293B",
    primaryText: "FFFFFF",
    tableBorder: "334155",
    chartColors: ["60A5FA", "34D399", "FBBF24", "F87171", "A78BFA", "F472B6", "2DD4BF"]
  },
  professional: {
    bg: "FFFFFF",
    textMain: "1E293B",
    textMuted: "64748B",
    primaryBg: "1E3A8A", // Deep corporate blue
    primaryText: "FFFFFF",
    tableBorder: "CBD5E1",
    chartColors: ["1D4ED8", "047857", "B45309", "B91C1C", "6D28D9", "BE185D", "0F766E"]
  }
};

export type SlideType = "title" | "table" | "chart" | "split_table";

export interface SlideSchema {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string;
  sheetName: string;
  
  // For Table
  headers?: string[];
  rows?: any[][];
  splitPart?: number;
  totalParts?: number;
  
  // For Chart
  chartType?: "bar" | "pie";
  chartLabels?: string[];
  chartValues?: number[];
  metricName?: string;
}

export interface EngineOptions {
  theme: PptTheme;
  mode: GenerationMode;
  splitTables: boolean;
  maxRowsPerSlide: number;
}

// ──── Analysis Engine (Excel -> JSON Schema) ───────────────────────────────

/**
 * Parses an Excel ArrayBuffer and generates an array of declarative SlideSchema objects
 * which are later used to render BOTH the React HTML Live Preview and the pptxgenjs output.
 */
export async function analyzeExcelData(arrayBuffer: ArrayBuffer, options: EngineOptions, fileName: string): Promise<SlideSchema[]> {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const slides: SlideSchema[] = [];
  
  if (workbook.SheetNames.length === 0) {
    throw new Error("No usable sheets found in this Excel file.");
  }
  
  // 1. Initial Master Title Slide
  slides.push({
    id: `master_title`,
    type: "title",
    title: fileName.replace(/\.[^/.]+$/, ""),
    subtitle: "Smart AI Presentation Generated from Excel Data",
    sheetName: "Master"
  });

  workbook.SheetNames.forEach((sheetName, sIndex) => {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (!rawRows || rawRows.length < 2) return;
    
    // Normalize headers
    const headers = rawRows[0].map(h => String(h || "").trim());
    const dataRows = rawRows.slice(1).filter(r => r.length > 0 && r.some(c => c !== null && c !== undefined && String(c).trim() !== ""));
    
    if (dataRows.length === 0) return;

    // 2. Section Title Slide for the Sheet
    slides.push({
      id: `section_${sheetName}`,
      type: "title",
      title: sheetName,
      subtitle: `Data Overview (${dataRows.length} Rows)`,
      sheetName
    });
    
    // 3. Smart Chart Generation (Detect categoric vs numeric)
    if (headers.length >= 2) {
      const labelColIdx = 0;
      const numericColIndices: number[] = [];

      // Find first purely numeric column to plot
      for (let col = 1; col < headers.length; col++) {
          let isNumeric = true;
          let validNums = 0;
          for (let r = 0; r < Math.min(5, dataRows.length); r++) {
              const val = dataRows[r][col];
              if (val !== undefined && val !== null && val !== "") {
                  if (isNaN(Number(val))) {
                      isNumeric = false;
                      break;
                  } else {
                      validNums++;
                  }
              }
          }
          if (isNumeric && validNums > 0) {
              numericColIndices.push(col);
          }
      }

      if (numericColIndices.length > 0) {
          const targetMetricCol = numericColIndices[0];
          const labels: string[] = [];
          const values: number[] = [];

          // Try to get up to 15 data points for a chart
          for (let i = 0; i < Math.min(15, dataRows.length); i++) {
              const lbl = dataRows[i][labelColIdx];
              const val = Number(dataRows[i][targetMetricCol]);
              if (lbl && !isNaN(val)) {
                  labels.push(String(lbl).substring(0, 20)); // truncate long labels
                  values.push(val);
              }
          }

          if (labels.length > 0 && values.length > 0) {
              slides.push({
                id: `chart_${sheetName}_${targetMetricCol}`,
                type: "chart",
                title: `${headers[targetMetricCol]} by ${headers[labelColIdx]}`,
                sheetName,
                chartType: labels.length > 6 ? "bar" : "pie",
                chartLabels: labels,
                chartValues: values,
                metricName: headers[targetMetricCol]
              });
          }
      }
    }

    // 4. Data Tables (with splitting logic)
    if (options.splitTables && dataRows.length > options.maxRowsPerSlide) {
      const totalParts = Math.ceil(dataRows.length / options.maxRowsPerSlide);
      for (let p = 0; p < totalParts; p++) {
        const chunk = dataRows.slice(p * options.maxRowsPerSlide, (p + 1) * options.maxRowsPerSlide);
        
        // Keep all columns to match exactly
        const actualCols = headers.length;
        const truncatedHeaders = headers;
        const truncatedChunk = chunk.map(r => {
           const row = [];
           for (let c = 0; c < actualCols; c++) {
              row.push(r[c] !== undefined && r[c] !== null ? String(r[c]) : "");
           }
           return row;
        });

        slides.push({
          id: `table_${sheetName}_part${p}`,
          type: "split_table",
          title: `${sheetName} Data (Part ${p + 1} of ${totalParts})`,
          sheetName,
          headers: truncatedHeaders,
          rows: truncatedChunk,
          splitPart: p + 1,
          totalParts
        });
      }
    } else {
      // Just one table slide max, truncated rows based on maxRows
      const maxRows = Math.min(options.maxRowsPerSlide, dataRows.length);
      const actualCols = headers.length;
      const truncatedHeaders = headers;
      
      const chunk = dataRows.slice(0, maxRows).map(r => {
         const row = [];
         for (let c = 0; c < actualCols; c++) {
            row.push(r[c] !== undefined && r[c] !== null ? String(r[c]) : "");
         }
         return row;
      });

      slides.push({
        id: `table_${sheetName}_full`,
        type: "table",
        title: `${sheetName} - Tabular Overview`,
        subtitle: dataRows.length > maxRows ? `Showing Top ${maxRows} Rows` : undefined,
        sheetName,
        headers: truncatedHeaders,
        rows: chunk
      });
    }
  });

  return slides;
}

// ──── PPTX Generation Engine (JSON Schema -> .pptx Blob) ────────────────

export async function generatePptx(slides: SlideSchema[], themeName: PptTheme, fileName: string, onProgress?: (p: number) => void): Promise<Blob> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "MagicDOCX AI";
  pptx.company = "MagicDOCX";
  pptx.title = fileName;

  const t = THEMES[themeName];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const slide = pptx.addSlide();
    slide.background = { color: t.bg };

    // Common Footer / Decorator line
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: "98%", w: "100%", h: "2%", fill: { color: t.primaryBg } });
    slide.addText(s.sheetName, { x: 0.2, y: "94%", w: 3, h: 0.3, fontSize: 10, color: t.textMuted, fontFace: "Inter" });
    slide.addText(`Slide ${i + 1}`, { x: "85%", y: "94%", w: 1, h: 0.3, fontSize: 10, color: t.textMuted, align: "right", fontFace: "Inter" });

    if (s.type === "title") {
      slide.addText(s.title, {
          x: "10%", y: "40%", w: "80%", h: 1.5,
          fontSize: 44, color: themeName === "professional" ? t.primaryBg : t.textMain, bold: true, align: "center", fontFace: "Inter"
      });
      if (s.subtitle) {
        slide.addText(s.subtitle, {
            x: "10%", y: "55%", w: "80%", h: 1,
            fontSize: 20, color: t.textMuted, align: "center", fontFace: "Inter"
        });
      }
    } 
    else if (s.type === "table" || s.type === "split_table") {
      slide.addText(s.title, {
          x: 0.5, y: 0.4, w: "90%", h: 0.8, fontSize: 24, bold: true, color: t.textMain, fontFace: "Inter"
      });
      
      if (s.subtitle) {
         slide.addText(s.subtitle, {
            x: 0.5, y: 1.1, w: "90%", h: 0.4, fontSize: 12, color: t.textMuted, italic: true, fontFace: "Inter"
         });
      }

      if (s.headers && s.rows) {
        const tableData: any[] = [
            s.headers.map(h => ({ text: h, options: { bold: true, fill: { color: t.primaryBg }, color: t.primaryText, fontFace: "Inter" } }))
        ];

        s.rows.forEach(row => {
            const tableRow = row.map(cell => ({ text: String(cell), options: { color: t.textMain, fontFace: "Inter" } }));
            tableData.push(tableRow);
        });

        slide.addTable(tableData, {
            x: 0.5, y: s.subtitle ? 1.6 : 1.3, w: "90%",
            border: { type: "solid", pt: 1, color: t.tableBorder },
            fontSize: 10, rowH: 0.4,
            autoPage: true,
            autoPageLineWeight: 0,
            autoPageCharWeight: 0
        });
      }
    }
    else if (s.type === "chart" && s.chartLabels && s.chartValues) {
      slide.addText(s.title, {
          x: 0.5, y: 0.4, w: "90%", h: 0.8, fontSize: 24, bold: true, color: t.textMain, fontFace: "Inter"
      });

      const chartData = [
          {
              name: s.metricName || "Value",
              labels: s.chartLabels,
              values: s.chartValues
          }
      ];

      const cType = s.chartType === "bar" ? pptx.ChartType.bar : pptx.ChartType.pie;
      
      slide.addChart(cType, chartData, {
          x: 0.5, y: 1.3, w: "90%", h: "75%",
          showLegend: true, showTitle: false,
          chartColors: t.chartColors,
          dataLabelColor: t.textMain,
          dataLabelFontBold: true,
          dataLabelFormatCode: "#,##0"
      });
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / slides.length) * 100));
    }
  }

  // Generate Blob
  const blob = await pptx.write({ outputType: "blob" });
  return blob as Blob;
}
