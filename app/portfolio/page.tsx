"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeader } from "@/lib/firebase";

const SECTIONS = ["About Me","Projects","Skills","Certifications","Experience","Contact"];
const PROJ_IMGS = ["1555066931-4365d14bab8c","1517694712202-14dd9538aa97","1607799279861-4dd421887fb3"];

export default function Portfolio() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(SECTIONS);
  const [building, setBuilding] = useState(false);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(()=>{
    getAuthHeader().then(headers => {
      fetch("/api/profile", { headers }).then(r=>r.json()).then(d=>setProfile(d.profile));
      fetch("/api/documents", { headers }).then(r=>r.json()).then(d=>{
        setProjects((d.docs||[]).filter((x:any)=>x.cat==="Projects").slice(0,3));
      });
    });
  },[]);

  const toggle = (s:string) => setSelected(c=>c.includes(s)?c.filter(x=>x!==s):[...c,s]);

  const build = async () => {
    setBuilding(true);
    await new Promise(r=>setTimeout(r,1200));
    setBuilding(false); setReady(true);
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 20px 20px",borderBottom:"1px solid #EAEAEA"}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style={{fontSize:18,fontWeight:700,color:"#111",margin:0}}>AI Portfolio Generator</h1>
          <p style={{fontSize:12,color:"#9A9A9E",margin:0}}>Build your portfolio in minutes</p>
        </div>
        {ready && <button onClick={async()=>{
          const h = await getAuthHeader();
          const token = h.Authorization ? h.Authorization.split(" ")[1] : "";
          window.open(`/api/portfolio${token ? `?token=${token}` : ""}`,"_blank");
        }} style={{marginLeft:"auto",background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:12,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",color:"#111"}}>Preview →</button>}
      </div>

      <div style={{padding:"20px"}}>
        {/* Cover preview */}
        <div style={{position:"relative",height:160,borderRadius:24,overflow:"hidden",marginBottom:20}}>
          <img src="https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=800&q=80" alt="portfolio" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.7),transparent)"}}/>
          <div style={{position:"absolute",bottom:16,left:16}}>
            <p style={{color:"#fff",fontWeight:700,fontSize:17,margin:0}}>{profile?.name||"Your Name"}</p>
            <p style={{color:"rgba(255,255,255,.75)",fontSize:12,margin:0}}>{profile?.title||"AI Enthusiast & Developer"}</p>
          </div>
        </div>

        {/* Projects preview */}
        {projects.length>0 && (
          <div style={{marginBottom:20}}>
            <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Projects ({projects.length})</p>
            <div style={{display:"flex",gap:10,overflowX:"auto"}}>
              {projects.map((p,i)=>(
                <div key={p.id} style={{minWidth:120,flexShrink:0,borderRadius:16,overflow:"hidden",border:"1px solid #EAEAEA"}}>
                  <img src={`https://images.unsplash.com/photo-${PROJ_IMGS[i%3]}?w=300&q=70`} alt={p.title} style={{width:"100%",height:80,objectFit:"cover"}}/>
                  <div style={{padding:"8px 10px",background:"#F5F5F7"}}>
                    <p style={{fontSize:11,fontWeight:600,color:"#111",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.title}</p>
                    <p style={{fontSize:10,color:"#9A9A9E",margin:0}}>{p.year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section toggles */}
        <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Select Sections</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {SECTIONS.map(s=>(
            <button key={s} onClick={()=>toggle(s)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",borderRadius:16,border:`1.5px solid ${selected.includes(s)?"#111":"#EAEAEA"}`,background:selected.includes(s)?"rgba(17,17,17,0.04)":"#fff",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${selected.includes(s)?"#111":"#EAEAEA"}`,background:selected.includes(s)?"#111":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>
                {selected.includes(s)&&<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5 3.8 7.5 8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
              </div>
              <span style={{fontSize:13,fontWeight:500,color:"#111"}}>{s}</span>
            </button>
          ))}
        </div>

        {!ready ? (
          <button onClick={build} disabled={building} className="btn btn-primary btn-full" style={{fontSize:15}}>
            {building ? (
              <span style={{display:"flex",alignItems:"center",gap:10}}>
                <div className="anim-spin" style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%"}}/>
                Building Portfolio…
              </span>
            ) : "✦ Generate Portfolio"}
          </button>
        ) : (
          <div className="anim-up" style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:20,padding:16,display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:24}}>✅</span>
              <div>
                <p style={{fontWeight:700,color:"#166534",margin:0}}>Portfolio Ready!</p>
                <p style={{fontSize:12,color:"#15803D",margin:0}}>Generated from your real documents</p>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={async()=>{
                const h = await getAuthHeader();
                const token = h.Authorization ? h.Authorization.split(" ")[1] : "";
                window.open(`/api/portfolio${token ? `?token=${token}` : ""}`,"_blank");
              }} className="btn btn-primary" style={{flex:1,height:48,fontSize:13}}>Preview →</button>
              <button onClick={async()=>{
                const html=await fetch("/api/portfolio", { headers: await getAuthHeader() }).then(r=>r.text());
                const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([html],{type:"text/html"})); a.download="portfolio.html"; a.click();
              }} className="btn btn-secondary" style={{flex:1,height:48,fontSize:13}}>Download HTML</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
