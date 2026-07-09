"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getFirebaseAuth, googleProvider, appleProvider, isFirebaseConfigured
} from "@/lib/firebase";
import {
  signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile,
  onAuthStateChanged
} from "firebase/auth";

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState<"in"|"up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    setFirebaseReady(isFirebaseConfigured());
    // Check existing auth state
    const auth = getFirebaseAuth();
    if (auth) {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          localStorage.setItem("mv_auth", JSON.stringify({ uid: u.uid, name: u.displayName || u.email?.split("@")[0] || "User", email: u.email || "" }));
          router.replace("/home");
        }
      });
      return () => unsub();
    }
  }, []);

  const saveLocal = (n: string, em: string, uid = "local") => {
    localStorage.setItem("mv_auth", JSON.stringify({ uid, name: n, email: em }));
  };

  // ── Firebase Email Auth ──────────────────────────────────────
  const handleEmail = async () => {
    if (!email || !pw) { setErr("Enter email and password"); return; }
    setLoading(true); setErr("");
    const auth = getFirebaseAuth();
    if (auth && firebaseReady) {
      try {
        if (mode === "up") {
          if (!name) { setErr("Enter your name"); setLoading(false); return; }
          const cred = await createUserWithEmailAndPassword(auth, email, pw);
          await updateProfile(cred.user, { displayName: name });
          await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${await cred.user.getIdToken()}`}, body: JSON.stringify({ name, email, title:"AI Enthusiast & Developer", location:"", bio:"" }) });
          saveLocal(name, email, cred.user.uid);
        } else {
          const cred = await signInWithEmailAndPassword(auth, email, pw);
          saveLocal(cred.user.displayName||email.split("@")[0], email, cred.user.uid);
        }
        router.replace("/home");
      } catch (e: any) {
        setErr(e.message?.replace("Firebase: ","").replace(/\(auth\/[^)]+\)/,"").trim() || "Authentication failed");
      }
    } else {
      // Local fallback (no Firebase)
      if (mode === "up" && name) {
        await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name, email, title:"AI Enthusiast & Developer", location:"", bio:"" }) });
        saveLocal(name, email);
      } else {
        saveLocal(email.split("@")[0], email);
      }
      router.replace("/home");
    }
    setLoading(false);
  };

  // ── Firebase Social Auth ─────────────────────────────────────
  const handleSocial = async (provider: "google"|"apple") => {
    setLoading(true); setErr("");
    const auth = getFirebaseAuth();
    if (auth && firebaseReady) {
      try {
        const prov = provider === "google" ? googleProvider() : appleProvider();
        const cred = await signInWithPopup(auth, prov);
        const u = cred.user;
        const n = u.displayName || u.email?.split("@")[0] || "User";
        await fetch("/api/profile", { method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${await u.getIdToken()}`}, body: JSON.stringify({ name:n, email:u.email||"", title:"AI Enthusiast & Developer", location:"", bio:"" }) });
        saveLocal(n, u.email||"", u.uid);
        router.replace("/home");
      } catch (e: any) {
        setErr(e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : e.message?.replace("Firebase: ","").replace(/\(auth\/[^)]+\)/,"").trim() || "Social auth failed");
      }
    } else {
      // Local fallback
      const n = provider === "google" ? "Google User" : "Apple User";
      saveLocal(n, `${provider}@memoryverse.app`);
      router.replace("/home");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff",display:"flex",flexDirection:"column",padding:"60px 28px 40px",overflowY:"auto"}}>
      <h1 style={{fontSize:26,fontWeight:800,color:"#111",marginBottom:4}}>{mode==="in"?"Welcome Back 👋":"Create Account"}</h1>
      <p style={{fontSize:14,color:"#9A9A9E",marginBottom:32}}>{mode==="in"?"Sign in to continue your journey":"Start your intelligent journey"}</p>

      {!firebaseReady && (
        <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:14,padding:"10px 14px",marginBottom:20,fontSize:12,color:"#92400E"}}>
          ℹ️ Firebase not configured — using local auth. Add Firebase config to <code>.env</code> for Google/Apple sign-in.
        </div>
      )}

      {err && <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:14,padding:"10px 14px",marginBottom:16,fontSize:13,color:"#DC2626"}}>{err}</div>}

      {/* Social buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        <button onClick={()=>handleSocial("google")} disabled={loading} style={{height:52,borderRadius:999,border:"1.5px solid #EAEAEA",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",fontSize:15,fontWeight:600,color:"#111",opacity:loading?.6:1}}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <button onClick={()=>handleSocial("apple")} disabled={loading} style={{height:52,borderRadius:999,border:"1.5px solid #EAEAEA",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",fontSize:15,fontWeight:600,color:"#111",opacity:loading?.6:1}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#111"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          Continue with Apple
        </button>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <div style={{flex:1,height:1,background:"#EAEAEA"}}/>
        <span style={{fontSize:12,color:"#9A9A9E"}}>or continue with email</span>
        <div style={{flex:1,height:1,background:"#EAEAEA"}}/>
      </div>

      {mode==="up" && (
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#9A9A9E",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Full Name</label>
          <input className="inp" placeholder="Bhanu Pratap" value={name} onChange={e=>setName(e.target.value)}/>
        </div>
      )}
      <div style={{marginBottom:14}}>
        <label style={{fontSize:12,fontWeight:600,color:"#9A9A9E",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Email Address</label>
        <input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      </div>
      <div style={{marginBottom:20,position:"relative"}}>
        <label style={{fontSize:12,fontWeight:600,color:"#9A9A9E",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Password</label>
        <input className="inp" type={showPw?"text":"password"} placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)} style={{paddingRight:48}}/>
        <button onClick={()=>setShowPw(s=>!s)} style={{position:"absolute",right:14,top:34,background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#9A9A9E"}}>{showPw?"🙈":"👁"}</button>
      </div>

      {mode==="in" ? (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#6B6B6F"}}>
            <input type="checkbox" defaultChecked style={{accentColor:"#111"}}/> Remember me
          </label>
          <span style={{fontSize:13,color:"#111",fontWeight:500,cursor:"pointer"}}>Forgot password?</span>
        </div>
      ) : (
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#6B6B6F",marginBottom:28}}>
          <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} style={{accentColor:"#111"}}/>
          I agree to the Terms & Conditions
        </label>
      )}

      <button onClick={handleEmail} disabled={loading} className="btn btn-primary btn-full" style={{marginBottom:24}}>
        {loading ? (
          <span style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="anim-spin" style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%"}}/>
            {mode==="in"?"Signing In…":"Creating Account…"}
          </span>
        ) : mode==="in" ? "Sign In" : "Create Account"}
      </button>

      <p style={{textAlign:"center",fontSize:14,color:"#6B6B6F"}}>
        {mode==="in"?"Don't have an account? ":"Already have an account? "}
        <span onClick={()=>{setMode(m=>m==="in"?"up":"in");setErr("");}} style={{color:"#111",fontWeight:700,cursor:"pointer"}}>
          {mode==="in"?"Sign up":"Sign in"}
        </span>
      </p>
    </div>
  );
}
