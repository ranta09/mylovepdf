/**
 * compress.js — Production PDF compression engine
 * Uses Ghostscript (gs) as primary engine with qpdf as fallback.
 *
 * Ghostscript must be installed:
 *   macOS:  brew install ghostscript
 *   Ubuntu: sudo apt-get install ghostscript
 *   Windows: https://www.ghostscript.com/download/gsdnld.html
 */

const { execFile, exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// ── Ghostscript settings per compression mode ─────────────────────────────────
const GS_PROFILES = {
  extreme: {
    pdfSettings: "/screen",      // Lowest quality, maximum compression
    colorDpi: 72,
    grayDpi: 72,
    monoDpi: 72,
    jpegQuality: 40,
    removeMetadata: true,
  },
  recommended: {
    pdfSettings: "/printer",     // High-quality preset — still compresses well
    colorDpi: 200,
    grayDpi: 200,
    monoDpi: 300,
    jpegQuality: 85,
    removeMetadata: false,
  },
  basic: {
    pdfSettings: "/printer",     // High quality, minimal compression
    colorDpi: 300,
    grayDpi: 300,
    monoDpi: 300,
    jpegQuality: 85,
    removeMetadata: false,
  },
};

// ── Detect available Ghostscript binary ───────────────────────────────────────
async function getGsBinary() {
  const candidates = ["gs", "gswin64c", "gswin32c"];
  for (const bin of candidates) {
    try {
      await execAsync(`${bin} --version`);
      return bin;
    } catch {
      // try next
    }
  }
  return null;
}

// ── Get PDF page count via Ghostscript ────────────────────────────────────────
async function getPdfPageCount(gs, filePath) {
  try {
    const escapedPath = filePath.replace(/\\/g, "/");
    const { stdout } = await execAsync(
      `${gs} -q -dNODISPLAY -dBATCH -dNOPAUSE -c "(${escapedPath}) (r) file runpdfbegin pdfpagecount = quit"`
    );
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch {
    return 1;
  }
}

// ── Detect whether PDF is scanned (image-heavy) or digital ───────────────────
async function detectFileType(gs, filePath) {
  try {
    // Count embedded images — if many per page, it's likely scanned
    const escapedPath = filePath.replace(/\\/g, "/");
    const { stdout } = await execAsync(
      `${gs} -q -dNODISPLAY -dBATCH -dNOPAUSE -c "/${escapedPath} (r) file runpdfbegin { /Page pdfdict begin /Resources known { Resources /XObject known { Resources /XObject get { pop 3 1 roll /Subtype get /Image eq { 1 add } if } forall } if } if end } 0 1 pdfpagecount 1 sub { pdfgetpage exch } for = quit"`,
      { timeout: 5000 }
    );
    const imageCount = parseInt(stdout.trim(), 10) || 0;
    return imageCount > 3 ? "scanned" : "digital";
  } catch {
    return "digital";
  }
}

// ── Main compression with Ghostscript ─────────────────────────────────────────
async function compressWithGhostscript(gs, inputPath, outputPath, mode) {
  const profile = GS_PROFILES[mode] || GS_PROFILES.recommended;

  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=${profile.pdfSettings}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    // ── Image downsampling ──────────────────────────────────────────────────
    "-dDownsampleColorImages=true",
    "-dDownsampleGrayImages=true",
    "-dDownsampleMonoImages=true",
    `-dColorImageResolution=${profile.colorDpi}`,
    `-dGrayImageResolution=${profile.grayDpi}`,
    `-dMonoImageResolution=${profile.monoDpi}`,
    // ── Compression filters ─────────────────────────────────────────────────
    "-dAutoFilterColorImages=false",
    "-dColorImageFilter=/DCTEncode",
    "-dAutoFilterGrayImages=false",
    "-dGrayImageFilter=/DCTEncode",
    // ── JPEG quality ────────────────────────────────────────────────────────
    `-dJPEGQ=${profile.jpegQuality}`,
    // ── Font embedding ──────────────────────────────────────────────────────
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=true",
    // ── Metadata removal (extreme mode) ────────────────────────────────────
    ...(profile.removeMetadata
      ? ["-dFastWebView=false"]
      : ["-dFastWebView=true"]),
    // ── Output ─────────────────────────────────────────────────────────────
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  await execFileAsync(gs, args, { timeout: 120_000 }); // 2-min timeout
}

// ── Fallback: qpdf (lossless linearisation) ───────────────────────────────────
async function compressWithQpdf(inputPath, outputPath) {
  try {
    await execAsync(`qpdf --linearize "${inputPath}" "${outputPath}"`, {
      timeout: 60_000,
    });
    return true;
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compresses a PDF file.
 * @param {string} inputPath  Absolute path to uploaded PDF
 * @param {string} outputPath Absolute path for compressed output
 * @param {'extreme'|'recommended'|'basic'} mode Compression level
 * @returns {{ pages: number, fileType: string, engine: string }}
 */
async function compressPdf(inputPath, outputPath, mode = "recommended") {
  const gs = await getGsBinary();

  // ── Gather pre-compression metadata ────────────────────────────────────────
  let pages = 1;
  let fileType = "digital";

  if (gs) {
    [pages, fileType] = await Promise.all([
      getPdfPageCount(gs, inputPath),
      detectFileType(gs, inputPath),
    ]);
  }

  // ── Attempt Ghostscript compression ────────────────────────────────────────
  if (gs) {
    try {
      await compressWithGhostscript(gs, inputPath, outputPath, mode);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return { pages, fileType, engine: "ghostscript" };
      }
    } catch (err) {
      console.warn("[compress] Ghostscript failed:", err.message);
    }
  }

  // ── Fallback: qpdf ──────────────────────────────────────────────────────────
  const qpdfOk = await compressWithQpdf(inputPath, outputPath);
  if (qpdfOk && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return { pages, fileType, engine: "qpdf" };
  }

  // ── Last resort: copy original ──────────────────────────────────────────────
  fs.copyFileSync(inputPath, outputPath);
  return { pages, fileType, engine: "copy" };
}

/**
 * Quick health-check: returns true if at least one compression engine is found.
 */
async function checkEngineAvailability() {
  const gs = await getGsBinary();
  if (gs) return { available: true, engine: "ghostscript", binary: gs };

  try {
    await execAsync("qpdf --version");
    return { available: true, engine: "qpdf" };
  } catch {
    return { available: false, engine: "none" };
  }
}

module.exports = { compressPdf, checkEngineAvailability };
