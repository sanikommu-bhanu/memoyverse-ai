"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

const HERO = "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900&q=80";
const AVATAR = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80";

function Ring({p,size=72,sw=7}:{p:number;size?:number;sw?:number}){
  const r=(size-sw)/2,c=2*Math.PI*r,off=c-(c*Math.min(100,p))/100;
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F5F5F7" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#111" strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset .8s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size/5} fontWeight="700" fill="#111">{Math.round(p)}%</text>
    </svg>
  );
}

const STAT_CATS = [
  {k:"Certifications",l:"Certifications",e:"🏅"},{k:"Projects",l:"Projects",e:"🚀"},
  {k:"Internships",l:"Internships",e:"💼"},{k:"Resume",l:"Resume",e:"📄"},
  {k:"Academics",l:"Research",e:"🔬"},{k:"Achievements",l:"Achievements",e:"🏆"},
];
const CAT_CHIPS = [
  {k:"Certifications",l:"Certifications",e:"🏅"},{k:"Projects",l:"Projects",e:"🚀"},
  {k:"Internships",l:"Internships",e:"💼"},{k:"Skills",l:"Skills",e:"⚡"},
  {k:"Resume",l:"Resume",e:"📄"},{k:"Academics",l:"Research",e:"🔬"},
  {k:"Achievements",l:"Achievements",e:"🏆"},
];

export default function Home() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [ins, setIns] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [activeCat, setActiveCat] = useState("");
  const [unread, setUnread] = useState(0);

  const hour = new Date().getHours();
  const greet = hour<12?"Good Morning":hour<18?"Good Afternoon":"Good Evening";
  const name = user?.name?.split(" ")[0] || "there";

  const getAuthHeader = async () => {
    if (!isFirebaseConfigured()) return {};
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return {};
    return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
  };

  useEffect(() => {
    const auth = localStorage.getItem("mv_auth");
    if (!auth) { router.replace("/auth"); return; }
    setUser(JSON.parse(auth));

    const notifs = JSON.parse(localStorage.getItem("mv_notifications")||"[]");
    setUnread(notifs.filter((n:any)=>!n.read).length);

    (async () => {
      const headers = await getAuthHeader();
      const [docsRes, insRes] = await Promise.all([
        fetch("/api/documents", { headers }),
        fetch("/api/insights", { headers }),
      ]);
      setDocs((await docsRes.json()).docs || []);
      setIns(await insRes.json());
    })();
  }, []);

  const counts = useMemo(() => {
    const c: Record<string,number>={};
    docs.forEach(d=>{c[d.cat]=(c[d.cat]||0)+1;});
    return c;
  }, [docs]);

  return (
    <div className="anim-in">
      {/* Hero */}
      <div style={{position:"relative",height:220,overflow:"hidden"}}>
        <img src={HERO} alt="workspace" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.65))"}}/>
        <div style={{position:"absolute",top:16,right:16,display:"flex",gap:10}}>
          <button onClick={()=>router.push("/notifications")} style={{width:36,height:36,borderRadius:18,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unread>0&&<div style={{position:"absolute",top:6,right:6,width:8,height:8,borderRadius:"50%",background:"#EF4444",border:"2px solid rgba(0,0,0,0.3)"}}/>}
          </button>
        </div>
        <div style={{position:"absolute",bottom:20,left:20,right:20,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <p style={{color:"rgba(255,255,255,0.75)",fontSize:13,marginBottom:2}}>{greet}</p>
            <h1 style={{color:"#fff",fontSize:24,fontWeight:800,margin:0}}>{name} 👋</h1>
            <p style={{color:"rgba(255,255,255,0.65)",fontSize:12,marginTop:2}}>Ready to grow today?</p>
          </div>
          <img src={AVATAR} alt="avatar" onClick={()=>router.push("/profile")} style={{width:44,height:44,borderRadius:"50%",border:"2px solid #fff",objectFit:"cover",cursor:"pointer"}}/>
        </div>
      </div>

      <div style={{padding:"20px 20px 0"}}>
        {/* Search */}
        <div onClick={()=>router.push("/search")} style={{display:"flex",alignItems:"center",gap:10,background:"#F5F5F7",border:"1.5px solid #EAEAEA",borderRadius:18,padding:"14px 16px",cursor:"pointer",marginBottom:20}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span style={{fontSize:14,color:"#9A9A9E"}}>Ask MemoryVerse...</span>
        </div>

        {/* Category chips */}
        <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4,marginBottom:20}}>
          {CAT_CHIPS.map(c=>(
            <button key={c.k} onClick={()=>{setActiveCat(c.k);router.push(`/search?cat=${c.k}`);}}
              className={`chip${activeCat===c.k?" active":""}`} style={{flexShrink:0}}>
              {c.e} {c.l}
            </button>
          ))}
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
          {STAT_CATS.map(s=>(
            <div key={s.k} className="soft-card" onClick={()=>router.push(`/search?cat=${s.k}`)}
              style={{textAlign:"center",cursor:"pointer",padding:"14px 8px"}}>
              <div style={{fontSize:22,marginBottom:4}}>{s.e}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#111"}}>{counts[s.k]||0}</div>
              <div style={{fontSize:11,color:"#9A9A9E",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        {ins && (
          <div className="card" style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,background:"#F5F5F7",border:"1px solid #EAEAEA"}}>
            <div style={{flex:1}}>
              <span style={{fontSize:10,fontWeight:700,color:"#9A9A9E",letterSpacing:1,textTransform:"uppercase"}}>AI Insight</span>
              <p style={{fontSize:15,fontWeight:700,color:"#111",margin:"6px 0 4px",lineHeight:1.3}}>
                You're {ins.readiness}% ready for AI Engineer roles.
              </p>
              <p style={{fontSize:12,color:"#6B6B6F",lineHeight:1.4}}>
                {ins.missingSkills[0]?`Complete: ${ins.missingSkills[0]}`:"Strong profile — keep building!"}
              </p>
              <button onClick={()=>router.push("/insights")} style={{marginTop:10,fontSize:11,fontWeight:600,color:"#111",background:"#fff",border:"1px solid #EAEAEA",padding:"6px 14px",borderRadius:999,cursor:"pointer"}}>
                View Insights →
              </button>
            </div>
            <Ring p={ins.readiness}/>
          </div>
        )}

        {/* Quick actions row */}
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          {[{l:"Resume",e:"📄",p:"/resume"},{l:"Portfolio",e:"🌐",p:"/portfolio"},{l:"Graph",e:"⬡",p:"/graph"},{l:"Insights",e:"📊",p:"/insights"}].map(a=>(
            <button key={a.l} onClick={()=>router.push(a.p)} style={{flex:1,background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:18,padding:"12px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",transition:"all .15s"}}>
              <span style={{fontSize:20}}>{a.e}</span>
              <span style={{fontSize:10,fontWeight:500,color:"#6B6B6F"}}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* Journey Timeline */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h2 style={{fontSize:16,fontWeight:700,color:"#111",margin:0}}>Journey Timeline</h2>
          <span onClick={()=>router.push("/journey")} style={{fontSize:12,color:"#9A9A9E",cursor:"pointer",fontWeight:500}}>View All</span>
        </div>

        {docs.length===0 ? (
          <div className="soft-card" style={{textAlign:"center",padding:"32px 20px",marginBottom:20}}>
            <div style={{fontSize:36,marginBottom:12}}>📁</div>
            <p style={{fontWeight:600,color:"#111",marginBottom:6}}>No documents yet</p>
            <p style={{fontSize:13,color:"#9A9A9E",marginBottom:16}}>Upload your first document to start your AI journey</p>
            <button onClick={()=>router.push("/upload")} className="btn btn-primary" style={{fontSize:13,padding:"10px 24px"}}>Upload Now</button>
          </div>
        ) : (
          <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4,marginBottom:4}}>
            {docs.slice(0,6).map(d=>(
              <div key={d.id} className="card" onClick={()=>router.push(`/document/${d.id}`)}
                style={{minWidth:140,flexShrink:0,cursor:"pointer",padding:14}}>
                <div style={{fontSize:10,fontWeight:700,color:"#9A9A9E",marginBottom:4}}>{d.year}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#111",lineHeight:1.3,marginBottom:8,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{d.title}</div>
                <span className="tag" style={{fontSize:10}}>{d.cat}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
