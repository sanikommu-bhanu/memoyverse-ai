"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = "All"|"Certificate"|"Project"|"Internship"|"Research"|"Achievement";
const FILTERS: Cat[] = ["All","Certificate","Project","Internship","Research","Achievement"];
const ICONS: Record<string,string> = {Certificate:"🏅",Project:"🚀",Internship:"💼",Research:"🔬",Achievement:"🏆",Resume:"📄",Other:"📌",Skill:"⚡"};
const COLORS: Record<string,string> = {Certificate:"#F59E0B",Project:"#2563EB",Internship:"#7C3AED",Research:"#059669",Achievement:"#EA580C",Resume:"#6B6B6F",Other:"#9A9A9E",Skill:"#DB2777"};

export default function Journey() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [filter, setFilter] = useState<Cat>("All");

  useEffect(() => { fetch("/api/documents").then(r=>r.json()).then(d=>setDocs(d.docs||[])); },[]);

  const sorted = [...docs]
    .filter(d => filter==="All" || d.cat===filter)
    .sort((a,b) => Number(a.year)-Number(b.year));

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      {/* Header */}
      <div style={{padding:"0 20px 0",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:"#111",margin:0}}>My Journey</h1>
            <p style={{fontSize:12,color:"#9A9A9E",margin:"4px 0 0"}}>Visual timeline of your growth</p>
          </div>
          <button onClick={()=>router.push("/upload")} style={{background:"#111",color:"#fff",border:"none",padding:"8px 16px",borderRadius:999,fontSize:12,fontWeight:600,cursor:"pointer"}}>+ Upload</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"16px 20px",borderBottom:"1px solid #EAEAEA"}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`chip${filter===f?" active":""}`} style={{flexShrink:0,fontSize:12}}>
            {f}
          </button>
        ))}
      </div>

      <div style={{padding:"24px 20px"}}>
        {sorted.length===0 ? (
          <div style={{textAlign:"center",padding:"64px 24px"}}>
            <div style={{fontSize:48,marginBottom:16}}>📅</div>
            <p style={{fontWeight:600,color:"#111",marginBottom:8}}>No entries yet</p>
            <p style={{fontSize:13,color:"#9A9A9E",marginBottom:24}}>Upload documents to build your journey timeline</p>
            <button onClick={()=>router.push("/upload")} className="btn btn-primary" style={{fontSize:13}}>Upload Now</button>
          </div>
        ) : (
          <div style={{position:"relative"}}>
            {/* Vertical line */}
            <div style={{position:"absolute",left:19,top:20,bottom:20,width:2,background:"#EAEAEA"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              {sorted.map((d,i)=>(
                <div key={d.id} className="anim-up" style={{display:"flex",gap:16,paddingBottom:24,animationDelay:`${i*50}ms`}}>
                  {/* Dot */}
                  <div style={{width:40,height:40,background:COLORS[d.cat]||"#111",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,zIndex:1,flexShrink:0,border:"3px solid #fff",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                    {ICONS[d.cat]||"📌"}
                  </div>
                  {/* Card */}
                  <div className="card" onClick={()=>router.push(`/document/${d.id}`)}
                    style={{flex:1,cursor:"pointer",padding:16,transition:"box-shadow .2s"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#9A9A9E",marginBottom:4}}>{d.year}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#111",marginBottom:4,lineHeight:1.3}}>{d.title}</div>
                    <p style={{fontSize:12,color:"#6B6B6F",margin:0,lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{d.summary}</p>
                    {d.entities?.skills?.length>0 && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
                        {d.entities.skills.slice(0,3).map((s:string)=>(
                          <span key={s} className="tag" style={{fontSize:10}}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
