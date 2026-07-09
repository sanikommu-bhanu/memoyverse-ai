"use client";
import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Scanning document…","Extracting text (OCR)…","Identifying skills…","Detecting entities…","Generating embedding…","Building knowledge graph…","Finalizing…"];

const SOURCES = [
  {k:"camera",l:"Camera",e:"📷"},
  {k:"gallery",l:"Gallery",e:"🖼️"},
  {k:"files",l:"Files",e:"📄"},
  {k:"drive",l:"Google Drive",e:"🟢"},
  {k:"onedrive",l:"OneDrive",e:"🔵"},
  {k:"github",l:"GitHub",e:"🐙"},
  {k:"linkedin",l:"LinkedIn",e:"💼"},
  {k:"notion",l:"Notion",e:"⬜"},
  {k:"link",l:"Link / URL",e:"🔗"},
];

function ProcessingUI({prog,step}:{prog:number;step:number}){
  const r=68,c=2*Math.PI*r,off=c-(c*prog/100);
  return (
    <div style={{minHeight:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",padding:"40px 32px"}}>
      <h2 style={{fontSize:20,fontWeight:700,textAlign:"center",marginBottom:6}}>Processing Your Document</h2>
      <p style={{fontSize:13,color:"#9A9A9E",textAlign:"center",marginBottom:40}}>Our AI is understanding your content</p>
      <svg width={160} height={160} style={{marginBottom:40}}>
        <circle cx={80} cy={80} r={r} fill="none" stroke="#F5F5F7" strokeWidth={10}/>
        <circle cx={80} cy={80} r={r} fill="none" stroke="#111" strokeWidth={10}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset .4s ease"}}/>
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={700} fill="#111">{prog}%</text>
      </svg>
      <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:12,opacity:i>step?.5:1,transition:"opacity .3s"}}>
            <div style={{width:22,height:22,borderRadius:"50%",background:i<step?"#16a34a":i===step?"#111":"#F5F5F7",border:i>=step&&i!==step?"1.5px solid #EAEAEA":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .3s"}}>
              {i<step?<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>:i===step?<div className="anim-spin" style={{width:10,height:10,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%"}}/>:null}
            </div>
            <span style={{fontSize:13,fontWeight:i===step?600:400,color:i<=step?"#111":"#9A9A9E"}}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Upload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [proc, setProc] = useState(false);
  const [prog, setProg] = useState(0);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");

  const runUpload = async (file: File) => {
    setProc(true); setProg(0); setStep(0); setErr("");
    const iv = setInterval(() => {
      setProg(p => { const n=Math.min(p + 10 + Math.random()*8, 88); return n; });
      setStep(s => Math.min(s+1, STEPS.length-2));
    }, 700);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method:"POST", body:fd });
      clearInterval(iv);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error||"Upload failed"); }
      const { doc } = await res.json();
      setProg(100); setStep(STEPS.length-1);
      await new Promise(r => setTimeout(r, 600));
      router.push(`/document/${doc.id}`);
    } catch(e:any) {
      clearInterval(iv); setErr(e.message); setProc(false);
    }
  };

  const onFiles = (files: FileList|null) => { if(files?.[0]) runUpload(files[0]); };
  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }, []);

  const handleSource = async (k: string) => {
    if (k==="files") { fileRef.current?.click(); return; }
    if (k==="camera") { camRef.current?.click(); return; }
    if (k==="gallery") { fileRef.current?.click(); return; }
    if (k==="github") {
      const r = await fetch("/api/connect/github", {method:"POST"});
      const d = await r.json();
      if (d.error==="GitHub not connected") router.push("/settings");
      else { alert(`✅ Imported ${d.count} GitHub repos!`); router.push("/home"); }
      return;
    }
    if (k==="drive") {
      const r = await fetch("/api/connect/drive", {method:"POST"});
      const d = await r.json();
      if (d.error?.includes("not connected")) router.push("/settings");
      else { alert(`✅ Imported ${d.count} Drive files!`); router.push("/home"); }
      return;
    }
    if (k==="linkedin") {
      const r = await fetch("/api/connect/linkedin", {method:"POST"});
      const d = await r.json();
      if (d.error?.includes("not connected")) router.push("/settings");
      else { alert(`✅ LinkedIn profile imported!`); router.push("/home"); }
      return;
    }
    if (k==="onedrive") {
      const r = await fetch("/api/connect/onedrive", {method:"POST"});
      const d = await r.json();
      if (d.error?.includes("not connected")) router.push("/settings");
      else { alert(`✅ Imported ${d.count} OneDrive files!`); router.push("/home"); }
      return;
    }
    alert(`Connect ${k} in Settings to enable this integration.`);
  };

  if (proc) return <ProcessingUI prog={prog} step={step}/>;

  return (
    <div style={{minHeight:"100dvh",background:"#fff",padding:"56px 20px 20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#111",margin:0}}>Upload Your Content</h1>
          <p style={{fontSize:12,color:"#9A9A9E",margin:0}}>Add documents from anywhere</p>
        </div>
      </div>

      {err && <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:16,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#DC2626"}}>{err}</div>}

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" hidden accept=".pdf,.docx,.txt,.csv,.md,.json" onChange={e=>onFiles(e.target.files)}/>
      <input ref={camRef} type="file" hidden accept="image/*" capture="environment" onChange={e=>onFiles(e.target.files)}/>

      {/* Drop zone */}
      <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={onDrop}
        onClick={()=>fileRef.current?.click()}
        style={{border:`2px dashed ${drag?"#111":"#EAEAEA"}`,borderRadius:28,padding:"48px 24px",
          textAlign:"center",background:drag?"#F5F5F7":"#FAFAFA",cursor:"pointer",marginBottom:28,transition:"all .2s"}}>
        <div style={{fontSize:36,marginBottom:12}}>☁️</div>
        <p style={{fontWeight:600,color:"#111",marginBottom:4}}>Drag & drop files here</p>
        <p style={{fontSize:13,color:"#9A9A9E"}}>or tap to browse</p>
      </div>

      {/* Sources grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {SOURCES.map(s => (
          <button key={s.k} onClick={()=>handleSource(s.k)}
            style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:20,padding:"16px 8px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",transition:"all .15s"}}>
            <span style={{fontSize:26}}>{s.e}</span>
            <span style={{fontSize:11,fontWeight:500,color:"#111"}}>{s.l}</span>
          </button>
        ))}
      </div>

      <p style={{textAlign:"center",fontSize:11,color:"#9A9A9E"}}>
        We support PDF, DOC, DOCX, TXT, PPT, PNG, JPG. Max 50MB.
      </p>
    </div>
  );
}
