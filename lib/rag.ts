import { retrieveTop } from "./vector";
import { generate, hasKey } from "./gemini";
import { getDocs, getProfile, getChat } from "./hybridStore";

export async function ragChat(question: string, userId = "local") {
  const hits = await retrieveTop(question, 15, userId);
  const sources = hits.map(h => ({ id:h.doc.id, title:h.doc.title, score:Math.round(h.score*100) }));
  const context = hits.map(h =>
    `[${h.doc.cat}] "${h.doc.title}" (${h.doc.year})\nSummary: ${h.doc.summary}\nSkills: ${(h.doc.entities?.skills || []).join(", ")||"n/a"}`
  ).join("\n\n---\n\n");

  if (hasKey()) {
    const history = await getChat(userId);
    const recentHistory = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    
    try {
      const answer = await generate(`You are MemoryVerse AI — a personal career assistant.
Act as a warm, helpful conversational assistant. 
If the user's input is a greeting, follow-up, or casual conversation (e.g. "hello", "thanks"), respond naturally.
For questions about their career, experience, or skills, rely ONLY on the Retrieved Documents below. Be specific and cite document titles. If the context lacks the answer, say so honestly.

Recent Conversation History:
${recentHistory || "No previous messages."}

Retrieved Documents:
${context || "No relevant documents found."}

User's Latest Input: ${question}

Response (keep it concise, 2-4 sentences):`, 800);
      return { answer, sources };
    } catch (e: any) {
      // Fallback: Show the descriptive error but also include the local search results
      const apiError = e?.message || "Service unavailable";
      const fallbackDocs = hits.length 
        ? `\n\nHowever, based on local search, I found ${hits.length} relevant item(s): ${hits.slice(0,3).map(h=>h.doc.title).join(", ")}. ${hits[0].doc.summary}` 
        : `\n\nI also couldn't find any strong local matches for "${question}".`;
      return { answer: `[AI API Error: ${apiError}]${fallbackDocs}`, sources };
    }
  }
  const docs = await getDocs(userId);
  if (!docs.length) return { answer:"Upload your first document and I will answer from your real career data using AI-powered semantic search.", sources:[] };
  if (!hits.length) return { answer:`No strong matches for "${question}". Try different keywords or upload more documents.`, sources:[] };
  return { answer:`Found ${hits.length} relevant item(s): ${hits.slice(0,3).map(h=>h.doc.title).join(", ")}. ${hits[0].doc.summary}`, sources };
}

export async function buildResume(template: string, userId = "local") {
  const docs = await getDocs(userId);
  const p = await getProfile(userId);
  const lines = docs.map(d=>`${d.cat}: ${d.title} (${d.year}) - ${d.summary} [${(d.entities?.skills || []).join(", ")}]`).join("\n");
  if (hasKey()) {
    try {
      const prompt = `Generate a ${template}-style professional resume in highly structured Markdown for ${p?.name||"the user"}, ${p?.title||"Professional"}.
Email: ${p?.email||""}. Location: ${p?.location||""}.

Use the following Source Data exactly:
${lines||"No documents uploaded yet."}

Requirements:
- Make it visually striking but ATS-friendly.
- Use horizontal rules (---) to separate sections.
- For experience and projects, use bold titles, dates aligned to the right (if possible via simple markdown), and bullet points for descriptions.
- Emphasize quantifiable achievements if available.
- Include sections: SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION/CERTIFICATIONS.`;
      return await generate(prompt, 1800);
    } catch { /* fallback */ }
  }
  const skills = [...new Set(docs.flatMap(d=>d.entities?.skills || []))].slice(0,18);
  const proj = docs.filter(d=>d.cat==="Projects");
  const intern = docs.filter(d=>d.cat==="Internships" || d.cat==="Resume" || d.cat==="Other");
  const cert = docs.filter(d=>d.cat==="Certifications");
  const ach = docs.filter(d=>d.cat==="Achievements");
  const acad = docs.filter(d=>d.cat==="Academics");
  return `# ${p?.name||"Your Name"}\n**${p?.title||"Professional"}** | ${p?.email||""} | ${p?.location||""}\n\n---\n\n## SUMMARY\n${p?.title||"Professional"} with expertise in ${skills.slice(0,4).join(", ")||"various domains"}, verified across ${docs.length} document(s).\n\n---\n\n## SKILLS\n${skills.map(s=>`- ${s}`).join("\n")||"Upload documents to auto-populate"}\n\n---\n\n## PROJECTS\n${proj.map(d=>`### ${d.title} (${d.year})\n- ${d.summary}`).join("\n\n")||"_No projects uploaded yet_"}\n\n---\n\n## EXPERIENCE\n${intern.map(d=>`### ${d.title} (${d.year})\n**${d.entities?.orgs?.[0]||"Organization"}**\n- ${d.summary}`).join("\n\n")||"_No experience uploaded yet_"}\n\n---\n\n## EDUCATION\n${acad.map(d=>`### ${d.title} (${d.year})\n**${d.entities?.orgs?.[0]||"Institution"}**\n- ${d.summary}`).join("\n\n")||"_No education uploaded yet_"}\n\n---\n\n## CERTIFICATIONS\n${cert.map(d=>`- **${d.title}** (${d.year}) - ${d.entities?.orgs?.[0]||""}`).join("\n")||"_No certificates yet_"}\n\n---\n\n## ACHIEVEMENTS\n${ach.map(d=>`- ${d.title} (${d.year})`).join("\n")||"_No achievements yet_"}`;
}

export async function buildPortfolioHTML(userId = "local") {
  const docs = await getDocs(userId);
  const p = await getProfile(userId);
  const proj = docs.filter(d=>d.cat==="Projects");
  const cert = docs.filter(d=>d.cat==="Certifications");
  const intern = docs.filter(d=>["Internships", "Resume", "Other"].includes(d.cat));
  const acad = docs.filter(d=>d.cat==="Academics");
  const ach = docs.filter(d=>d.cat==="Achievements");
  const skills = [...new Set(docs.flatMap(d=>d.entities?.skills || []))].slice(0,24);
  const imgs = ["1555066931-4365d14bab8c","1517694712202-14dd9538aa97","1607799279861-4dd421887fb3","1516321318423-f06f85e504b3"];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${p?.name||"Portfolio"} - MemoryVerse AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    :root { --bg: #0a0a0b; --card: rgba(255,255,255,0.03); --border: rgba(255,255,255,0.08); --text: #f3f4f6; --text-muted: #9ca3af; --accent: #3b82f6; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; overflow-x: hidden; scroll-behavior: smooth; }
    ::selection { background: var(--accent); color: #fff; }
    .bg-glow { position: fixed; top: -20%; left: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 60%); filter: blur(80px); z-index: -1; pointer-events: none; }
    .bg-glow-2 { position: fixed; bottom: -20%; right: -10%; width: 50vw; height: 50vw; background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%); filter: blur(80px); z-index: -1; pointer-events: none; }
    
    nav { position: fixed; top: 0; width: 100%; z-index: 100; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; background: rgba(10,10,11,0.7); backdrop-filter: blur(16px); border-bottom: 1px solid var(--border); transition: all 0.3s ease; }
    nav .logo { font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
    nav ul { display: flex; gap: 32px; list-style: none; }
    nav a { color: var(--text-muted); text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
    nav a:hover { color: #fff; }

    .hero { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 24px; position: relative; }
    .hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); padding: 8px 16px; border-radius: 99px; font-size: 0.85rem; font-weight: 600; color: #fff; margin-bottom: 24px; backdrop-filter: blur(10px); animation: fadeUp 1s ease 0.1s backwards; }
    .hero h1 { font-size: clamp(3rem, 8vw, 5.5rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 24px; background: linear-gradient(to right, #fff, #9ca3af); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: fadeUp 1s ease 0.3s backwards; }
    .hero p { font-size: clamp(1.1rem, 2vw, 1.3rem); color: var(--text-muted); max-width: 600px; animation: fadeUp 1s ease 0.5s backwards; }

    section { max-width: 1080px; margin: 0 auto; padding: 120px 24px; }
    .section-header { margin-bottom: 64px; }
    .section-header h2 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
    .section-header p { color: var(--text-muted); font-size: 1.1rem; }

    .skills-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .skill-tag { background: var(--card); border: 1px solid var(--border); padding: 12px 24px; border-radius: 99px; font-weight: 500; color: #fff; font-size: 0.95rem; transition: all 0.3s ease; display: inline-block; }
    .skill-tag:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 32px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); position: relative; backdrop-filter: blur(10px); }
    .card::before { content: ""; position: absolute; inset: 0; background: radial-gradient(800px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%); opacity: 0; transition: opacity 0.3s; z-index: 1; pointer-events: none; }
    .card:hover::before { opacity: 1; }
    .card:hover { transform: translateY(-8px); border-color: rgba(255,255,255,0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .card-img { width: 100%; height: 220px; object-fit: cover; border-bottom: 1px solid var(--border); transition: transform 0.5s ease; }
    .card:hover .card-img { transform: scale(1.05); }
    .img-wrap { overflow: hidden; }
    .card-body { padding: 32px; position: relative; z-index: 2; }
    .card-badge { display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.1); border-radius: 99px; font-size: 0.75rem; font-weight: 600; color: #e5e7eb; margin-bottom: 16px; letter-spacing: 0.05em; text-transform: uppercase; }
    .card-body h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; line-height: 1.3; }
    .card-body p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; }

    footer { border-top: 1px solid var(--border); padding: 40px 24px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .reveal { opacity: 0; transform: translateY(40px); transition: all 0.8s cubic-bezier(0.5, 0, 0, 1); }
    .reveal.active { opacity: 1; transform: translateY(0); }

    @media (max-width: 768px) { nav ul { display: none; } section { padding: 80px 24px; } }
  </style>
</head>
<body>
  <div class="bg-glow"></div>
  <div class="bg-glow-2"></div>
  
  <nav>
    <div class="logo">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>
      ${p?.name||"Portfolio"}
    </div>
    <ul>
      <li><a href="#about">About</a></li>
      <li><a href="#skills">Expertise</a></li>
      ${proj.length ? '<li><a href="#projects">Work</a></li>' : ''}
      ${intern.length ? '<li><a href="#experience">Experience</a></li>' : ''}
      ${acad.length ? '<li><a href="#education">Education</a></li>' : ''}
      ${cert.length ? '<li><a href="#certifications">Certifications</a></li>' : ''}
      ${ach.length ? '<li><a href="#achievements">Achievements</a></li>' : ''}
    </ul>
  </nav>

  <header class="hero" id="about">
    <div class="hero-badge">
      <span style="width:8px;height:8px;background:#10b981;border-radius:50%;box-shadow:0 0 10px #10b981;"></span>
      Available for Opportunities
    </div>
    <h1>${p?.name||"Creative Developer"}</h1>
    <p>${p?.title||"Building digital experiences and AI solutions."}</p>
    ${p?.location ? `<p style="margin-top:16px;font-size:0.95rem;color:rgba(255,255,255,0.4)">📍 ${p.location}</p>` : ''}
  </header>

  <section id="skills" class="reveal">
    <div class="section-header">
      <h2>Expertise</h2>
      <p>Technologies and tools I work with daily</p>
    </div>
    <div class="skills-grid">
      ${skills.map(s=>`<div class="skill-tag">${s}</div>`).join("")||"<p style='color:var(--text-muted)'>Upload documents to auto-populate</p>"}
    </div>
  </section>

  ${proj.length ? `
  <section id="projects" class="reveal">
    <div class="section-header">
      <h2>Selected Work</h2>
      <p>A showcase of my recent projects</p>
    </div>
    <div class="grid" id="project-grid">
      ${proj.map((p2,i)=>`
      <article class="card">
        <div class="img-wrap"><img src="https://images.unsplash.com/photo-${imgs[i%imgs.length]}?w=800&q=80" alt="${p2.title}" class="card-img" loading="lazy"/></div>
        <div class="card-body">
          <span class="card-badge">${p2.year}</span>
          <h3>${p2.title}</h3>
          <p>${p2.summary}</p>
        </div>
      </article>`).join("")}
    </div>
  </section>` : ""}

  ${intern.length ? `
  <section id="experience" class="reveal">
    <div class="section-header">
      <h2>Experience</h2>
      <p>My professional journey and roles</p>
    </div>
    <div class="grid" id="exp-grid">
      ${intern.map(p2=>`
      <article class="card" style="padding: 32px">
        <span class="card-badge">${p2.year}</span>
        <h3>${p2.title}</h3>
        <p>${p2.summary}</p>
      </article>`).join("")}
    </div>
  </section>` : ""}

  ${acad.length ? `
  <section id="education" class="reveal">
    <div class="section-header">
      <h2>Education & Academics</h2>
      <p>My academic background and research</p>
    </div>
    <div class="grid" id="acad-grid">
      ${acad.map(p2=>`
      <article class="card" style="padding: 32px">
        <span class="card-badge">${p2.year}</span>
        <h3>${p2.title}</h3>
        <p>${p2.summary}</p>
      </article>`).join("")}
    </div>
  </section>` : ""}

  ${cert.length ? `
  <section id="certifications" class="reveal">
    <div class="section-header">
      <h2>Certifications</h2>
      <p>Verified professional credentials</p>
    </div>
    <div class="grid" id="cert-grid">
      ${cert.map(c=>`
      <article class="card">
        <div class="card-body" style="padding: 40px 32px">
          <div style="width:48px;height:48px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:24px;">🏅</div>
          <span class="card-badge">${c.year}</span>
          <h3>${c.title}</h3>
          <p>${c.summary}</p>
        </div>
      </article>`).join("")}
    </div>
  </section>` : ""}

  ${ach.length ? `
  <section id="achievements" class="reveal">
    <div class="section-header">
      <h2>Achievements</h2>
      <p>Awards, hackathons, and recognitions</p>
    </div>
    <div class="grid" id="ach-grid">
      ${ach.map(p2=>`
      <article class="card" style="padding: 32px">
        <div style="width:48px;height:48px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:24px;">🏆</div>
        <span class="card-badge">${p2.year}</span>
        <h3>${p2.title}</h3>
        <p>${p2.summary}</p>
      </article>`).join("")}
    </div>
  </section>` : ""}

  <footer>
    <p>&copy; ${new Date().getFullYear()} ${p?.name||"Portfolio"}. Auto-generated via MemoryVerse AI.</p>
  </footer>

  <script>
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(r => observer.observe(r));

    const handleGlow = (e, gridId) => {
      const grid = document.getElementById(gridId);
      if(!grid) return;
      for(const card of grid.querySelectorAll('.card')) {
        const rect = card.getBoundingClientRect(),
              x = e.clientX - rect.left,
              y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', \`\${x}px\`);
        card.style.setProperty('--mouse-y', \`\${y}px\`);
      }
    };
    window.addEventListener('mousemove', e => { handleGlow(e, 'project-grid'); handleGlow(e, 'cert-grid'); });
  </script>
</body>
</html>`;
}

export async function getInsights(userId = "local") {
  const docs = await getDocs(userId);
  const allSkills = [...new Set(docs.flatMap(d=>d.entities?.skills || []))];
  const c=docs.filter(d=>d.cat==="Certifications").length;
  const proj=docs.filter(d=>d.cat==="Projects").length;
  const int=docs.filter(d=>d.cat==="Internships").length;
  const res=docs.filter(d=>d.cat==="Academics").length;
  const ach=docs.filter(d=>d.cat==="Achievements").length;
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
