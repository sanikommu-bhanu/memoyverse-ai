"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthHeader } from "@/lib/firebase";

const CATS = ["All","Certifications","Projects","Internships","Academics","Achievements","Resume","Skills"];
const ICONS: Record<string,string> = {Certifications:"🏅",Projects:"🚀",Internships:"💼",Academics:"🔬",Achievements:"🏆",Resume:"📄",Skills:"⚡",Other:"📌"};

function SearchContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(sp.get("q")||"");
  const [cat, setCat] = useState(sp.get("cat")||"All");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, category: string) => {
    setLoading(true);
    const p = new URLSearchParams();
    if(query) p.set("q",query);
    if(category!=="All") p.set("cat",category);
    const headers = await getAuthHeader();
    const d = await fetch(`/api/search?${p}`, { headers }).then(r=>r.json());
    setResults(d.results||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ search(q,cat); },[cat]);

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      {/* Search header */}
      <div style={{padding:"0 16px 0",display:"flex",alignItems:"center",gap:12,marginBottom:0}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4,flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <form onSubmit={e=>{e.preventDefault();search(q,cat);}} style={{flex:1,position:"relative"}}>
          <svg style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)"}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search anything…"
            style={{width:"100%",background:"#F5F5F7",border:"1.5px solid #EAEAEA",borderRadius:14,padding:"12px 40px 12px 38px",fontSize:14,color:"#111",outline:"none",fontFamily:"inherit"}}
            autoFocus/>
          {q && <button type="button" onClick={()=>{setQ(""); search("",cat);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9A9A9E",fontSize:16}}>✕</button>}
        </form>
      </div>

      {/* Category filters */}
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"14px 16px",borderBottom:"1px solid #EAEAEA"}}>
        {CATS.map(c=>(
          <button key={c} onClick={()=>setCat(c)} className={`chip${cat===c?" active":""}`} style={{flexShrink:0,fontSize:12}}>
            {c}
          </button>
        ))}
      </div>

      <div style={{padding:"16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:12,color:"#9A9A9E"}}>{results.length} result{results.length!==1?"s":""}</span>
          {loading && <span style={{fontSize:12,color:"#9A9A9E"}}>Searching…</span>}
        </div>

        {loading ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[1,2,3].map(i=><div key={i} className="shimmer-box" style={{height:76,borderRadius:18}}/>)}
          </div>
        ) : results.length===0 ? (
          <div style={{textAlign:"center",padding:"60px 24px"}}>
            <div style={{fontSize:40,marginBottom:12}}>🔍</div>
            <p style={{fontWeight:600,color:"#111",marginBottom:6}}>No results found</p>
            <p style={{fontSize:13,color:"#9A9A9E",marginBottom:20}}>Try different keywords or upload more documents</p>
            <button onClick={()=>router.push("/upload")} className="btn btn-primary" style={{fontSize:13}}>Upload Document</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {results.map(({doc,score}:any)=>(
              <div key={doc.id} onClick={()=>router.push(`/document/${doc.id}`)}
                style={{display:"flex",alignItems:"center",gap:12,background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,padding:"14px",cursor:"pointer",transition:"box-shadow .2s"}}>
                <div style={{width:44,height:44,background:"#F5F5F7",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {ICONS[doc.cat]||"📌"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.title}</span>
                    <span style={{fontSize:10,background:"#F5F5F7",color:"#9A9A9E",padding:"2px 8px",borderRadius:999,flexShrink:0}}>{doc.cat}</span>
                  </div>
                  <div style={{fontSize:11,color:"#9A9A9E",marginTop:2}}>{doc.year} · {doc.fileName}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:"#9A9A9E"}}>Match</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{Math.round(score*100)}%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Search() {
  return (
    <Suspense fallback={<div style={{padding:20,textAlign:"center"}}>Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
