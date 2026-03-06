import os
import json
import base64
import io
import time
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai
import pypdfium2 as pdfium

load_dotenv(Path(__file__).parent.parent / "web" / ".env.local")

genai.configure(api_key=os.environ["GOOGLE_GENERATIVE_AI_API_KEY"])

PDF_DIR = Path(__file__).parent.parent / "雷射導論課程講義"
OUTPUT_DIR = Path(__file__).parent.parent / "parsed_lectures"
OUTPUT_DIR.mkdir(exist_ok=True)

MODEL = os.environ.get("VISION_MODEL", "gemini-2.5-flash")

EXTRACTION_PROMPT = """You are a physics lecture PDF parser for a university "Introduction to Lasers" course.
Extract ALL content from this lecture slide into structured Markdown.

RULES:
1. ALL mathematical formulas MUST use LaTeX notation: inline $...$ or display $$...$$
2. Preserve logical structure: use ## for section headers, - for bullet points
3. For diagrams/figures, write [Figure: detailed description of what the figure shows, including axis labels, curves, and physical meaning]
4. Preserve BOTH Chinese and English text exactly as shown
5. If a derivation or formula is explicitly marked as WRONG or incorrect in the slide, wrap it in a block:
   > ⚠️ COUNTEREXAMPLE (this derivation is intentionally wrong)
   > [the wrong content]
   > CORRECTION: [why it's wrong]
6. Preserve the derivation flow — use → or ⟹ to show logical progression
7. For boxed/highlighted results, use **bold** or > blockquote
8. Output ONLY the extracted Markdown content. No commentary.

IMPORTANT: This content will be used by a RAG system to answer student questions.
Accuracy of formulas is CRITICAL — a wrong subscript or sign can mislead students."""


def pdf_page_to_image_bytes(pdf_path: str, page_idx: int) -> bytes:
    pdf = pdfium.PdfDocument(pdf_path)
    page = pdf[page_idx]
    bitmap = page.render(scale=200 / 72)
    img = bitmap.to_pil()
    pdf.close()

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def extract_page(pdf_path: str, page_idx: int, max_retries: int = 3) -> str:
    img_bytes = pdf_page_to_image_bytes(pdf_path, page_idx)

    model = genai.GenerativeModel(MODEL)
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                [
                    EXTRACTION_PROMPT,
                    {"mime_type": "image/png", "data": img_bytes},
                ],
                generation_config=genai.types.GenerationConfig(temperature=0, max_output_tokens=4096),
            )
            return response.text
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 2 ** (attempt + 1)  # 2s, 4s, 8s
                print(f"\n    ⚠️  {e}. Retry in {wait}s...", end=" ", flush=True)
                time.sleep(wait)
            else:
                raise


def parse_pdf(pdf_path: Path):
    name = pdf_path.stem
    week_str = name.split("_")[0].replace("Week", "")
    week = int(week_str) if week_str.isdigit() else 0

    pdf = pdfium.PdfDocument(str(pdf_path))
    num_pages = len(pdf)
    pdf.close()

    print(f"\n{'='*60}")
    print(f"解析: {name} ({num_pages} pages)")
    print(f"{'='*60}")

    pages = []
    for i in range(num_pages):
        print(f"  Page {i+1}/{num_pages}...", end=" ", flush=True)
        start = time.time()
        md = extract_page(str(pdf_path), i)
        elapsed = time.time() - start
        print(f"✅ ({elapsed:.1f}s)")
        pages.append({"page": i + 1, "markdown": md})

        # Rate limit: ~4s between requests (Gemini free tier = 15 RPM)
        if i < num_pages - 1:
            sleep_time = max(0, 4.0 - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

    out = {
        "source_file": name,
        "week_number": week,
        "total_pages": num_pages,
        "pages": pages,
    }

    out_path = OUTPUT_DIR / f"{name}.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    full_md = f"# {name}\n\n"
    for p in pages:
        full_md += f"---\n\n*Page {p['page']}*\n\n{p['markdown']}\n\n"

    md_path = OUTPUT_DIR / f"{name}.md"
    md_path.write_text(full_md, encoding="utf-8")

    print(f"  📄 JSON: {out_path}")
    print(f"  📝 Markdown: {md_path}")
    return out


def main():
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Found {len(pdfs)} PDFs in {PDF_DIR}")

    for pdf_path in pdfs:
        out_path = OUTPUT_DIR / f"{pdf_path.stem}.json"
        if out_path.exists():
            print(f"⏭️  Skip (already parsed): {pdf_path.stem}")
            continue
        parse_pdf(pdf_path)

    print(f"\n{'='*60}")
    print(f"✅ All done. Output in: {OUTPUT_DIR}/")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
