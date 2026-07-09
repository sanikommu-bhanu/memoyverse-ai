import { retrieveTop } from "./vector";
import { generate, hasKey } from "./gemini";
import { getDocs, getProfile } from "./hybridStore";

export async function ragChat(question: string, userId = "local") {
  const hits = await retrieveTop(question, 6, userId);
  const sources = hits.map(h => ({ id:h.doc.id, title:h.doc.title, score:Math.round(h.score*100) }));
  const context = hits.map(h =>
    `[${h.doc.cat}] "${h.doc.title}" (${h.doc.year})\nSummary: ${h.doc.summary}\nSkills: ${h.doc.entities.skills.join(", ")||"n/a"}`
  ).join("\n\n---\n\n");

  if (hasKey() && hits.length > 0) {
    try {
      const answer = await generate(`You are MemoryVerse AI — a personal career assistant. Answer using ONLY the documents retrieved below. Be specific, warm, cite document titles. If context lacks the answer, say so honestly.\n\nRetrieved Documents:\n${context}\n\nQuestion: ${question}\n\nAnswer (2-4 sentences, cite documents):`, 600);
      return { answer, sources };
    } catch { /* fallback */ }
  }
  const docs = await getDocs(userId);
  if (!docs.length) return { answer:"Upload your first document and I will answer from your real career data using AI-powered semantic search.", sources:[] };
  if (!hits.length) return { answer:`No strong matches for "${question}". Try different keywords or upload more documents.`, sources:[] };
  return { answer:`Found ${hits.length} relevant item(s): ${hits.slice(0,3).map(h=>h.doc.title).join(", ")}. ${hits[0].doc.summary}`, sources };
}

export async function buildResume(template: string, userId = "local") {
  const docs = await getDocs(userId);
  const p = await getProfile(userId);
  const lines = docs.map(d=>`${d.cat}: ${d.title} (${d.year}) - ${d.summary} [${d.entities.skills.join(", ")}]`).join("\n");
  if (hasKey()) {
    try {
      return await generate(`Generate a ${template}-style professional resume in clean Markdown for ${p?.name||"the user"}, ${p?.title||"a professional"}. Email: ${p?.email||""}. Location: ${p?.location||""}. Use ONLY real data below. Format with: ## Summary, ## Skills, ## Projects, ## Experience, ## Certifications, ## Achievements. ATS-friendly.\n\nSource Data:\n${lines||"No documents uploaded yet."}`, 1400);
    } catch { /* fallback */ }
  }
  const skills = [...new Set(docs.flatMap(d=>d.entities.skills))].slice(0,18);
  const proj = docs.filter(d=>d.cat==="Project");
  const intern = docs.filter(d=>d.cat==="Internship");
  const cert = docs.filter(d=>d.cat==="Certificate");
  const ach = docs.filter(d=>d.cat==="Achievement");
  return `# ${p?.name||"Your Name"}\n**${p?.title||"Professional"}** | ${p?.email||""} | ${p?.location||""}\n\n---\n\n## Summary\n${p?.title||"Professional"} with expertise in ${skills.slice(0,4).join(", ")||"various domains"}, verified across ${docs.length} document(s).\n\n## Skills\n${skills.map(s=>`- ${s}`).join("\n")||"Upload documents to auto-populate"}\n\n## Projects\n${proj.map(d=>`### ${d.title} (${d.year})\n${d.summary}`).join("\n\n")||"_No projects uploaded yet_"}\n\n## Experience\n${intern.map(d=>`### ${d.title} (${d.year})\n${d.entities.orgs?.[0]||""}\n${d.summary}`).join("\n\n")||"_No internships uploaded yet_"}\n\n## Certifications\n${cert.map(d=>`- **${d.title}** (${d.year}) - ${d.entities.orgs?.[0]||""}`).join("\n")||"_No certificates yet_"}\n\n## Achievements\n${ach.map(d=>`- ${d.title} (${d.year})`).join("\n")||"_No achievements yet_"}`;
}

export async function buildPortfolioHTML(userId = "local") {
  const docs = await getDocs(userId);
  const p = await getProfile(userId);
  const proj = docs.filter(d=>d.cat==="Project");
  const cert = docs.filter(d=>d.cat==="Certificate");
  const intern = docs.filter(d=>d.cat==="Internship");
  const skills = [...new Set(docs.flatMap(d=>d.entities.skills))].slice(0,24);
  const imgs = ["1555066931-4365d14bab8c","1517694712202-14dd9538aa97","1607799279861-4dd421887fb3","1516321318423-f06f85e504b3"];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${p?.name||"Portfolio"} - MemoryVerse AI</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet"/><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,sans-serif;background:#fff;color:#111;line-height:1.6;-webkit-font-smoothing:antialiased}.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#111;color:#fff;padding:40px 24px;position:relative}.hero::before{content:"";position:absolute;inset:0;background:url(https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1400&q=80) center/cover;opacity:.15}.hero-c{position:relative;z-index:1}.hero h1{font-family:"Playfair Display",serif;font-size:clamp(2.5rem,6vw,4rem);font-weight:900;margin-bottom:12px}nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.9);backdrop-filter:blur(20px);border-bottom:1px solid #eee;padding:16px 40px;display:flex;align-items:center;justify-content:space-between}nav ul{display:flex;gap:24px;list-style:none}nav a{text-decoration:none;color:#6B6B6F;font-size:.9rem;font-weight:500}section{max-width:960px;margin:0 auto;padding:80px 24px}h2{font-size:1.75rem;font-weight:700;margin-bottom:8px}.sub{color:#6B6B6F;margin-bottom:48px}.tags{display:flex;flex-wrap:wrap;gap:10px}.sk{background:#F5F5F7;border:1px solid #EAEAEA;border-radius:999px;padding:8px 18px;font-size:.9rem;font-weight:500}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-top:48px}.card{background:#fff;border:1px solid #EAEAEA;border-radius:20px;overflow:hidden;transition:box-shadow .2s,transform .2s}.card:hover{box-shadow:0 12px 40px rgba(0,0,0,.1);transform:translateY(-4px)}.card img{width:100%;height:200px;object-fit:cover}.card-b{padding:20px}.card-b h3{font-size:1.05rem;font-weight:700;margin-bottom:6px}.meta{font-size:.8rem;color:#9A9A9E;margin-bottom:10px}.card-b p{font-size:.9rem;color:#6B6B6F;line-height:1.6}.cfoot{background:#111;color:#fff;padding:80px 24px;text-align:center}footer{padding:24px;text-align:center;color:#9A9A9E;font-size:.8rem;border-top:1px solid #EAEAEA}@media(max-width:640px){nav ul{display:none}}</style></head><body><nav><span style="font-weight:700">✦ ${p?.name||"Portfolio"}</span><ul><li><a href="#skills">Skills</a></li>${proj.length?'<li><a href="#projects">Projects</a></li>':""}${cert.length?'<li><a href="#certs">Certs</a></li>':""}<li><a href="#contact">Contact</a></li></ul></nav><div class="hero"><div class="hero-c"><h1>${p?.name||"Your Name"}</h1><p style="font-size:1.15rem;opacity:.75">${p?.title||"AI Enthusiast & Developer"}</p>${p?.location?`<p style="opacity:.5;font-size:.9rem">📍 ${p.location}</p>`:""}<span style="display:inline-block;margin-top:24px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:10px 24px;font-size:.9rem">✦ AI-Generated Portfolio · ${docs.length} Documents</span></div></div><section id="about"><h2>About Me</h2><p class="sub" style="font-size:1.1rem;max-width:640px">${p?.bio||`${p?.title||"Professional"} building with AI, documented across ${docs.length} verified records.`}</p></section><div style="background:#F5F5F7;padding:1px 0" id="skills"><section><h2>Skills &amp; Technologies</h2><p class="sub">Auto-extracted from ${docs.length} document(s)</p><div class="tags">${skills.map(s=>`<span class="sk">${s}</span>`).join("")||"<p>Upload documents to populate</p>"}</div></section></div>${proj.length?`<section id="projects"><h2>Projects</h2><p class="sub">Real projects extracted by AI</p><div class="grid">${proj.map((p2,i)=>`<div class="card"><img src="https://images.unsplash.com/photo-${imgs[i%imgs.length]}?w=600&q=70" alt="${p2.title}" loading="lazy"/><div class="card-b"><h3>${p2.title}</h3><div class="meta">📅 ${p2.year}</div><p>${p2.summary}</p></div></div>`).join("")}</div></section>`:""}${cert.length?`<section id="certs"><h2>Certifications</h2><p class="sub">Verified certificates</p><div class="grid">${cert.map(c=>`<div class="card"><div class="card-b" style="padding:24px"><span style="font-size:2rem">🏅</span><h3 style="margin-top:12px">${c.title}</h3><div class="meta">${c.year}</div><p>${c.summary}</p></div></div>`).join("")}</div></section>`:""}<div class="cfoot" id="contact"><h2>Get In Touch</h2>${p?.email?`<p style="margin-top:16px;opacity:.8">✉️ ${p.email}</p>`:""}</div><footer>Generated by MemoryVerse AI · ${new Date().getFullYear()}</footer></body></html>`;
}

export async function getInsights(userId = "local") {
  const docs = await getDocs(userId);
  const allSkills = [...new Set(docs.flatMap(d=>d.entities.skills))];
  const c=docs.filter(d=>d.cat==="Certificate").length;
  const proj=docs.filter(d=>d.cat==="Project").length;
  const int=docs.filter(d=>d.cat==="Internship").length;
  const res=docs.filter(d=>d.cat==="Research").length;
  const ach=docs.filter(d=>d.cat==="Achievement").length;
  const readiness=Math.min(100,c*8+proj*12+int*15+res*10+ach*6+allSkills.length*2);
  const hasCloud=docs.some(d=>/cloud|aws|azure|gcp/i.test(d.title+d.summary));
  const missing:string[]=[];
  if(!hasCloud) missing.push("Cloud Certification (AWS / GCP / Azure)");
  if(!int) missing.push("Internship Experience");
  if(!allSkills.some(s=>/git/i.test(s))) missing.push("Version Control - Git/GitHub");
  if(!res) missing.push("Research Paper or Publication");
  if(proj<2) missing.push("2+ Verified Projects");
  return { readiness, topSkills:allSkills.slice(0,10), missingSkills:missing, resumeScore:Math.min(100,40+proj*8+c*6+int*10+ach*4), portfolioScore:Math.min(100,30+proj*15+c*5+int*8), totalDocs:docs.length, breakdown:{certs:c,projects:proj,internships:int,research:res,achievements:ach} };
}
