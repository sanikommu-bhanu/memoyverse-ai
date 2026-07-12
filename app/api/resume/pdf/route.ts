import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/firebaseAdmin";
import { marked } from "marked";

// ── Template style definitions ─────────────────────────────────────────────────
const TEMPLATE_STYLES: Record<string, string> = {
  ATS: `
    body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #111; line-height: 1.5; margin: 0; padding: 40px; }
    h1 { font-size: 20pt; font-weight: bold; margin: 0 0 4px; border-bottom: 2px solid #111; padding-bottom: 6px; }
    h2 { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0 6px; border-bottom: 1px solid #aaa; padding-bottom: 3px; color: #222; }
    h3 { font-size: 11pt; font-weight: bold; margin: 10px 0 2px; }
    p { margin: 2px 0 8px; }
    ul { margin: 4px 0 8px; padding-left: 18px; }
    li { margin-bottom: 3px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 14px 0; }
    strong { font-weight: bold; }
  `,
  Modern: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; font-size: 10.5pt; color: #1a1a2e; line-height: 1.6; margin: 0; padding: 40px; background: #fff; }
    h1 { font-size: 28pt; font-weight: 700; margin: 0 0 4px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h2 { font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: #667eea; margin: 20px 0 8px; padding-left: 12px; border-left: 3px solid #667eea; }
    h3 { font-size: 11pt; font-weight: 600; color: #1a1a2e; margin: 10px 0 2px; }
    p { margin: 2px 0 8px; color: #444; }
    ul { margin: 4px 0 8px; padding-left: 18px; }
    li { margin-bottom: 4px; color: #444; }
    hr { border: none; border-top: 1px solid #eee; margin: 16px 0; }
    strong { color: #1a1a2e; font-weight: 600; }
  `,
  Professional: `
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Source+Sans+3:wght@400;600&display=swap');
    body { font-family: 'Source Sans 3', sans-serif; font-size: 11pt; color: #2c2c2c; line-height: 1.55; margin: 0; padding: 40px 48px; }
    h1 { font-family: 'Merriweather', serif; font-size: 22pt; font-weight: 700; margin: 0 0 6px; color: #1a1a1a; }
    h2 { font-family: 'Merriweather', serif; font-size: 11pt; font-weight: 700; color: #1a365d; margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 1.5px; }
    h3 { font-size: 11pt; font-weight: 600; margin: 10px 0 2px; color: #2c2c2c; }
    p { margin: 2px 0 8px; }
    ul { margin: 4px 0 8px; padding-left: 20px; }
    li { margin-bottom: 4px; }
    hr { border: none; border-top: 2px solid #1a365d; margin: 14px 0; }
    strong { font-weight: 600; }
  `,
  Minimal: `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
    body { font-family: 'DM Sans', sans-serif; font-size: 10.5pt; color: #333; line-height: 1.7; margin: 0; padding: 48px 56px; background: #fff; }
    h1 { font-size: 24pt; font-weight: 300; letter-spacing: -1px; margin: 0 0 4px; color: #111; }
    h2 { font-size: 9pt; font-weight: 500; text-transform: uppercase; letter-spacing: 3px; color: #888; margin: 24px 0 10px; }
    h3 { font-size: 11pt; font-weight: 500; margin: 10px 0 2px; color: #111; }
    p { margin: 2px 0 8px; color: #555; }
    ul { margin: 4px 0 8px; padding-left: 16px; list-style: none; }
    li { margin-bottom: 4px; padding-left: 12px; position: relative; color: #555; }
    li::before { content: '–'; position: absolute; left: 0; color: #bbb; }
    hr { border: none; border-top: 1px solid #eee; margin: 18px 0; }
    strong { font-weight: 500; color: #111; }
  `,
};

function buildHTML(content: string, template: string): string {
  const style = TEMPLATE_STYLES[template] ?? TEMPLATE_STYLES.ATS;
  // Convert markdown to HTML
  const body = marked.parse(content, { breaks: true }) as string;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    ${style}
    * { box-sizing: border-box; }
    @page { margin: 0; size: A4; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyToken(req.headers.get("Authorization")) ?? "local";
    if (uid === "local") console.warn("[Resume/PDF] No valid auth token — serving unauthenticated.");

    const { template = "ATS", content } = await req.json();
    if (!content) return NextResponse.json({ error: "No resume content provided" }, { status: 400 });

    const html = buildHTML(content, template);

    // Launch headless Chromium and print to PDF
    let chromium: any, puppeteer: any;
    try {
      chromium = (await import("@sparticuz/chromium")).default;
      puppeteer = (await import("puppeteer-core")).default;
    } catch {
      // Fallback: return HTML as PDF-like content if puppeteer unavailable
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html",
          "Content-Disposition": `attachment; filename="resume_${template.toLowerCase()}.html"`,
        },
      });
    }

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
    });
    await browser.close();

    const pdfBuffer = pdf instanceof Buffer ? pdf : Buffer.from(pdf);
    return new Response(pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume_${template.toLowerCase()}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[Resume/PDF] Error:", e?.message);
    return NextResponse.json({ error: e?.message || "PDF generation failed" }, { status: 500 });
  }
}
