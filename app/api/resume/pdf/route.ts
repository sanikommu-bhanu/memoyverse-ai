import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/firebaseAdmin";
import { marked } from "marked";

// ── Template style definitions ─────────────────────────────────────────────────
const TEMPLATE_STYLES: Record<string, string> = {
  ATS: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    body { font-family: 'Arial', 'Inter', sans-serif; font-size: 10.5pt; color: #000; line-height: 1.4; margin: 0; padding: 40px 48px; background: #fff; }
    h1 { font-size: 22pt; font-weight: bold; margin: 0 0 4px; text-align: center; }
    h1 + p { text-align: center; font-size: 9.5pt; margin-bottom: 16px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 16px 0 8px; border-bottom: 1.5px solid #000; padding-bottom: 4px; color: #000; }
    h3 { font-size: 10.5pt; font-weight: bold; margin: 8px 0 2px; display: inline-block; }
    p { margin: 2px 0 6px; }
    ul { margin: 4px 0 8px; padding-left: 24px; }
    li { margin-bottom: 3px; }
    hr { display: none; }
    strong { font-weight: 600; }
    em { font-style: italic; }
  `,
  Modern: `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    body { font-family: 'Roboto', sans-serif; font-size: 10.5pt; color: #222; line-height: 1.5; margin: 0; padding: 48px; background: #fff; }
    h1 { font-size: 26pt; font-weight: 700; margin: 0 0 2px; color: #111; letter-spacing: -0.5px; }
    h1 + p { font-size: 9.5pt; color: #555; margin-bottom: 20px; }
    h2 { font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #3b82f6; margin: 24px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 11pt; font-weight: 700; color: #111; margin: 12px 0 2px; }
    p { margin: 2px 0 6px; color: #333; }
    ul { margin: 6px 0 10px; padding-left: 20px; }
    li { margin-bottom: 4px; color: #333; }
    hr { display: none; }
    strong { font-weight: 700; color: #111; }
  `,
  Professional: `
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
    body { font-family: 'Open Sans', sans-serif; font-size: 10pt; color: #000; line-height: 1.5; margin: 0; padding: 48px; background: #fff; }
    h1 { font-family: 'Merriweather', serif; font-size: 24pt; font-weight: 700; margin: 0 0 4px; text-align: center; }
    h1 + p { text-align: center; font-size: 9.5pt; margin-bottom: 20px; border-top: 1px solid #000; border-bottom: 3px double #000; padding: 6px 0; }
    h2 { font-family: 'Merriweather', serif; font-size: 12pt; font-weight: 700; color: #000; margin: 20px 0 12px; text-transform: capitalize; display: flex; align-items: center; justify-content: center; text-align: center; }
    h2::before, h2::after { content: ""; flex: 1; border-bottom: 1px solid #000; margin: 0 15px; }
    h3 { font-size: 10.5pt; font-weight: 600; margin: 10px 0 2px; color: #000; }
    p { margin: 2px 0 6px; }
    ul { margin: 4px 0 8px; padding-left: 24px; }
    li { margin-bottom: 3px; }
    hr { display: none; }
    strong { font-weight: 600; }
  `,
  Minimal: `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');
    body { font-family: 'DM Sans', sans-serif; font-size: 10pt; color: #333; line-height: 1.6; margin: 0; padding: 56px 64px; background: #fff; }
    h1 { font-size: 22pt; font-weight: 300; letter-spacing: -1px; margin: 0 0 8px; color: #000; text-align: center; }
    h1 + p { text-align: center; font-size: 9pt; color: #666; margin-bottom: 32px; }
    h2 { font-size: 9pt; font-weight: 500; text-transform: uppercase; letter-spacing: 3px; color: #000; margin: 24px 0 12px; text-align: center; }
    h3 { font-size: 10.5pt; font-weight: 500; margin: 12px 0 2px; color: #111; }
    p { margin: 2px 0 8px; color: #444; }
    ul { margin: 6px 0 12px; padding-left: 16px; list-style: none; }
    li { margin-bottom: 4px; padding-left: 12px; position: relative; color: #444; }
    li::before { content: '–'; position: absolute; left: 0; color: #aaa; }
    hr { display: none; }
    strong { font-weight: 500; color: #000; }
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
