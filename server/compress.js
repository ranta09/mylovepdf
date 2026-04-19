/**
 * compress.js — PDF compressor
 *
 * Strategy (priority order):
 *   1. Python (pypdf + Pillow) — lossy image recompression, ilovepdf-style
 *   2. qpdf  — lossless structural repack + Flate
 *   3. Ghostscript — lossy profiles (screen/ebook/printer)
 *   4. Copy original unchanged
 *
 * Compression profiles:
 *   extreme     — 100 DPI max, JPEG quality 45
 *   recommended — 150 DPI max, JPEG quality 72
 *   basic       — 200 DPI max, JPEG quality 85
 */

const { execFile, exec } = require("child_process");
const { promisify } = require("util");
const fs   = require("fs");
const path = require("path");

const execFileAsync = promisify(execFile);
const execAsync    = promisify(exec);

// ── GS profiles (fallback when Python unavailable) ───────────────────────────
const GS_SETTINGS = {
  extreme:     "/screen",   // ~72 dpi, heavy compression
  recommended: "/ebook",    // ~150 dpi, balanced
  basic:       "/printer",  // ~300 dpi, near-lossless
};

// ── Binary detectors ──────────────────────────────────────────────────────────
async function getGsBinary() {
  for (const bin of ["gs", "gswin64c", "gswin32c"]) {
    try { await execAsync(`${bin} --version`); return bin; } catch { /* next */ }
  }
  return null;
}

async function getQpdfBinary() {
  try { await execAsync("qpdf --version"); return "qpdf"; } catch { return null; }
}

async function getPythonBinary() {
  for (const bin of ["python3", "python"]) {
    try {
      const { stdout } = await execAsync(`${bin} -c "import pypdf, PIL; print('ok')"`);
      if (stdout.trim() === "ok") return bin;
    } catch { /* next */ }
  }
  return null;
}

// ── Page count via Ghostscript ────────────────────────────────────────────────
async function getPdfPageCount(gs, filePath) {
  try {
    const escaped = filePath.replace(/\\/g, "/");
    const { stdout } = await execAsync(
      `${gs} -q -dNODISPLAY -dBATCH -dNOPAUSE -c "(${escaped}) (r) file runpdfbegin pdfpagecount = quit"`
    );
    const n = parseInt(stdout.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  } catch { return 1; }
}

// ── PRIMARY: Python — lossy image recompression ───────────────────────────────
async function compressWithPython(python, inputPath, outputPath, mode) {
  const script = path.join(__dirname, "compress_pdf.py");
  try {
    const { stdout, stderr } = await execFileAsync(
      python, [script, inputPath, outputPath, mode],
      { timeout: 180_000 }
    );
    const result = JSON.parse(stdout.trim());
    if (result.error) throw new Error(result.error);
    return result;
  } catch (err) {
    return null;
  }
}

// ── SECONDARY: qpdf — lossless structural ────────────────────────────────────
async function compressWithQpdf(qpdf, inputPath, outputPath, mode) {
  const linearize = mode !== "basic";
  const baseArgs  = [
    "--object-streams=generate",
    "--compress-streams=y",
    "--stream-data=compress",
    inputPath,
    outputPath,
  ];
  if (linearize) baseArgs.unshift("--linearize");

  try {
    await execFileAsync(qpdf, ["--recompress-flate", ...baseArgs], { timeout: 120_000 });
    return true;
  } catch {
    try {
      await execFileAsync(qpdf, baseArgs, { timeout: 120_000 });
      return true;
    } catch { return false; }
  }
}

// ── TERTIARY: Ghostscript — lossy profiles ────────────────────────────────────
async function compressWithGhostscript(gs, inputPath, outputPath, mode) {
  const pdfSettings = GS_SETTINGS[mode] || "/ebook";

  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.5",
    "-dNOPAUSE", "-dQUIET", "-dBATCH",
    `-dPDFSETTINGS=${pdfSettings}`,
    "-dEmbedAllFonts=true",
    "-dSubsetFonts=true",
    "-dDetectDuplicateImages=true",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ];

  await execFileAsync(gs, args, { timeout: 120_000 });
}

function safeDelete(p) {
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {'extreme'|'recommended'|'basic'} mode
 * @returns {{ pages, fileType, engine }}
 */
async function compressPdf(inputPath, outputPath, mode = "recommended") {
  const [gs, qpdf, python] = await Promise.all([
    getGsBinary(),
    getQpdfBinary(),
    getPythonBinary(),
  ]);

  let pages    = 1;
  let fileType = "digital";

  if (gs) {
    try { pages = await getPdfPageCount(gs, inputPath); } catch { /* ok */ }
  }

  // ── 1. Python — lossy image recompression (ilovepdf-style) ─────────────────
  if (python) {
    const result = await compressWithPython(python, inputPath, outputPath, mode);
    if (result && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return { pages: result.pages || pages, fileType, engine: "python" };
    }
    safeDelete(outputPath);
  }

  // ── 2. qpdf — structural lossless ──────────────────────────────────────────
  if (qpdf) {
    const ok = await compressWithQpdf(qpdf, inputPath, outputPath, mode);
    if (ok && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
      return { pages, fileType, engine: "qpdf" };
    }
    safeDelete(outputPath);
  }

  // ── 3. Ghostscript — lossy profiles ────────────────────────────────────────
  if (gs) {
    try {
      await compressWithGhostscript(gs, inputPath, outputPath, mode);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return { pages, fileType, engine: "ghostscript" };
      }
    } catch (err) {
      console.warn("[compress] Ghostscript failed:", err.message);
    }
    safeDelete(outputPath);
  }

  // ── 4. No engine — copy unchanged ──────────────────────────────────────────
  fs.copyFileSync(inputPath, outputPath);
  return { pages, fileType, engine: "copy" };
}

async function checkEngineAvailability() {
  const [gs, qpdf, python] = await Promise.all([getGsBinary(), getQpdfBinary(), getPythonBinary()]);
  if (python) return { available: true, engine: "python",      binary: python };
  if (qpdf)   return { available: true, engine: "qpdf",        binary: qpdf   };
  if (gs)     return { available: true, engine: "ghostscript", binary: gs     };
  return { available: false, engine: "none" };
}

module.exports = { compressPdf, checkEngineAvailability };
