"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const PALETTE = ["#111","#2563EB","#7C3AED","#059669","#EA580C","#DB2777","#0891B2","#4F46E5"];

export default function Graph() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [hovered, setHovered] = useState<string|null>(null);
  const [W, setW] = useState(390);
  const H = 460;

  useEffect(() => {
    setW(Math.min(window.innerWidth, 430));
    fetch("/api/documents").then(r=>r.json()).then(d=>{
      const docs = d.docs || [];
      setDocs(docs);
      buildGraph(docs, Math.min(window.innerWidth, 430));
    });
  },[]);

  const buildGraph = (docs: any[], w: number) => {
    const cx = w/2, cy = H/2 - 20;
    const skillCount: Record<string,number> = {};
    docs.forEach(d => d.entities?.skills?.forEach((s:string) => { skillCount[s]=(skillCount[s]||0)+1; }));
    const topSkills = Object.entries(skillCount).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([s])=>s);

    const ns: any[] = [{ id:"you", label:"You", type:"center", x:cx, y:cy, color:"#111", r:38 }];
    const es: any[] = [];

    topSkills.forEach((skill, i) => {
      const angle = (i/topSkills.length)*Math.PI*2 - Math.PI/2;
      const rr = Math.min(cx,cy)*0.58;
      const id = `skill_${i}`;
      ns.push({ id, label:skill, type:"skill", x:cx+rr*Math.cos(angle), y:cy+rr*Math.sin(angle), color:PALETTE[(i+1)%PALETTE.length], r:30 });
      es.push({ from:"you", to:id });
    });

    docs.slice(0,5).forEach((doc, i) => {
      const angle = (i/Math.max(5,docs.length))*Math.PI*2 - Math.PI/3;
      const rr = Math.min(cx,cy)*0.9;
      const nid = `doc_${i}`;
      ns.push({ id:nid, label:doc.title.slice(0,16), type:"doc", x:cx+rr*Math.cos(angle), y:cy+rr*Math.sin(angle), color:"#374151", r:22, docId:doc.id });
      const skill = doc.entities?.skills?.[0];
      const skillNode = skill ? ns.find(n=>n.label===skill) : null;
      es.push({ from: skillNode ? skillNode.id : "you", to:nid });
    });

    setNodes(ns); setEdges(es);
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      <div style={{padding:"0 20px 16px"}}>
        <h1 style={{fontSize:22,fontWeight:800,color:"#111",margin:0}}>Knowledge Graph</h1>
        <p style={{fontSize:12,color:"#9A9A9E",margin:"4px 0 0"}}>AI connects your achievements</p>
      </div>

      {docs.length===0 ? (
        <div style={{textAlign:"center",padding:"80px 32px"}}>
          <div style={{fontSize:48,marginBottom:16}}>⬡</div>
          <p style={{fontWeight:600,color:"#111",marginBottom:8}}>No connections yet</p>
          <p style={{fontSize:13,color:"#9A9A9E",marginBottom:24}}>Upload documents to generate your knowledge graph</p>
          <button onClick={()=>router.push("/upload")} className="btn btn-primary" style={{fontSize:13}}>Upload Now</button>
        </div>
      ) : (
        <div style={{position:"relative"}}>
          <svg width={W} height={H} style={{display:"block"}}>
            {edges.map((e,i)=>{
              const f=nodes.find(n=>n.id===e.from), t=nodes.find(n=>n.id===e.to);
              if(!f||!t) return null;
              return <line key={i} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#EAEAEA" strokeWidth={1.5}/>;
            })}
            {nodes.map(n=>{
              const isCenter=n.id==="you", isHov=hovered===n.id;
              return (
                <g key={n.id} style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHovered(n.id)} onMouseLeave={()=>setHovered(null)}
                  onClick={()=>n.docId&&router.push(`/document/${n.docId}`)}>
                  <circle cx={n.x} cy={n.y} r={n.r+(isHov?4:0)} fill={n.color}
                    style={{transition:"r .2s",filter:isHov?"drop-shadow(0 4px 16px rgba(0,0,0,0.3))":"none",opacity:isHov?1:0.9}}/>
                  {isCenter&&<circle cx={n.x} cy={n.y} r={n.r+10} fill="none" stroke="#111" strokeWidth={1} opacity={0.15}/>}
                  <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central"
                    fontSize={isCenter?12:9} fontWeight={isCenter?"700":"600"} fill="#fff"
                    style={{pointerEvents:"none",userSelect:"none"}}>
                    {n.label.length>13?n.label.slice(0,13)+"…":n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Bottom controls */}
      <div style={{display:"flex",gap:10,padding:"0 20px",alignItems:"center"}}>
        <button onClick={()=>router.push("/journey")} style={{flex:1,height:44,background:"#111",color:"#fff",border:"none",borderRadius:999,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Explore Timeline
        </button>
        <button onClick={()=>router.push("/chat")} style={{width:44,height:44,background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18}}>
          💬
        </button>
        <button onClick={()=>router.push("/insights")} style={{width:44,height:44,background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18}}>
          📊
        </button>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:16,padding:"16px 20px",flexWrap:"wrap"}}>
        {[{c:"#111",l:"You"},{c:"#2563EB",l:"Skills"},{c:"#374151",l:"Documents"}].map(x=>(
          <div key={x.l} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:x.c}}/>
            <span style={{fontSize:11,color:"#9A9A9E"}}>{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
