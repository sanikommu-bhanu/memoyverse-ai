"use client";
import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = ["What are my strongest skills?","Summarize my career","Show my AI certificates","What skills am I missing?","Generate a cover letter","Find internship documents"];

export default function Chat() {
  const [msgs, setMsgs] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check network status
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    updateOnlineStatus();

    // Load initial from localStorage in case offline
    const cached = localStorage.getItem("mv_offline_chat");
    if (cached) {
      try { setMsgs(JSON.parse(cached)); } catch {}
    }

    // Fetch from server if online
    if (navigator.onLine) {
      fetch("/api/chat").then(r=>r.json()).then(d=>{
        if (d.chat) {
          setMsgs(d.chat);
          localStorage.setItem("mv_offline_chat", JSON.stringify(d.chat));
        }
      }).catch(console.error);
    }

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => { 
    endRef.current?.scrollIntoView({behavior:"smooth"}); 
    if (msgs.length > 0) {
      localStorage.setItem("mv_offline_chat", JSON.stringify(msgs));
    }
  }, [msgs, loading]);

  const send = async (text?: string) => {
    const q = (text||input).trim();
    if (!q || loading) return;
    setInput("");
    
    const userMsg = { id:`u${Date.now()}`, role:"user", content:q, at:new Date().toISOString() };
    setMsgs(m=>[...m, userMsg]);

    if (isOffline) {
      setMsgs(m=>[...m, {id:`e${Date.now()}`, role:"assistant", content:"You are currently offline. Please reconnect to chat with the AI.", at:new Date().toISOString()}]);
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({question:q}),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const d = await res.json();
      if (!res.ok) {
        throw new Error(d.error || "Something went wrong.");
      }
      if (d.msg) setMsgs(m=>[...m, d.msg]);
    } catch (e: any) { 
      let errMsg = e?.message || "Something went wrong. Please try again.";
      if (e.name === "AbortError") errMsg = "Request timed out. Please try again.";
      setMsgs(m=>[...m,{id:`e${Date.now()}`,role:"assistant",content:errMsg,at:new Date().toISOString()}]); 
    }
    finally { setLoading(false); }
  };

  const clearChat = async () => { 
    if (!isOffline) await fetch("/api/chat",{method:"DELETE"}).catch(()=>{}); 
    setMsgs([]); 
    localStorage.removeItem("mv_offline_chat");
  };

  return (
    <div style={{height:"100dvh",display:"flex",flexDirection:"column",background:"#fff",paddingTop:56}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 14px",borderBottom:"1px solid #EAEAEA",flexShrink:0}}>
        <div>
          <h1 style={{fontSize:17,fontWeight:700,color:"#111",margin:0}}>AI Assistant</h1>
          <p style={{fontSize:11,color:"#9A9A9E",margin:0}}>RAG-powered · searches your real documents {isOffline && <span style={{color:"#FF453A"}}>(Offline)</span>}</p>
        </div>
        <button onClick={clearChat} style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:12,padding:"6px 12px",fontSize:12,fontWeight:500,cursor:"pointer",color:"#6B6B6F"}}>Clear</button>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 0"}}>
        {msgs.length===0 && (
          <div style={{textAlign:"center",paddingTop:24}}>
            <div style={{fontSize:40,marginBottom:12}}>✦</div>
            <p style={{fontWeight:600,color:"#111",fontSize:15,marginBottom:4}}>Ask me about your journey</p>
            <p style={{fontSize:12,color:"#9A9A9E",marginBottom:24}}>I search your real documents with semantic AI</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
              {SUGGESTIONS.map(s=>(
                <button key={s} onClick={()=>send(s)} style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:16,padding:"9px 14px",fontSize:12,fontWeight:500,color:"#111",cursor:"pointer"}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(m=>(
          <div key={m.id} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
            <div style={{
              maxWidth:"82%",padding:"12px 16px",fontSize:14,lineHeight:1.65,
              borderRadius:m.role==="user"?"20px 20px 4px 20px":"20px 20px 20px 4px",
              background:m.role==="user"?"#111":"#F5F5F7",
              color:m.role==="user"?"#fff":"#111",
              border:m.role==="user"?"none":"1px solid #EAEAEA",
            }}>
              <p style={{margin:0,whiteSpace:"pre-wrap"}}>{m.content}</p>
              {m.sources?.length>0 && (
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${m.role==="user"?"rgba(255,255,255,0.2)":"#EAEAEA"}`}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,opacity:.6,margin:"0 0 6px"}}>Sources</p>
                  {m.sources.map((s:any)=>(
                    <div key={s.id} style={{fontSize:11,opacity:.75,display:"flex",justifyContent:"space-between"}}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>📄 {s.title}</span>
                      <span style={{fontWeight:700,flexShrink:0,marginLeft:8}}>{s.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
            <div style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:"20px 20px 20px 4px",padding:"14px 18px",display:"flex",gap:6,alignItems:"center"}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#9A9A9E",animation:"pulse 1.2s ease infinite",animationDelay:`${i*200}ms`}}/>
              ))}
              <span style={{fontSize:12,color:"#9A9A9E",marginLeft:4}}>Searching your documents…</span>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Input */}
      <div style={{padding:"12px 16px",borderTop:"1px solid #EAEAEA",display:"flex",gap:10,alignItems:"flex-end",flexShrink:0,background:"#fff"}}>
        <textarea value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
          placeholder="Ask anything about your documents…"
          rows={1} style={{flex:1,background:"#F5F5F7",border:"1.5px solid #EAEAEA",borderRadius:18,padding:"12px 16px",fontSize:14,color:"#111",fontFamily:"inherit",outline:"none",resize:"none",maxHeight:120}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading}
          style={{width:44,height:44,borderRadius:22,background:input.trim()&&!loading?"#111":"#EAEAEA",border:"none",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"background .2s"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2 11 13M22 2 15 22 11 13 2 9l20-7z"/></svg>
        </button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}`}</style>
    </div>
  );
}
