/**
 * MagicDOCX — Compress PDF Backend Server
 * Express API with Ghostscript-powered PDF compression
 *
 * Endpoints:
 *   POST /api/compress          → Upload + compress PDF
 *   GET  /api/download/:id      → Download compressed PDF
 *   GET  /api/health            → Health check
 */

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { compressPdf, checkEngineAvailability } = require("./compress");

// ── Setup ─────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;
const TEMP_DIR = path.join(__dirname, "temp");
const MAX_FILE_SIZE_MB = 50;
const FILE_TTL_MS = 5 * 60 * 1000; // 5 minutes

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Multer (file upload) ───────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TEMP_DIR),
  filename: (_req, _file, cb) => cb(null, `upload_${uuidv4()}.pdf`),
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ["application/pdf", "application/x-pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && ext === ".pdf") {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error("Only PDF files are accepted."), {
        code: "INVALID_FILE_TYPE",
      }),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

// ── In-memory file registry (id → paths + expiry) ─────────────────────────────
/** @type {Map<string, { inputPath: string, outputPath: string, expiresAt: number, filename: string }>} */
const fileRegistry = new Map();

// ── Helper: safe file delete ───────────────────────────────────────────────────
function safeDelete(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

// ── Helper: format bytes ───────────────────────────────────────────────────────
function toMB(bytes) {
  return +(bytes / (1024 * 1024)).toFixed(2);
}

// ── Auto-cleanup job (every 60 s) ─────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of fileRegistry.entries()) {
    if (now > entry.expiresAt) {
      safeDelete(entry.inputPath);
      safeDelete(entry.outputPath);
      fileRegistry.delete(id);
      console.log(`[cleanup] Expired file removed: ${id}`);
    }
  }
}, 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/compress
// Body: multipart/form-data  { file: <PDF>, mode: 'extreme'|'recommended'|'basic' }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/compress", upload.single("file"), async (req, res) => {
  const startTime = Date.now();

  // ── Validate upload ─────────────────────────────────────────────────────────
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No PDF file provided." });
  }

  const mode = ["extreme", "recommended", "basic"].includes(req.body.mode)
    ? req.body.mode
    : "recommended";

  const inputPath = req.file.path;
  const originalName = req.file.originalname.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const baseName = path.basename(originalName, ".pdf");
  const outputId = uuidv4();
  const outputPath = path.join(TEMP_DIR, `compressed_${outputId}.pdf`);

  console.log(
    `[compress] Start — file: ${originalName}, size: ${toMB(req.file.size)} MB, mode: ${mode}`
  );

  try {
    // ── Run compression ───────────────────────────────────────────────────────
    const meta = await compressPdf(inputPath, outputPath, mode);

    // ── Measure sizes ─────────────────────────────────────────────────────────
    const originalSize = req.file.size;
    const compressedStat = fs.existsSync(outputPath) ? fs.statSync(outputPath) : null;
    const compressedSize = compressedStat ? compressedStat.size : originalSize;

    const reductionPercent = originalSize > 0
      ? Math.max(0, ((originalSize - compressedSize) / originalSize) * 100)
      : 0;

    const compressionTime = Date.now() - startTime;

    // Only consider it "no reduction" if less than 1% savings
    const meaningfulReduction = reductionPercent >= 1;

    // ── If no meaningful reduction, serve the original file instead ───────────
    if (!meaningfulReduction) {
      safeDelete(outputPath);
      fs.copyFileSync(inputPath, outputPath);
    }

    // ── Register for cleanup ──────────────────────────────────────────────────
    fileRegistry.set(outputId, {
      inputPath,
      outputPath,
      expiresAt: Date.now() + FILE_TTL_MS,
      filename: `${baseName}_compressed.pdf`,
    });

    // Delete the input upload right away (we only need output)
    safeDelete(inputPath);

    console.log(
      `[compress] Done — ${toMB(originalSize)} MB → ${toMB(compressedSize)} MB ` +
      `(${reductionPercent}% saved, ${compressionTime} ms, engine: ${meta.engine})`
    );

    // ── No meaningful reduction ─────────────────────────────────────────────
    if (!meaningfulReduction) {
      return res.json({
        success: true,
        status: "no_reduction",
        alreadyOptimized: true,
        message: "This file can't be compressed further without losing quality",
        originalSizeMB: toMB(originalSize),
        compressedSizeMB: toMB(originalSize),
        originalSize,
        compressedSize: originalSize,
        reductionPercent: 0,
        compressionTime,
        pages: meta.pages,
        fileType: meta.fileType,
        engine: meta.engine,
        downloadUrl: `/api/download/${outputId}`,
      });
    }

    // ── Success ───────────────────────────────────────────────────────────────
    return res.json({
      success: true,
      status: "reduced",
      alreadyOptimized: false,
      message: "PDF compressed successfully",
      originalSizeMB: toMB(originalSize),
      compressedSizeMB: toMB(compressedSize),
      originalSize,
      compressedSize,
      reductionPercent: Math.round(reductionPercent),
      compressionTime,
      pages: meta.pages,
      fileType: meta.fileType,
      engine: meta.engine,
      downloadUrl: `/api/download/${outputId}`,
    });
  } catch (err) {
    safeDelete(inputPath);
    safeDelete(outputPath);
    console.error("[compress] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Compression failed. Please try again.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/download/:id
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/download/:id", (req, res) => {
  const entry = fileRegistry.get(req.params.id);

  if (!entry) {
    return res
      .status(404)
      .json({ success: false, error: "File not found or has expired." });
  }

  if (!fs.existsSync(entry.outputPath)) {
    fileRegistry.delete(req.params.id);
    return res.status(404).json({ success: false, error: "File no longer available." });
  }

  // Refresh TTL on download (another 5 min)
  entry.expiresAt = Date.now() + FILE_TTL_MS;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${entry.filename}"`
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(entry.outputPath);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const engine = await checkEngineAvailability();
  res.json({
    status: "ok",
    server: "MagicDOCX Compress API",
    engine,
    activeFiles: fileRegistry.size,
    uptime: process.uptime(),
  });
});

// ── Multer / global error handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
    });
  }
  if (err.code === "INVALID_FILE_TYPE") {
    return res.status(415).json({
      success: false,
      error: "Only PDF files are accepted.",
    });
  }
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 MagicDOCX server running → http://localhost:${PORT}`);
  console.log(`   Temp dir : ${TEMP_DIR}`);
  console.log(`   File TTL : ${FILE_TTL_MS / 1000}s\n`);

  checkEngineAvailability().then((info) => {
    if (info.available) {
      console.log(`✅ Compression engine: ${info.engine} (${info.binary || ""})`);
    } else {
      console.warn("⚠️  No compression engine found (Ghostscript / qpdf).");
      console.warn("   Install: brew install ghostscript  OR  apt-get install ghostscript");
    }
  });
});
