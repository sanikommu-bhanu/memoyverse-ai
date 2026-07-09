"use client";
import "./globals.css";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const HIDE_NAV = ["/", "/onboarding", "/auth"];
const TABS = [
  { path:"/home", label:"Home", icon:"home" },
  { path:"/journey", label:"Journey", icon:"journey" },
  { fab: true },
  { path:"/chat", label:"AI", icon:"chat" },
  { path:"/profile", label:"Profile", icon:"profile" },
];

function NavIcon({ type, active }: { type:string; active:boolean }) {
  const c = active ? "#111" : "#9A9A9E";
  const sw = "1.8";
  if (type==="home") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
  if (type==="journey") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/><line x1="12" y1="8" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="16"/></svg>;
  if (type==="chat") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  if (type==="profile") return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
  return null;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const showNav = !HIDE_NAV.some(p => path === p || (p !== "/" && path.startsWith(p + "/")));

  // Firebase auth state listener
  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem("mv_auth", JSON.stringify({ uid: user.uid, name: user.displayName || user.email?.split("@")[0] || "User", email: user.email || "" }));
      } else {
        // Only redirect if on a protected page
        if (showNav && path !== "/auth" && path !== "/" && path !== "/onboarding") {
          const stored = localStorage.getItem("mv_auth");
          if (!stored) router.replace("/auth");
        }
      }
    });
    return () => unsub();
  }, [path]);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
        <meta name="theme-color" content="#111111"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <title>MemoryVerse AI</title>
        <meta name="description" content="Your life. Organized by AI."/>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23111'/><text y='.9em' font-size='70' font-weight='bold' fill='white' x='14'>M</text></svg>"/>
      </head>
      <body style={{display:"flex",justifyContent:"center",minHeight:"100dvh",background:"#E5E5E7"}}>
        <div id="phone">
          <div className="page-scroll" style={showNav ? {} : {paddingBottom:0}}>
            {children}
          </div>
          {showNav && (
            <nav className="bottom-nav">
              {TABS.map((t, i) => {
                if ((t as any).fab) return (
                  <button key="fab" className="nav-fab" onClick={() => router.push("/upload")}>
                    <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                );
                const tt = t as { path:string; label:string; icon:string };
                const active = path.startsWith(tt.path);
                return (
                  <button key={tt.path} className={`nav-tab${active?" active":""}`} onClick={() => router.push(tt.path)}>
                    <NavIcon type={tt.icon} active={active}/>
                    <span>{tt.label}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </body>
    </html>
  );
}
