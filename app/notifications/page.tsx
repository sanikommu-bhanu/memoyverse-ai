"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";

interface Notification {
  id: string; title: string; body: string; type: string;
  at: string; read: boolean;
}

const ICONS: Record<string,string> = { upload:"☁️", ai:"✦", resume:"📄", portfolio:"🌐", system:"ℹ️", insight:"📊" };

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d/60000);
  if (m<1) return "Just now";
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

export default function Notifications() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from localStorage (works without Firebase)
    const stored = localStorage.getItem("mv_notifications");
    if (stored) {
      const list = JSON.parse(stored) as Notification[];
      setNotifs(list);
      // Mark all read
      const updated = list.map(n => ({ ...n, read: true }));
      localStorage.setItem("mv_notifications", JSON.stringify(updated));
    }
    setLoading(false);

    // Request FCM permission if Firebase configured
    if (isFirebaseConfigured() && "Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  const pushTestNotif = () => {
    const n: Notification = {
      id: `n${Date.now()}`, title:"AI Analysis Complete",
      body:"Your document has been fully analysed and added to your knowledge graph.",
      type:"ai", at: new Date().toISOString(), read: false,
    };
    const list = [n, ...notifs];
    setNotifs(list);
    localStorage.setItem("mv_notifications", JSON.stringify(list));
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(n.title, { body: n.body, icon: "/icon.png" });
    }
  };

  const clearAll = () => {
    setNotifs([]);
    localStorage.removeItem("mv_notifications");
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff",paddingTop:56}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 16px",borderBottom:"1px solid #EAEAEA"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>router.back()} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style={{fontSize:18,fontWeight:700,color:"#111",margin:0}}>Notifications</h1>
        </div>
        {notifs.length>0 && <button onClick={clearAll} style={{background:"none",border:"none",fontSize:12,color:"#9A9A9E",cursor:"pointer",fontWeight:500}}>Clear all</button>}
      </div>

      <div style={{padding:"16px 20px"}}>
        {loading ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[1,2,3].map(i=><div key={i} className="shimmer-box" style={{height:68,borderRadius:18}}/>)}
          </div>
        ) : notifs.length === 0 ? (
          <div style={{textAlign:"center",padding:"64px 24px"}}>
            <div style={{fontSize:48,marginBottom:16}}>🔔</div>
            <p style={{fontWeight:600,color:"#111",marginBottom:8}}>All caught up</p>
            <p style={{fontSize:13,color:"#9A9A9E",marginBottom:24}}>Notifications appear here as you use the app</p>
            <button onClick={pushTestNotif} className="btn btn-secondary" style={{fontSize:13}}>Send test notification</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {notifs.map(n => (
              <div key={n.id} style={{display:"flex",gap:14,padding:"14px 16px",background:n.read?"#fff":"#F8F8FF",border:`1px solid ${n.read?"#EAEAEA":"#E0E0FF"}`,borderRadius:20}}>
                <div style={{width:42,height:42,borderRadius:14,background:"#F5F5F7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {ICONS[n.type]||"🔔"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontWeight:600,fontSize:14,color:"#111",margin:0}}>{n.title}</p>
                  <p style={{fontSize:12,color:"#6B6B6F",margin:"3px 0 0",lineHeight:1.5}}>{n.body}</p>
                  <p style={{fontSize:11,color:"#9A9A9E",margin:"4px 0 0"}}>{timeAgo(n.at)}</p>
                </div>
                {!n.read && <div style={{width:8,height:8,borderRadius:"50%",background:"#111",flexShrink:0,marginTop:4}}/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
