"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Splash() {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = "0";
      ref.current.style.transform = "scale(0.8)";
      setTimeout(() => {
        if (ref.current) {
          ref.current.style.transition = "all 0.7s cubic-bezier(0.34,1.56,0.64,1)";
          ref.current.style.opacity = "1";
          ref.current.style.transform = "scale(1)";
        }
      }, 100);
    }
    const seen = localStorage.getItem("mv_seen");
    setTimeout(() => {
      router.replace(seen ? "/auth" : "/onboarding");
    }, 2200);
  }, []);

  return (
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#fff",gap:24}}>
      {/* Particles */}
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position:"absolute",
            width: 4 + (i % 3) * 3,
            height: 4 + (i % 3) * 3,
            background:"#111",
            borderRadius:"50%",
            opacity: 0.04 + (i % 4) * 0.02,
            left: `${8 + i * 7.5}%`,
            top: `${10 + ((i * 37) % 80)}%`,
            animation:`pulse ${2 + i * 0.3}s ease infinite`,
            animationDelay:`${i * 0.2}s`,
          }}/>
        ))}
      </div>

      <div ref={ref} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
        <div style={{
          width:88,height:88,background:"#111",borderRadius:26,
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 16px 40px rgba(0,0,0,0.2)",
        }}>
          <span style={{color:"#fff",fontSize:40,fontWeight:800,fontFamily:"'Playfair Display',serif",lineHeight:1}}>M</span>
        </div>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:24,fontWeight:800,color:"#111",margin:0,letterSpacing:-0.5}}>MemoryVerse AI</h1>
          <p style={{fontSize:13,color:"#9A9A9E",margin:"6px 0 0",letterSpacing:0.2}}>Your life. Organized by AI.</p>
        </div>
      </div>

      <div style={{position:"absolute",bottom:60,display:"flex",gap:8}}>
        {[0,1,2].map(i => (
          <div key={i} style={{width:i===0?28:8,height:4,background:i===0?"#111":"#EAEAEA",borderRadius:2,transition:"all .3s"}}/>
        ))}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:.06;transform:scale(1)}50%{opacity:.12;transform:scale(1.2)}}`}</style>
    </div>
  );
}
