# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "PyMuPDF",
#     "pytesseract",
#     "Pillow",
#     "rembg[cpu]",
# ]
# ///

import sys
import re
from pathlib import Path
import pymupdf
import pytesseract
from PIL import Image
import rembg
import io

# Ensure stdout and stderr support UTF-8 characters on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure pytesseract can find tesseract on Windows
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
INPUT_DIR = PROJECT_ROOT / ".resources" / "input"
OUTPUT_DIR = PROJECT_ROOT / ".resources" / "output"

class Stats:
    def __init__(self):
        self.extracted = 0
        self.processed = 0
        self.failed = 0
        self.unknown = 0

def clean_word(word: str) -> str:
    """Clean the extracted OCR word for use as a filename."""
    # Replace underscores with spaces so they get split correctly
    word = word.replace('_', ' ')
    # Remove non-alphanumeric characters except spaces and hyphens
    cleaned = re.sub(r'[^a-zA-Z0-9\s\-]', '', word)
    # Convert to lowercase and replace spaces with hyphens
    cleaned = "-".join(cleaned.lower().split())
    return cleaned if cleaned else "unknown"

def process_pdf(pdf_path: Path, stats: Stats):
    pdf_name = pdf_path.stem
    pdf_out_dir = OUTPUT_DIR / pdf_name

    extracted_dir = pdf_out_dir / "extracted"
    standardize_dir = pdf_out_dir / "standardize"
    transparent_dir = pdf_out_dir / "transparent"

    std_png_dir = standardize_dir / "png"
    std_webp_dir = standardize_dir / "webp"
    trans_png_dir = transparent_dir / "png"
    trans_webp_dir = transparent_dir / "webp"

    extracted_dir.mkdir(parents=True, exist_ok=True)
    std_png_dir.mkdir(parents=True, exist_ok=True)
    std_webp_dir.mkdir(parents=True, exist_ok=True)
    trans_png_dir.mkdir(parents=True, exist_ok=True)
    trans_webp_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n--- Processing PDF: {pdf_name} ---")

    # -------------------------------------------------------------------------
    # PIPELINE 1: Extract Images
    # -------------------------------------------------------------------------
    print("Extracting images from PDF...")
    doc = pymupdf.open(pdf_path)
    extracted_images = [] # list of dicts: {'path': Path, 'index': int}

    img_index = 1
    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img in image_list:
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            # Check dimensions
            try:
                pil_img = Image.open(io.BytesIO(image_bytes))
                width, height = pil_img.size
                if width <= 300 or height <= 300:
                    continue # Skip small images (logos, icons)

                # Save extracted raw image
                ext = base_image["ext"]
                if ext == "jpx": ext = "jpeg" # Pillow sometimes has trouble with jpx, but we'll save it as what pymupdf says

                img_filename = f"{img_index:03d}.{ext}"
                img_path = extracted_dir / img_filename

                with open(img_path, "wb") as f:
                    f.write(image_bytes)

                extracted_images.append({'path': img_path, 'index': img_index, 'ext': ext})
                img_index += 1
                stats.extracted += 1
            except Exception as e:
                print(f"  Warning: Could not read image xref {xref}: {e}")

    doc.close()
    print(f"  Extracted {len(extracted_images)} valid images.")

    # Initialize rembg session once if there are images
    session = None
    if extracted_images:
        # print("\nInitializing rembg u2net session...")
        # session = rembg.new_session("u2net")
        print("\nInitializing rembg isnet-general-use session...")
        session = rembg.new_session("isnet-general-use")

    # Process each extracted image
    for item in extracted_images:
        raw_img_path = item['path']
        print(f"\nProcessing image {raw_img_path.name}...")

        try:
            with Image.open(raw_img_path) as img:
                # -------------------------------------------------------------
                # PIPELINE 2: OCR & Standardize (Clean text, no resize)
                # -------------------------------------------------------------
                width, height = img.size
                crop_height = int(height * 0.80)

                # Extract JUST the bottom 20% for OCR
                text_region = img.crop((0, crop_height, width, height))

                # Pre-processing for OCR: convert to Grayscale
                text_region_gray = text_region.convert('L')

                # Use Tesseract with configurations to improve accuracy
                # --psm 6: Assume a single uniform block of text.
                # --psm 7: Treat the image as a single text line.
                custom_config = r'--psm 7'
                ocr_text = pytesseract.image_to_string(text_region_gray, config=custom_config).strip()
                word = clean_word(ocr_text)

                # Fallback if OCR fails
                if word == "unknown":
                    word = f"word-{item['index']:03d}"
                    stats.unknown += 1
                    print(f"  ❌ OCR failed for image {raw_img_path.name}, using fallback word: '{word}'")
                else:
                    print(f"  ✅ OCR Word detected: '{word}'")

                # Crop bottom 20% to remove text (Assumption based on typical flashcards)
                clean_img = img.crop((0, 0, width, crop_height))

                # Save as PNG and WEBP in standardize/
                std_png = std_png_dir / f"{word}.png"
                std_webp = std_webp_dir / f"{word}.webp"

                clean_img.save(std_png, format="PNG")
                clean_img.save(std_webp, format="WEBP", quality=90)
                print(f"  Saved cleaned images to standardize/png and standardize/webp")

                # -------------------------------------------------------------
                # PIPELINE 3: Transparent (rembg) & Square/Resize
                # -------------------------------------------------------------
                print(f"  Removing background...")
                # rembg expects PIL image, returns PIL image with transparent background (RGBA)
                transparent_img = rembg.remove(
                    clean_img, 
                    session=session,
                    # alpha_matting=True,
                    # alpha_matting_foreground_threshold=240,
                    # alpha_matting_background_threshold=10,
                    # alpha_matting_erode_size=10
                )

                # Make Square (Padding with transparent background)
                t_width, t_height = transparent_img.size
                max_dim = max(t_width, t_height)

                # Create a new transparent square image
                square_img = Image.new("RGBA", (max_dim, max_dim), (255, 255, 255, 0))
                # Paste the transparent image into the center
                offset_x = (max_dim - t_width) // 2
                offset_y = (max_dim - t_height) // 2
                square_img.paste(transparent_img, (offset_x, offset_y), transparent_img)

                # Resize if > 500x500
                final_img = square_img
                if max_dim > 500:
                    final_img = square_img.resize((500, 500), Image.Resampling.LANCZOS)

                # Save as PNG and WEBP in transparent/
                trans_png = trans_png_dir / f"{word}.png"
                trans_webp = trans_webp_dir / f"{word}.webp"

                final_img.save(trans_png, format="PNG")
                final_img.save(trans_webp, format="WEBP", quality=90, method=6)
                print(f"  Saved transparent/squared images to transparent/png and transparent/webp")

                stats.processed += 1

        except KeyboardInterrupt:
            # Re-raise to break out of the processing loop entirely
            raise
        except Exception as e:
            print(f"  Error processing image {raw_img_path.name}: {e}")
            stats.failed += 1

def print_summary(all_stats: dict, total_stats: Stats):
    print("\n========================================================================")
    print("                    PROCESSING SUMMARY")
    print("========================================================================")
    print(f"{'PDF File':<30} | {'Extracted':<9} | {'Processed':<9} | {'Failed':<6} | {'Unknown':<7}")
    print("-" * 72)
    for pdf_name, st in all_stats.items():
        # Truncate pdf_name if it's too long to fit in 30 chars
        disp_name = (pdf_name[:27] + "...") if len(pdf_name) > 30 else pdf_name
        print(f"{disp_name:<30} | {st.extracted:<9} | {st.processed:<9} | {st.failed:<6} | {st.unknown:<7}")
    print("========================================================================")
    print(f"{'GRAND TOTAL':<30} | {total_stats.extracted:<9} | {total_stats.processed:<9} | {total_stats.failed:<6} | {total_stats.unknown:<7}")
    print("========================================================================\n")

def main():
    if not INPUT_DIR.exists():
        print(f"Input directory does not exist: {INPUT_DIR}")
        print("Creating input directory. Please place your PDFs there.")
        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        return

    pdf_files = list(INPUT_DIR.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in {INPUT_DIR}")
        return

    print(f"Found {len(pdf_files)} PDF files to process.")

    all_stats = {}
    total_stats = Stats()

    try:
        for pdf_path in pdf_files:
            current_stats = Stats()
            all_stats[pdf_path.stem] = current_stats

            try:
                process_pdf(pdf_path, current_stats)
            except KeyboardInterrupt:
                raise
            except Exception as e:
                print(f"  ❌ Lỗi nghiêm trọng khi đọc file {pdf_path.name}: {e}")

            total_stats.extracted += current_stats.extracted
            total_stats.processed += current_stats.processed
            total_stats.failed += current_stats.failed
            total_stats.unknown += current_stats.unknown

        print("\n🎉 All processing complete.")

    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user (Ctrl+C). Exiting safely...")
    finally:
        if all_stats:
            print_summary(all_stats, total_stats)

if __name__ == "__main__":
    main()
