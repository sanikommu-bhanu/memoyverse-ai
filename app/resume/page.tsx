"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeader } from "@/lib/firebase";

const TEMPLATES = [
  {k:"ATS",l:"ATS",d:"Keyword-optimized for applicant tracking systems"},
  {k:"Modern",l:"Modern",d:"Clean contemporary layout"},
  {k:"Professional",l:"Professional",d:"Traditional format for top companies"},
  {k:"Minimal",l:"Minimal",d:"Distraction-free elegant one-pager"},
];

export default function Resume() {
  const router = useRouter();
  const [tmpl, setTmpl] = useState("ATS");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true); setResume("");
    try {
      const headers: any = { "Content-Type": "application/json", ...(await getAuthHeader()) };
      const r = await fetch("/api/resume",{method:"POST",headers,body:JSON.stringify({template:tmpl})});
      const d = await r.json();
      setResume(d.resume||"");
    } finally { setLoading(false); }
  };

  const copy = () => { navigator.clipboard.writeText(resume); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const headers: any = { "Content-Type": "application/json", ...(await getAuthHeader()) };
      const res = await fetch("/api/resume/pdf", {
        method: "POST",
        headers,
        body: JSON.stringify({ template: tmpl, content: resume }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `resume_${tmpl.toLowerCase()}.pdf`;
      a.click();
    } catch (e: any) {
      // Fallback to markdown download
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([resume], { type: "text/plain" }));
      a.download = `resume_${tmpl.toLowerCase()}.md`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 20px 20px",borderBottom:"1px solid #EAEAEA"}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{fontSize:18,fontWeight:700,color:"#111",margin:0}}>AI Resume Builder</h1>
          <p style={{fontSize:12,color:"#9A9A9E",margin:0}}>Create professional resumes</p>
        </div>
      </div>

      <div style={{padding:"20px"}}>
        {/* Templates */}
        <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Choose Template</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {TEMPLATES.map(t=>(
            <div key={t.k} onClick={()=>setTmpl(t.k)}
              style={{background:tmpl===t.k?"#111":"#F5F5F7",border:`2px solid ${tmpl===t.k?"#111":"#EAEAEA"}`,borderRadius:20,padding:16,cursor:"pointer",transition:"all .2s"}}>
              {/* Mini resume preview */}
              <div style={{background:tmpl===t.k?"rgba(255,255,255,0.15)":"#E5E5E7",borderRadius:10,padding:"10px 8px",marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
                {[80,60,70].map((w,i)=><div key={i} style={{height:3,width:`${w}%`,background:tmpl===t.k?"rgba(255,255,255,0.5)":"#C5C5C7",borderRadius:2}}/>)}
              </div>
              <div style={{fontSize:13,fontWeight:700,color:tmpl===t.k?"#fff":"#111"}}>{t.l}</div>
              <div style={{fontSize:11,color:tmpl===t.k?"rgba(255,255,255,0.65)":"#9A9A9E",marginTop:2,lineHeight:1.4}}>{t.d}</div>
            </div>
          ))}
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={loading} className="btn btn-primary btn-full" style={{marginBottom:24,fontSize:15}}>
          {loading ? (
            <span style={{display:"flex",alignItems:"center",gap:10}}>
              <div className="anim-spin" style={{width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%"}}/>
              Generating with AI…
            </span>
          ) : "✦ Generate Resume"}
        </button>

        {/* Result */}
        {resume && (
          <div className="anim-up">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <p style={{fontSize:14,fontWeight:700,color:"#111",margin:0}}>Your Resume</p>
              <div style={{display:"flex",gap:8}}>
                <button onClick={copy} style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:12,padding:"7px 14px",fontSize:12,fontWeight:500,cursor:"pointer",color:"#111"}}>
                  {copied?"✓ Copied":"Copy"}
                </button>
                <button onClick={download} disabled={downloading} style={{background:"#111",color:"#fff",border:"none",borderRadius:12,padding:"7px 14px",fontSize:12,fontWeight:500,cursor:"pointer",opacity:downloading?0.7:1}}>
                  {downloading ? "Generating…" : "Download PDF"}
                </button>
              </div>
            </div>
            <div style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:20,padding:16,fontFamily:"monospace",fontSize:12,lineHeight:1.75,color:"#111",whiteSpace:"pre-wrap",maxHeight:480,overflowY:"auto",wordBreak:"break-word"}}>
              {resume}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
