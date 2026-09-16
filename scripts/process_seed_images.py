#!/usr/bin/env python3
"""
scripts/process_seed_images.py

Batch standardization of seed PNG images to transparent WebP format.
- For 'colors': images already have transparency, converted via Pillow directly.
- For all other topics: AI background removal using rembg (u2net) to ensure crisp transparency,
  then saved as optimized WebP (method=6, quality=90).
- Original PNG files are deleted only after successful WebP generation and validation.
- Preserves default-placeholder.webp.
"""

import os
import sys
import time
from pathlib import Path
from PIL import Image
import rembg

# Ensure stdout and stderr support UTF-8 characters on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
IMAGES_ROOT = PROJECT_ROOT / "backend" / "uploads" / "seed" / "images"


def format_bytes(bytes_num: int) -> str:
    """Format bytes into a human-readable string."""
    if bytes_num == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB"]
    i = 0
    num = float(bytes_num)
    while num >= 1024.0 and i < len(units) - 1:
        num /= 1024.0
        i += 1
    return f"{num:.2f} {units[i]}"


def get_all_png_files(root_dir: Path):
    """Recursively collect all .png files under root_dir."""
    png_files = []
    if not root_dir.exists():
        return png_files

    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            if f.lower().endswith(".png"):
                png_files.append(Path(dirpath) / f)
    return sorted(png_files)


def get_dir_size(root_dir: Path) -> int:
    """Calculate total size of all files in a directory."""
    total_size = 0
    if not root_dir.exists():
        return 0
    for dirpath, _, filenames in os.walk(root_dir):
        for f in filenames:
            p = Path(dirpath) / f
            if p.is_file():
                total_size += p.stat().st_size
    return total_size


def process_single_image(png_path: Path, session: rembg.new_session = None) -> tuple[bool, int, int, str]:
    """
    Process a single PNG file:
    - If in 'colors' topic: convert PNG directly to WebP (preserving existing alpha).
    - Other topics: use rembg to remove solid/white background, then save as WebP.
    - Delete PNG upon success.
    Returns: (success: bool, original_size: int, webp_size: int, message: str)
    """
    original_size = png_path.stat().st_size
    webp_path = png_path.with_suffix(".webp")
    topic_name = png_path.parent.name.lower()

    try:
        with Image.open(png_path) as img:
            # Ensure RGBA mode for transparent alpha channel
            if img.mode != "RGBA":
                img = img.convert("RGBA")

            if topic_name == "colors":
                # 'colors' already has transparent background
                img.save(webp_path, format="WEBP", quality=90, method=6)
            else:
                # Remove opaque/white background with rembg
                output_img = rembg.remove(img, session=session)
                output_img.save(webp_path, format="WEBP", quality=90, method=6)

        # Validate newly generated WebP file
        if not webp_path.exists():
            raise FileNotFoundError(f"Generated WebP file not found: {webp_path}")

        webp_size = webp_path.stat().st_size
        if webp_size == 0:
            raise ValueError(f"Generated WebP file is empty: {webp_path}")

        # Safe removal of original PNG file
        png_path.unlink()
        return True, original_size, webp_size, "Success"

    except Exception as exc:
        # Clean up corrupted WebP if failed
        if webp_path.exists():
            try:
                webp_path.unlink()
            except Exception:
                pass
        return False, original_size, 0, str(exc)


def main():
    print("==================================================================")
    print("🚀 Seed Images Standardization: PNG -> Transparent WebP (rembg AI)")
    print(f"📁 Root directory: {IMAGES_ROOT}")
    print("==================================================================")

    if not IMAGES_ROOT.exists():
        print(f"❌ Error: Images directory not found: {IMAGES_ROOT}")
        sys.exit(1)

    initial_dir_size = get_dir_size(IMAGES_ROOT)
    png_files = get_all_png_files(IMAGES_ROOT)
    total_count = len(png_files)

    print(f"📊 Initial images directory size: {format_bytes(initial_dir_size)}")
    print(f"🔍 Found {total_count} PNG files to process.\n")

    if total_count == 0:
        print("✨ No PNG files found to convert. Directory is already standardized!")
        sys.exit(0)

    # Initialize rembg session once to preload u2net model weights
    print("🧠 Initializing rembg AI model (u2net)...")
    start_init = time.time()
    session = rembg.new_session("u2net")
    print(f"✅ AI Model ready in {time.time() - start_init:.2f}s.\n")

    success_count = 0
    fail_count = 0
    total_orig_bytes = 0
    total_webp_bytes = 0

    start_total_time = time.time()

    for idx, png_path in enumerate(png_files, start=1):
        rel_path = png_path.relative_to(IMAGES_ROOT)
        webp_rel_path = rel_path.with_suffix(".webp")

        print(f"[{idx}/{total_count}] Processing: {rel_path} -> {webp_rel_path}...", end=" ", flush=True)

        success, orig_size, webp_size, msg = process_single_image(png_path, session=session)

        if success:
            success_count += 1
            total_orig_bytes += orig_size
            total_webp_bytes += webp_size
            saved_bytes = orig_size - webp_size
            pct = (saved_bytes / orig_size * 100) if orig_size > 0 else 0
            print(f"(Done: {format_bytes(orig_size)} -> {format_bytes(webp_size)}, saved {pct:.1f}%)")
        else:
            fail_count += 1
            print(f"❌ (FAILED: {msg})")

    elapsed_time = time.time() - start_total_time
    final_dir_size = get_dir_size(IMAGES_ROOT)
    overall_saved = initial_dir_size - final_dir_size
    overall_pct = (overall_saved / initial_dir_size * 100) if initial_dir_size > 0 else 0

    print("\n==================================================================")
    print("🎉 SEED IMAGES PROCESSING REPORT")
    print("==================================================================")
    print(f"• Total PNG files scanned:       {total_count}")
    print(f"• Successfully converted:        {success_count}")
    print(f"• Failed conversions:            {fail_count}")
    print(f"• Elapsed time:                  {elapsed_time:.1f} seconds")
    print(f"• Original directory size:       {format_bytes(initial_dir_size)}")
    print(f"• Final directory size:          {format_bytes(final_dir_size)}")
    print(f"• Storage reduced by:            {format_bytes(overall_saved)} ({overall_pct:.1f}%)")
    print("==================================================================\n")

    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
