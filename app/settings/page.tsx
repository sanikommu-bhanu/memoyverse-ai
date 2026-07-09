"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Settings() {
  const router = useRouter();
  const sp = useSearchParams();
  const [tokens, setTokens] = useState<any>({});
  const [msg, setMsg] = useState("");
  const [clearing, setClearing] = useState(false);
  const [fbStatus, setFbStatus] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setFbStatus(isFirebaseConfigured());
    const auth = localStorage.getItem("mv_auth");
    if (auth) setUser(JSON.parse(auth));
    fetch("/api/profile").then(r=>r.json()).then(d=>setTokens(d.tokens||{}));
    const connected = sp.get("connected");
    const error = sp.get("error");
    if (connected) { setMsg(`✅ ${connected} connected successfully!`); addNotification(`${connected} Connected`, `Your ${connected} account has been linked to MemoryVerse.`); }
    if (error) setMsg(`❌ Error: ${decodeURIComponent(error)}`);
  }, []);

  const addNotification = (title: string, body: string) => {
    const list = JSON.parse(localStorage.getItem("mv_notifications")||"[]");
    list.unshift({ id:`n${Date.now()}`, title, body, type:"system", at:new Date().toISOString(), read:false });
    localStorage.setItem("mv_notifications", JSON.stringify(list));
  };

  const connect = (p: string) => { window.location.href = `/api/auth/${p}`; };

  const importFrom = async (ep: string, label: string) => {
    setMsg(""); 
    try {
      const r = await fetch(`/api/connect/${ep}`, { method:"POST" });
      const d = await r.json();
      if (d.ok) { setMsg(`✅ Imported ${d.count||"your"} ${label} data!`); addNotification(`${label} Imported`, `${d.count||"Your"} ${label} items have been added to MemoryVerse.`); }
      else if (d.error?.includes("not connected")) router.push("/settings#accounts");
      else setMsg(`❌ ${d.error}`);
    } catch { setMsg(`❌ Import failed. Is the account connected?`); }
  };

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) { try { await signOut(auth); } catch { } }
    localStorage.removeItem("mv_auth");
    router.replace("/auth");
  };

  const clearAll = async () => {
    if (!confirm("Delete ALL your documents, chat history, and profile? This cannot be undone.")) return;
    setClearing(true);
    const headers: any = {};
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      if (auth?.currentUser) headers["Authorization"] = `Bearer ${await auth.currentUser.getIdToken()}`;
    }
    await fetch("/api/documents", { method:"DELETE", headers:{"Content-Type":"application/json",...headers}, body:JSON.stringify({id:"__ALL__"}) });
    await fetch("/api/chat", { method:"DELETE", headers });
    setClearing(false); setMsg("✅ All data cleared."); router.push("/home");
  };

  const PROVIDERS = [
    { k:"github", ep:"github", l:"GitHub", e:"🐙", desc:"Import repos as projects" },
    { k:"google", ep:"drive", l:"Google Drive", e:"🟢", desc:"Import Drive files" },
    { k:"linkedin", ep:"linkedin", l:"LinkedIn", e:"💼", desc:"Import profile & experience" },
    { k:"microsoft", ep:"onedrive", l:"OneDrive", e:"🔵", desc:"Import OneDrive files" },
  ];

  return (
    <div style={{minHeight:"100dvh",background:"#F5F5F7",paddingTop:56}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"0 20px 16px",background:"#fff",borderBottom:"1px solid #EAEAEA"}}>
        <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 style={{fontSize:18,fontWeight:700,color:"#111",margin:0}}>Settings</h1>
      </div>

      <div style={{padding:"20px"}}>
        {msg && <div style={{background:msg.startsWith("✅")?"#F0FDF4":"#FEF2F2",border:`1px solid ${msg.startsWith("✅")?"#BBF7D0":"#FECACA"}`,borderRadius:16,padding:"12px 16px",marginBottom:16,fontSize:13,color:msg.startsWith("✅")?"#166534":"#DC2626"}}>{msg}</div>}

        {/* Profile card */}
        {user && (
          <div style={{background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,padding:"16px 18px",marginBottom:24,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:44,height:44,borderRadius:22,background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff",fontWeight:700}}>
              {user.name?.[0]?.toUpperCase()||"U"}
            </div>
            <div style={{flex:1}}>
              <p style={{fontWeight:700,color:"#111",margin:0,fontSize:14}}>{user.name}</p>
              <p style={{fontSize:12,color:"#9A9A9E",margin:0}}>{user.email}</p>
            </div>
            <button onClick={()=>router.push("/profile")} style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:12,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",color:"#111"}}>Edit</button>
          </div>
        )}

        {/* Firebase Status */}
        <p style={{fontSize:10,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px"}}>AI Configuration</p>
        <div style={{background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,overflow:"hidden",marginBottom:24}}>
          {[
            { l:"Firebase Auth", v: fbStatus?"Connected":"Not configured", ok:fbStatus, icon:"🔐" },
            { l:"Gemini API", v:process.env.NEXT_PUBLIC_GEMINI_STATUS||"Check .env", ok:true, icon:"✦" },
            { l:"Embedding Model", v:"text-embedding-004 (768-dim)", ok:true, icon:"🧠" },
            { l:"Vector Search", v:"Cosine Similarity", ok:true, icon:"🔍" },
            { l:"Storage", v: fbStatus?"Firebase Storage":"Local /tmp", ok:true, icon:"💾" },
          ].map((r,i,arr)=>(
            <div key={r.l} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<arr.length-1?"1px solid #F5F5F7":"none"}}>
              <span style={{fontSize:18,width:22,textAlign:"center"}}>{r.icon}</span>
              <span style={{flex:1,fontSize:13,fontWeight:500,color:"#111"}}>{r.l}</span>
              <span style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:999,background:r.ok?"#DCFCE7":"#FEF3C7",color:r.ok?"#166534":"#92400E"}}>{r.v}</span>
            </div>
          ))}
        </div>

        {/* Connected Accounts */}
        <p id="accounts" style={{fontSize:10,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px"}}>Connected Accounts</p>
        <div style={{background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,overflow:"hidden",marginBottom:24}}>
          {PROVIDERS.map((p,i,arr)=>(
            <div key={p.k} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderBottom:i<arr.length-1?"1px solid #F5F5F7":"none"}}>
              <span style={{fontSize:20,width:22,textAlign:"center"}}>{p.e}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:"#111",margin:0}}>{p.l}</p>
                <p style={{fontSize:11,color:"#9A9A9E",margin:0}}>{p.desc}</p>
              </div>
              {tokens[p.k] ? (
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:999,background:"#DCFCE7",color:"#166534"}}>✓</span>
                  <button onClick={()=>importFrom(p.ep,p.l)} style={{fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:999,background:"#111",color:"#fff",border:"none",cursor:"pointer"}}>Import</button>
                </div>
              ) : (
                <button onClick={()=>connect(p.k==="google"?"google":p.k==="microsoft"?"microsoft":p.k)} style={{fontSize:11,fontWeight:600,padding:"6px 14px",borderRadius:999,background:"#F5F5F7",color:"#111",border:"1px solid #EAEAEA",cursor:"pointer",flexShrink:0}}>Connect</button>
              )}
            </div>
          ))}
        </div>

        {/* Preferences */}
        <p style={{fontSize:10,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px"}}>App</p>
        <div style={{background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,overflow:"hidden",marginBottom:24}}>
          {[
            { l:"Notifications", e:"🔔", action:()=>router.push("/notifications") },
            { l:"Export My Data", e:"📤", action:async()=>{ const d=await fetch("/api/documents").then(r=>r.json()); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"})); a.download="memoryverse_export.json"; a.click(); } },
            { l:"Privacy Policy", e:"🔒", action:()=>{} },
          ].map((r,i,arr)=>(
            <div key={r.l} onClick={r.action} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<arr.length-1?"1px solid #F5F5F7":"none",cursor:"pointer"}}>
              <span style={{fontSize:18,width:22,textAlign:"center"}}>{r.e}</span>
              <span style={{flex:1,fontSize:13,fontWeight:500,color:"#111"}}>{r.l}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          ))}
        </div>

        {/* Account actions */}
        <p style={{fontSize:10,fontWeight:700,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px"}}>Account</p>
        <div style={{background:"#fff",border:"1px solid #EAEAEA",borderRadius:20,overflow:"hidden",marginBottom:24}}>
          <div onClick={handleSignOut} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:"1px solid #F5F5F7",cursor:"pointer"}}>
            <span style={{fontSize:18,width:22,textAlign:"center"}}>👋</span>
            <span style={{flex:1,fontSize:13,fontWeight:500,color:"#111"}}>Sign Out</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          </div>
          <div onClick={clearAll} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",cursor:"pointer"}}>
            <span style={{fontSize:18,width:22,textAlign:"center"}}>🗑️</span>
            <span style={{flex:1,fontSize:13,fontWeight:500,color:"#DC2626"}}>{clearing?"Clearing…":"Clear All Data"}</span>
            <span style={{fontSize:11,fontWeight:600,color:"#DC2626",padding:"4px 10px",borderRadius:999,background:"#FEF2F2",border:"1px solid #FECACA"}}>Delete all</span>
          </div>
        </div>

        <div style={{textAlign:"center",paddingBottom:4}}>
          <p style={{fontSize:11,color:"#9A9A9E",margin:0}}>MemoryVerse AI v2.0 · Wooble Hackathon '26</p>
          <p style={{fontSize:10,color:"#C5C5C7",margin:"4px 0 0"}}>Gemini · text-embedding-004 · Cosine Vector Search · RAG · Firebase</p>
        </div>
      </div>
    </div>
  );
}
