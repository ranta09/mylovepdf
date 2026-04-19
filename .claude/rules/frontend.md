---
paths:
  - "src/**"
  - "server/**"
---

# Frontend / Server Rules (loaded only for src/ and server/ files)

## Component patterns
- Results page: `bg-secondary/30`, back arrow → `setResults([])`, Continue-to 3-col grid, security section
- Upload page: ToolUploadScreen + info sections (How it works, features, FAQ, tools family, tutorials, RatingBar)
- Footer replaces ToolSeoSection on all tool pages

## CompressPdf specifics
- Three lossless modes: extreme (metadata removal + linearize), recommended (partial metadata + linearize), basic (structure only)
- Backend: qpdf → Ghostscript PassThrough → copy
- Client fallback: pdf-lib `save({ useObjectStreams: true })` + metadata cleanup — NO rasterisation
- noReduction = compressedSize >= originalSize → show warning, suppress auto-download

## SplitPdf specifics
- 4 modes: extract, range, every, fixed
- Workspace: `fixed top-16` thumbnail grid (left) + settings sidebar (right)
- Results: same layout as CompressPdf results page

## Server (server/index.js)
- Port 3001, multer 50 MB limit, PDF only
- Files auto-deleted after 5 min; cleanup every 60 s
- Returns: originalSize, compressedSize, reductionPercent (≥0), status, pages, fileType, compressionTime, downloadUrl, engine
