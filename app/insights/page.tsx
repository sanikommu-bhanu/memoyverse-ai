"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthHeader } from "@/lib/firebase";

function Ring({p,size=96,sw=8,color="#111"}:{p:number;size?:number;sw?:number;color?:string}){
  const r=(size-sw)/2,c=2*Math.PI*r,off=c-(c*Math.min(100,p))/100;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F5F5F7" strokeWidth={sw}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset .9s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={size/5.5} fontWeight="700" fill={color}>{Math.round(p)}%</text>
    </svg>
  );
}

function Bar({label,pct}:{label:string;pct:number}){
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:13,fontWeight:500,color:"#111"}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color:"#111"}}>{pct}%</span>
      </div>
      <div style={{height:6,background:"#F5F5F7",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:"#111",borderRadius:3,transition:"width 1s ease"}}/>
      </div>
    </div>
  );
}

export default function Insights() {
  const router = useRouter();
  const [ins, setIns] = useState<any>(null);

  useEffect(()=>{
    getAuthHeader().then(headers => {
      fetch("/api/insights", { headers }).then(r=>r.json()).then(setIns);
    });
  },[]);

  if (!ins) return (
    <div style={{height:"100dvh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="anim-spin" style={{width:36,height:36,border:"3px solid #EAEAEA",borderTopColor:"#111",borderRadius:"50%"}}/>
    </div>
  );

  const skillBars = ins.topSkills.slice(0,6).map((s:string,i:number)=>({label:s,pct:Math.max(40,95-i*9)}));

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      <div style={{padding:"0 20px 20px",borderBottom:"1px solid #EAEAEA"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#111",margin:0}}>Career Insights</h1>
        <p style={{fontSize:12,color:"#9A9A9E",margin:"4px 0 0"}}>AI-computed from {ins.totalDocs} document{ins.totalDocs!==1?"s":""}</p>
      </div>

      <div style={{padding:"20px",display:"flex",flexDirection:"column",gap:16}}>
        {/* Readiness hero */}
        <div className="soft-card" style={{display:"flex",alignItems:"center",gap:20}}>
          <Ring p={ins.readiness} size={96} sw={9}/>
          <div style={{flex:1}}>
            <p style={{fontSize:10,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:0}}>Job Readiness</p>
            <p style={{fontSize:16,fontWeight:700,color:"#111",margin:"6px 0 6px",lineHeight:1.3}}>
              You're {ins.readiness}% ready for <span style={{borderBottom:"2px solid #111"}}>AI Engineer</span> roles.
            </p>
            <p style={{fontSize:12,color:"#6B6B6F",margin:0}}>
              {ins.missingSkills[0]?`Next: ${ins.missingSkills[0]}`:"All core areas covered!"}
            </p>
          </div>
        </div>

        {/* Score cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div className="card" style={{textAlign:"center",padding:"20px 12px"}}>
            <Ring p={ins.resumeScore} size={68} sw={6} color="#2563EB"/>
            <p style={{fontSize:12,fontWeight:600,color:"#111",margin:"10px 0 0"}}>Resume Score</p>
          </div>
          <div className="card" style={{textAlign:"center",padding:"20px 12px"}}>
            <Ring p={ins.portfolioScore} size={68} sw={6} color="#7C3AED"/>
            <p style={{fontSize:12,fontWeight:600,color:"#111",margin:"10px 0 0"}}>Portfolio Score</p>
          </div>
        </div>

        {/* Breakdown */}
        <div className="card">
          <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:14}}>Document Breakdown</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {[{l:"Certificates",v:ins.breakdown.certs,e:"🏅"},{l:"Projects",v:ins.breakdown.projects,e:"🚀"},{l:"Internships",v:ins.breakdown.internships,e:"💼"},{l:"Research",v:ins.breakdown.research,e:"🔬"},{l:"Achievements",v:ins.breakdown.achievements,e:"🏆"},{l:"Total",v:ins.totalDocs,e:"📁"}].map(x=>(
              <div key={x.l} style={{textAlign:"center",background:"#F5F5F7",borderRadius:14,padding:"12px 6px"}}>
                <div style={{fontSize:20,marginBottom:4}}>{x.e}</div>
                <div style={{fontSize:20,fontWeight:800,color:"#111"}}>{x.v}</div>
                <div style={{fontSize:10,color:"#9A9A9E",marginTop:2}}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top skills */}
        {skillBars.length>0 && (
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:0}}>Top Technologies</p>
              <span onClick={()=>router.push("/search")} style={{fontSize:11,color:"#9A9A9E",cursor:"pointer"}}>View all →</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {skillBars.map((b:any)=><Bar key={b.label} label={b.label} pct={b.pct}/>)}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {ins.missingSkills.length>0 && (
          <div className="card">
            <p style={{fontSize:11,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,marginBottom:12}}>Suggested Next Steps</p>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {ins.missingSkills.map((m:string)=>(
                <div key={m} style={{display:"flex",gap:12,padding:"12px 14px",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:16,alignItems:"flex-start"}}>
                  <span style={{fontSize:18,flexShrink:0}}>⚡</span>
                  <div>
                    <p style={{fontWeight:600,color:"#92400E",fontSize:13,margin:0}}>{m}</p>
                    <p style={{fontSize:11,color:"#B45309",margin:"2px 0 0"}}>Will boost your readiness score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div className="card" onClick={()=>router.push("/resume")} style={{textAlign:"center",padding:"20px 12px",cursor:"pointer"}}>
            <span style={{fontSize:28}}>📄</span>
            <p style={{fontWeight:600,fontSize:13,color:"#111",margin:"8px 0 2px"}}>Generate Resume</p>
            <p style={{fontSize:11,color:"#9A9A9E",margin:0}}>ATS-optimized</p>
          </div>
          <div className="card" onClick={()=>router.push("/portfolio")} style={{textAlign:"center",padding:"20px 12px",cursor:"pointer"}}>
            <span style={{fontSize:28}}>🌐</span>
            <p style={{fontWeight:600,fontSize:13,color:"#111",margin:"8px 0 2px"}}>Build Portfolio</p>
            <p style={{fontSize:11,color:"#9A9A9E",margin:0}}>Deployable HTML</p>
          </div>
        </div>
      </div>
    </div>
  );
}
