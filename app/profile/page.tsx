"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const COVER = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80";
const AVATAR = "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80";

const MENU = [
  {l:"My Timeline",e:"⏱",p:"/journey"},
  {l:"My Certificates",e:"🏅",p:"/search?cat=Certificate"},
  {l:"My Projects",e:"🚀",p:"/search?cat=Project"},
  {l:"My Internships",e:"💼",p:"/search?cat=Internship"},
  {l:"AI Resume Builder",e:"📄",p:"/resume"},
  {l:"Portfolio Generator",e:"🌐",p:"/portfolio"},
  {l:"Career Insights",e:"📊",p:"/insights"},
  {l:"Settings",e:"⚙️",p:"/settings"},
];

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({name:"",email:"",title:"",location:"",bio:""});
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    fetch("/api/profile").then(r=>r.json()).then(d=>{
      if(d.profile){setProfile(d.profile);setForm(d.profile);}
      else {
        const auth = localStorage.getItem("mv_auth");
        if(auth){const a=JSON.parse(auth);setForm(f=>({...f,...a}));}
      }
    });
    fetch("/api/documents").then(r=>r.json()).then(d=>setDocs(d.docs||[]));
  },[]);

  const skills = [...new Set(docs.flatMap((d:any)=>d.entities?.skills||[]))];
  const stats = {
    docs:docs.length, skills:skills.length,
    projects:docs.filter((d:any)=>d.cat==="Projects").length,
    achievements:docs.filter((d:any)=>d.cat==="Achievements").length,
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    setProfile(form); setSaving(false); setEditing(false);
    localStorage.setItem("mv_auth",JSON.stringify({name:form.name,email:form.email}));
  };

  return (
    <div style={{minHeight:"100dvh",background:"#fff"}}>
      {/* Cover */}
      <div style={{position:"relative",height:160}}>
        <img src={COVER} alt="cover" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.25)"}}/>
        <button onClick={()=>router.push("/settings")} style={{position:"absolute",top:52,right:16,width:36,height:36,borderRadius:18,background:"rgba(0,0,0,0.35)",backdropFilter:"blur(8px)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>
          ⚙️
        </button>
      </div>

      {/* Avatar + info */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginTop:-40,paddingBottom:20}}>
        <img src={AVATAR} alt="avatar" style={{width:80,height:80,borderRadius:"50%",border:"4px solid #fff",objectFit:"cover",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}/>
        <h1 style={{fontSize:19,fontWeight:800,color:"#111",margin:"10px 0 2px"}}>{profile?.name||form.name||"Your Name"}</h1>
        <p style={{fontSize:13,color:"#6B6B6F",margin:0}}>{profile?.title||"AI Enthusiast & Developer"}</p>
        {profile?.location&&<p style={{fontSize:12,color:"#9A9A9E",margin:"4px 0 0"}}>📍 {profile.location}</p>}

        {/* Stats */}
        <div style={{display:"flex",gap:0,marginTop:20,borderTop:"1px solid #EAEAEA",borderBottom:"1px solid #EAEAEA",width:"100%"}}>
          {[{l:"Documents",v:stats.docs},{l:"Skills",v:stats.skills},{l:"Projects",v:stats.projects},{l:"Achievements",v:stats.achievements}].map((s,i,arr)=>(
            <div key={s.l} style={{flex:1,textAlign:"center",padding:"16px 4px",borderRight:i<arr.length-1?"1px solid #EAEAEA":"none"}}>
              <div style={{fontSize:20,fontWeight:800,color:"#111"}}>{s.v}</div>
              <div style={{fontSize:10,color:"#9A9A9E",marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{padding:"0 20px 20px"}}>
        {/* Profile edit */}
        {!editing ? (
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <p style={{fontWeight:700,color:"#111",margin:0,fontSize:14}}>Profile</p>
              <button onClick={()=>setEditing(true)} style={{background:"#F5F5F7",border:"1px solid #EAEAEA",borderRadius:12,padding:"6px 14px",fontSize:12,fontWeight:500,cursor:"pointer",color:"#6B6B6F"}}>Edit</button>
            </div>
            {[{l:"Name",v:profile?.name||"—"},{l:"Email",v:profile?.email||"—"},{l:"Title",v:profile?.title||"—"},{l:"Location",v:profile?.location||"—"}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F5F5F7"}}>
                <span style={{fontSize:12,color:"#9A9A9E"}}>{r.l}</span>
                <span style={{fontSize:12,fontWeight:500,color:"#111"}}>{r.v}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card anim-up" style={{marginBottom:16}}>
            <p style={{fontWeight:700,color:"#111",margin:"0 0 16px",fontSize:14}}>Edit Profile</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[{f:"name",l:"Full Name",ph:"Bhanu Pratap"},{f:"email",l:"Email",ph:"you@example.com"},{f:"title",l:"Title",ph:"AI Enthusiast & Developer"},{f:"location",l:"Location",ph:"Delhi, India"}].map(x=>(
                <div key={x.f}>
                  <label style={{fontSize:11,fontWeight:600,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:6}}>{x.l}</label>
                  <input className="inp" placeholder={x.ph} value={(form as any)[x.f]} onChange={e=>setForm(f=>({...f,[x.f]:e.target.value}))}/>
                </div>
              ))}
              <div>
                <label style={{fontSize:11,fontWeight:600,color:"#9A9A9E",textTransform:"uppercase",letterSpacing:.5,display:"block",marginBottom:6}}>Bio</label>
                <textarea className="inp" placeholder="Short bio…" value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} rows={3} style={{resize:"none"}}/>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={save} disabled={saving} className="btn btn-primary" style={{flex:1,height:46,fontSize:13}}>{saving?"Saving…":"Save"}</button>
                <button onClick={()=>setEditing(false)} className="btn btn-secondary" style={{flex:1,height:46,fontSize:13}}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length>0&&(
          <div className="card" style={{marginBottom:16}}>
            <p style={{fontWeight:700,color:"#111",margin:"0 0 12px",fontSize:14}}>Skills</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {skills.slice(0,20).map(s=><span key={s} className="tag">{s}</span>)}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="card" style={{padding:0,overflow:"hidden"}}>
          {MENU.map((m,i)=>(
            <div key={m.l} onClick={()=>router.push(m.p)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderBottom:i<MENU.length-1?"1px solid #F5F5F7":"none",cursor:"pointer",transition:"background .15s"}}>
              <span style={{fontSize:20,width:26,textAlign:"center"}}>{m.e}</span>
              <span style={{flex:1,fontSize:14,fontWeight:500,color:"#111"}}>{m.l}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9A9E" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
