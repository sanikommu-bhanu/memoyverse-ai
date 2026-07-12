"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuthHeader } from "@/lib/firebase";

const CAT_ICONS: Record<string,string> = {Certificate:"🏅",Project:"🚀",Internship:"💼",Skill:"⚡",Research:"🔬",Achievement:"🏆",Resume:"📄",Other:"📌"};

export default function DocDetail() {
  const {id} = useParams<{id:string}>();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [all, setAll] = useState<any[]>([]);

  useEffect(() => {
    getAuthHeader().then(headers => {
      fetch("/api/documents", { headers }).then(r=>r.json()).then(d=>{
        const docs = d.docs||[];
        setAll(docs);
        setDoc(docs.find((x:any)=>x.id===id)||null);
      });
    });
  },[id]);

  const related = all.filter(d=>d.id!==id&&((d.entities?.skills || []).some((s:string)=>(doc?.entities?.skills || []).includes(s))||d.cat===doc?.cat)).slice(0,3);

  const del = async () => {
    if(!confirm("Delete this document?")) return;
    const headers: any = { "Content-Type": "application/json", ...(await getAuthHeader()) };
    await fetch("/api/documents",{method:"DELETE",headers,body:JSON.stringify({id})});
    router.push("/home");
  };

  if (!doc) return (
    <div style={{minHeight:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="anim-spin" style={{width:36,height:36,border:"3px solid #EAEAEA",borderTopColor:"#111",borderRadius:"50%"}}/>
    </div>
  );

  return (
    <div style={{minHeight:"100dvh",background:"#fff",padding:"56px 20px 20px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#111",fontWeight:500,fontSize:14}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Document Overview
        </button>
        <button onClick={del} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#DC2626",fontWeight:500}}>Delete</button>
      </div>

      {/* Hero card */}
      <div className="soft-card" style={{marginBottom:16,position:"relative"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
          <div style={{width:52,height:52,background:"#fff",border:"1px solid #EAEAEA",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
            {CAT_ICONS[doc.cat]||"📌"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontSize:17,fontWeight:700,color:"#111",margin:0,lineHeight:1.3}}>{doc.title}</h2>
            <p style={{fontSize:11,color:"#9A9A9E",margin:"4px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.fileName}</p>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:10,color:"#9A9A9E"}}>Confidence Score</div>
            <div style={{fontSize:18,fontWeight:800,color:"#16a34a"}}>{doc.confidence}%</div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[{l:"Type",v:doc.cat},{l:"Year",v:doc.year},{l:"Uploaded",v:new Date(doc.uploadedAt).toLocaleDateString()},{l:"Source",v:doc.source||"Upload"}].map(r=>(
          <div key={r.l} className="card-sm" style={{padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>{r.l}</div>
            <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{r.v}</div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card-sm" style={{marginBottom:16}}>
        <div style={{fontSize:10,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:8,fontWeight:600}}>Summary</div>
        <p style={{fontSize:13,color:"#6B6B6F",lineHeight:1.65,margin:0}}>{doc.summary}</p>
      </div>

      {/* Skills */}
      {doc.entities?.skills?.length > 0 && (
        <div className="card-sm" style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:10,fontWeight:600}}>Detected Skills</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {doc.entities.skills.map((s:string)=>(
              <span key={s} onClick={()=>router.push(`/search?q=${encodeURIComponent(s)}`)} className="tag" style={{cursor:"pointer"}}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Organizations */}
      {doc.entities?.orgs?.length > 0 && (
        <div className="card-sm" style={{marginBottom:16}}>
          <div style={{fontSize:10,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:10,fontWeight:600}}>Organizations</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {doc.entities.orgs.map((o:string)=><span key={o} className="tag">{o}</span>)}
          </div>
        </div>
      )}

      {/* Related */}
      {related.length > 0 && (
        <div>
          <div style={{fontSize:10,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:10,fontWeight:600}}>Linked To</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {related.map((r:any)=>(
              <div key={r.id} onClick={()=>router.push(`/document/${r.id}`)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#F5F5F7",borderRadius:16,cursor:"pointer"}}>
                <span style={{fontSize:18}}>{CAT_ICONS[r.cat]||"📌"}</span>
                <span style={{flex:1,fontSize:13,fontWeight:500,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
