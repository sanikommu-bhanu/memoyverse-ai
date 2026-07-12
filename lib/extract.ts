import fs from "fs";
import path from "path";
import os from "os";

/** Preprocess an image buffer with sharp for higher OCR accuracy:
 *  - Convert to greyscale
 *  - Boost contrast with normalise()
 *  - Upscale if the long edge is < 1600 px
 *  Returns the path to the preprocessed temp file. */
async function preprocessImage(srcPath: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const meta = await sharp(srcPath).metadata();
  const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
  const scale = longEdge < 1600 ? Math.ceil(1600 / longEdge) : 1;

  const outPath = srcPath + "_proc.png";
  await sharp(srcPath)
    .resize(
      scale > 1 ? { width: (meta.width ?? 800) * scale, kernel: "lanczos3" } : undefined
    )
    .greyscale()
    .normalise()
    .png()
    .toFile(outPath);
  return outPath;
}

/** Run Tesseract with document-appropriate settings on a (possibly preprocessed) path. */
async function runOCR(imgPath: string): Promise<string> {
  const mod = await import("tesseract.js");
  const Tesseract = (mod as any).default || mod;
  const r = await Tesseract.recognize(imgPath, "eng", {
    tessedit_pageseg_mode: "1", // PSM.AUTO_OSD — best for mixed document photos
  });
  return r.data.text || "";
}

export async function extractText(filePath: string, mime: string, name: string): Promise<string> {
  const ext = path.extname(name).toLowerCase();
  try {
    // ── PDF ────────────────────────────────────────────────────────────────────
    if (ext === ".pdf" || mime === "application/pdf") {
      const pp = (await import("pdf-parse")).default;
      const r = await pp(fs.readFileSync(filePath));
      const text = r.text?.trim() ?? "";

      // Fix 3: if pdf-parse returned nearly nothing, it's a scanned/image PDF —
      // fall back to pdfjs-dist page rendering + OCR
      if (text.length >= 50) return text;

      console.log("[Extract] Scanned PDF detected — falling back to OCR");
      try {
        // Dynamic import of the ESM pdfjs-dist legacy build
        const pdfjsLib = await import(/* webpackIgnore: true */ "pdfjs-dist/legacy/build/pdf.mjs");
        const { createCanvas } = await import(/* webpackIgnore: true */ "canvas");
        const data = new Uint8Array(fs.readFileSync(filePath));
        const pdfDoc = await (pdfjsLib as any).getDocument({ data }).promise;
        const pageTexts: string[] = [];

        for (let i = 1; i <= Math.min(pdfDoc.numPages, 10); i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx as any, viewport }).promise;

          // Write canvas to a temp PNG, preprocess it, then OCR
          const tmpPage = path.join(os.tmpdir(), `mv_pdf_p${i}_${Date.now()}.png`);
          fs.writeFileSync(tmpPage, canvas.toBuffer("image/png"));
          let procPath = tmpPage;
          try { procPath = await preprocessImage(tmpPage); } catch { /* use raw */ }
          const pageText = await runOCR(procPath);
          pageTexts.push(pageText);
          try { fs.unlinkSync(tmpPage); } catch {}
          if (procPath !== tmpPage) try { fs.unlinkSync(procPath); } catch {}
        }
        return pageTexts.join("\n\n").trim() || `File: ${name}`;
      } catch (ocrErr: any) {
        console.warn("[Extract] PDF OCR fallback failed:", ocrErr?.message);
        return text || `File: ${name}`;
      }
    }

    // ── DOCX ───────────────────────────────────────────────────────────────────
    if (ext === ".docx" || mime.includes("wordprocessingml")) {
      const m = await import("mammoth");
      const r = await m.extractRawText({ path: filePath });
      return r.value || "";
    }

    // ── Plain text variants ────────────────────────────────────────────────────
    if ([".txt",".md",".csv",".json",".log",".html"].includes(ext) || mime.startsWith("text/")) {
      return fs.readFileSync(filePath, "utf-8");
    }

    // ── Images — preprocess with sharp before Tesseract ───────────────────────
    if ([".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"].includes(ext) || mime.startsWith("image/")) {
      let procPath = filePath;
      try { procPath = await preprocessImage(filePath); } catch { /* use raw */ }
      const text = await runOCR(procPath);
      if (procPath !== filePath) try { fs.unlinkSync(procPath); } catch {}
      return text;
    }

    // ── Best-effort binary read ────────────────────────────────────────────────
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const clean = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{4,}/g, " ").trim();
      if (clean.length > 60) return clean.slice(0, 10000);
    } catch { /* binary */ }
    return `File: ${name}`;
  } catch (e: any) {
    return `File: ${name} — ${e?.message ?? "extraction error"}`;
  }
}
