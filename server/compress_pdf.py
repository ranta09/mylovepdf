#!/usr/bin/env python3
"""
PDF compressor — lossy image recompression (ilovepdf-style).

Modes:
  extreme     — 100 DPI max, JPEG quality 45
  recommended — 150 DPI max, JPEG quality 72
  basic       — 200 DPI max, JPEG quality 85
"""

import sys
import io
import json
from pathlib import Path

from PIL import Image
import pypdf
from pypdf import PdfWriter, PdfReader
from pypdf.generic import NameObject, NumberObject

MODES = {
    "extreme":     {"max_dpi": 100, "jpeg_quality": 45},
    "recommended": {"max_dpi": 150, "jpeg_quality": 72},
    "basic":       {"max_dpi": 200, "jpeg_quality": 85},
}

JPEG_FILTERS = {"/DCTDecode", "DCTDecode"}
FLATE_FILTERS = {"/FlateDecode", "FlateDecode"}


def pil_image_from_xobj(xobj) -> Image.Image | None:
    """Decode an image XObject into a PIL Image."""
    filter_val = str(xobj.get("/Filter", ""))

    if filter_val in JPEG_FILTERS:
        # _data holds the raw JPEG bytes
        try:
            return Image.open(io.BytesIO(xobj._data))
        except Exception:
            return None

    # Flate-encoded or uncompressed raw pixel data
    try:
        raw = xobj.get_data()
    except Exception:
        return None

    width  = int(xobj.get("/Width",  0))
    height = int(xobj.get("/Height", 0))
    cs     = str(xobj.get("/ColorSpace", "/DeviceRGB"))
    bits   = int(xobj.get("/BitsPerComponent", 8))

    if not (width and height and raw):
        return None

    mode = (
        "RGB"  if cs in ("/DeviceRGB",  "/CalRGB")  else
        "L"    if cs in ("/DeviceGray", "/CalGray") else
        "CMYK" if cs == "/DeviceCMYK"               else
        "RGB"
    )
    try:
        return Image.frombytes(mode, (width, height), raw)
    except Exception:
        return None


def estimate_dpi(img: Image.Image, page) -> float:
    """Estimate image DPI from the page mediabox."""
    try:
        mb = page.mediabox
        page_w_in = float(mb.width)  / 72.0
        page_h_in = float(mb.height) / 72.0
        dpi_x = img.width  / page_w_in  if page_w_in  else 150.0
        dpi_y = img.height / page_h_in  if page_h_in  else 150.0
        return max(dpi_x, dpi_y)
    except Exception:
        return 150.0


def compress_pdf(input_path: str, output_path: str, mode: str = "recommended") -> dict:
    cfg     = MODES.get(mode, MODES["recommended"])
    max_dpi = cfg["max_dpi"]
    quality = cfg["jpeg_quality"]

    reader = PdfReader(input_path)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # Strip metadata in extreme/recommended
    if mode == "basic" and reader.metadata:
        writer.add_metadata(dict(reader.metadata))

    images_found  = 0
    images_shrunk = 0
    bytes_saved   = 0

    for page in writer.pages:
        resources = page.get("/Resources")
        if not resources:
            continue
        if hasattr(resources, "get_object"):
            resources = resources.get_object()
        xobjects = resources.get("/XObject") if hasattr(resources, "get") else None
        if not xobjects:
            continue
        if hasattr(xobjects, "get_object"):
            xobjects = xobjects.get_object()

        for name in list(xobjects.keys()):
            ref = xobjects[name]
            xobj = ref.get_object() if hasattr(ref, "get_object") else ref

            if str(xobj.get("/Subtype")) != "/Image":
                continue

            images_found += 1
            width  = int(xobj.get("/Width",  0))
            height = int(xobj.get("/Height", 0))

            # Skip tiny decorative images
            if width * height < 8000:
                continue

            img = pil_image_from_xobj(xobj)
            if img is None:
                continue

            current_dpi = estimate_dpi(img, page)

            orig_size = len(xobj._data)

            # Downsample if needed
            if current_dpi > max_dpi:
                scale = max_dpi / current_dpi
                new_w = max(1, int(img.width  * scale))
                new_h = max(1, int(img.height * scale))
                img = img.resize((new_w, new_h), Image.LANCZOS)

            # Convert CMYK → RGB for JPEG
            if img.mode == "CMYK":
                img = img.convert("RGB")
            elif img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            buf = io.BytesIO()
            try:
                img.save(buf, format="JPEG", quality=quality, optimize=True)
            except Exception:
                continue
            new_jpeg = buf.getvalue()
            new_size = len(new_jpeg)

            # Only swap if we saved at least 5%
            if new_size >= orig_size * 0.95:
                continue

            cs_name = "/DeviceRGB" if img.mode == "RGB" else "/DeviceGray"

            # Patch stream data and dictionary in place
            xobj._data = new_jpeg
            # Clear decoded cache so pypdf doesn't serve stale pixels
            if hasattr(xobj, "decoded_self"):
                xobj.decoded_self = None

            xobj.update({
                NameObject("/Filter"):           NameObject("/DCTDecode"),
                NameObject("/Width"):            NumberObject(img.width),
                NameObject("/Height"):           NumberObject(img.height),
                NameObject("/ColorSpace"):       NameObject(cs_name),
                NameObject("/BitsPerComponent"): NumberObject(8),
                NameObject("/Length"):           NumberObject(new_size),
            })
            for k in ["/DecodeParms", "/SMask", "/Mask"]:
                xobj.pop(NameObject(k), None)

            images_shrunk += 1
            bytes_saved   += orig_size - new_size

    # Compress duplicate/orphan objects
    try:
        writer.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    except Exception:
        try:
            writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
        except Exception:
            pass

    with open(output_path, "wb") as f:
        writer.write(f)

    input_size  = Path(input_path).stat().st_size
    output_size = Path(output_path).stat().st_size

    return {
        "pages":           len(reader.pages),
        "fileType":        "digital",
        "engine":          "python",
        "imagesFound":     images_found,
        "imagesShrunk":    images_shrunk,
        "imageBytesSaved": bytes_saved,
        "inputSize":       input_size,
        "outputSize":      output_size,
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: compress_pdf.py <input> <output> [mode]"}))
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    m   = sys.argv[3] if len(sys.argv) > 3 else "recommended"

    try:
        result = compress_pdf(inp, out, m)
        print(json.dumps(result))
    except Exception as e:
        import traceback
        print(json.dumps({"error": str(e), "trace": traceback.format_exc()}))
        sys.exit(1)
