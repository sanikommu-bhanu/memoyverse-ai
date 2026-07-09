import fs from "fs";
import path from "path";

export async function extractText(filePath: string, mime: string, name: string): Promise<string> {
  const ext = path.extname(name).toLowerCase();
  try {
    if (ext === ".pdf" || mime === "application/pdf") {
      const pp = (await import("pdf-parse")).default;
      const r = await pp(fs.readFileSync(filePath));
      return r.text || "";
    }
    if (ext === ".docx" || mime.includes("wordprocessingml")) {
      const m = await import("mammoth");
      const r = await m.extractRawText({ path: filePath });
      return r.value || "";
    }
    if ([".txt",".md",".csv",".json",".log",".html"].includes(ext) || mime.startsWith("text/")) {
      return fs.readFileSync(filePath, "utf-8");
    }
    // Best-effort binary read
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
