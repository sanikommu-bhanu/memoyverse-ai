"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=85",
    title: "Your Journey\nStarts Here",
    sub: "Store every certificate, resume, achievement, internship, and project in one intelligent place.",
  },
  {
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=85",
    title: "AI Understands\nEverything",
    sub: "Upload anything. AI automatically reads, extracts, categorizes, and understands everything.",
  },
  {
    img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&q=85",
    title: "Never Search\nAgain",
    sub: '"Show my AI certificates." MemoryVerse instantly finds them using semantic search.',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const go = (n: number) => { setAnimKey(k => k+1); setSlide(n); };
  const next = () => slide < 2 ? go(slide + 1) : finish();
  const finish = () => { localStorage.setItem("mv_seen","1"); router.replace("/auth"); };

  useEffect(() => { SLIDES.forEach(s => { const i = new Image(); i.src = s.img; }); }, []);

  const s = SLIDES[slide];
  return (
    <div style={{height:"100dvh",position:"relative",overflow:"hidden",background:"#000"}}>
      {/* BG image */}
      <div key={animKey} style={{position:"absolute",inset:0,animation:"fadeIn .5s ease"}}>
        <img src={s.img} alt="" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.75}}/>
      </div>

      {/* Gradient overlay */}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.15) 40%,rgba(0,0,0,0.82) 100%)"}}/>

      {/* Skip */}
      <button onClick={finish} style={{position:"absolute",top:56,right:24,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.25)",color:"#fff",padding:"8px 18px",borderRadius:999,fontSize:13,fontWeight:500,cursor:"pointer",zIndex:10}}>
        Skip
      </button>

      {/* Content */}
      <div key={`c${animKey}`} style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 28px 48px",animation:"fadeUp .5s ease"}}>
        <h1 className="font-display" style={{color:"#fff",fontSize:34,fontWeight:700,lineHeight:1.15,whiteSpace:"pre-line",marginBottom:14}}>
          {s.title}
        </h1>
        <p style={{color:"rgba(255,255,255,0.82)",fontSize:15,lineHeight:1.65,marginBottom:36}}>
          {s.sub}
        </p>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {/* Dots */}
          <div style={{display:"flex",gap:6}}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => go(i)} style={{height:4,width:i===slide?28:8,background:i===slide?"#fff":"rgba(255,255,255,0.35)",borderRadius:2,cursor:"pointer",transition:"all .3s"}}/>
            ))}
          </div>

          {/* Button */}
          {slide < 2 ? (
            <button onClick={next} style={{background:"#fff",color:"#111",border:"none",padding:"14px 28px",borderRadius:999,fontSize:15,fontWeight:700,cursor:"pointer"}}>
              Next
            </button>
          ) : (
            <button onClick={finish} style={{background:"#fff",color:"#111",border:"none",padding:"14px 28px",borderRadius:999,fontSize:15,fontWeight:700,cursor:"pointer",width:"100%"}}>
              Get Started →
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}
