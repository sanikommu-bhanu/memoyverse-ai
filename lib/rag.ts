import { retrieveTop } from "./vector";
import { generate, hasKey } from "./cohere";
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
      const prompt = `Generate a highly professional "${template}" style resume in strict Markdown for ${p?.name||"the user"}.
Name must be an h1 heading (# Name).
Immediately following the name, create exactly one paragraph containing the contact info separated by pipes: ${p?.email||"email@example.com"} | ${p?.location||"City, Country"} | LinkedIn/GitHub if available.

Use the following Source Data exactly:
${lines||"No documents uploaded yet."}

Requirements:
- Sections must be h2 headings (## SUMMARY, ## SKILLS, ## EXPERIENCE, ## PROJECTS, ## EDUCATION).
- Job titles, Project titles, and Degrees must be h3 headings (### Title).
- Do not use tables. 
- Put the date in the same line as the job title or the line immediately following it as italicized text.
- Use clean bullet points for all descriptions.
- Ensure the formatting is flawless and ATS-friendly.`;
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
}export async function buildPortfolioHTML(userId = "local") {
  const docs = await getDocs(userId);
  const p = await getProfile(userId);
  const proj = docs.filter(d=>d.cat==="Projects");
  const cert = docs.filter(d=>d.cat==="Certifications");
  const intern = docs.filter(d=>["Internships", "Resume", "Other"].includes(d.cat));
  const acad = docs.filter(d=>d.cat==="Academics");
  const ach = docs.filter(d=>d.cat==="Achievements");
  const skills = [...new Set(docs.flatMap(d=>d.entities?.skills || []))].slice(0,24);

  const initials = (p?.name || "U").split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase();
  const avatarEl = p?.avatar
    ? `<img src="${p.avatar}" alt="${p?.name}" class="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover shadow-2xl shadow-sky-500/30 border border-white/10 mb-8" />`
    : `<div class="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-sky-500/30 border border-white/10 mb-8"><span class="text-white font-bold text-4xl sm:text-5xl">${initials}</span></div>`;

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${p?.name || "Portfolio"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
          colors: { background: '#070d1a', foreground: '#f8fafc', primary: '#0ea5e9' }
        }
      }
    }
  </script>
  <style>
    body { background-color: #070d1a; color: #f8fafc; overflow-x: hidden; scroll-behavior: smooth; }
    .glass-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
    .border-gradient { position: relative; }
    .border-gradient::before { content: ""; position: absolute; inset: 0; padding: 1px; border-radius: inherit; background: linear-gradient(to bottom right, rgba(255,255,255,0.2), transparent); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
    .gradient-text { background: linear-gradient(to right, #0ea5e9, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .reveal { opacity: 0; transform: translateY(30px); transition: all 0.8s cubic-bezier(0.5, 0, 0, 1); }
    .reveal.active { opacity: 1; transform: translateY(0); }
    .card-hover:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  </style>
</head>
<body class="antialiased selection:bg-primary selection:text-white">
  
  <!-- Glowing Background Orbs -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
    <div class="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-sky-500/10 blur-[120px]"></div>
    <div class="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[120px]"></div>
  </div>

  <!-- Header -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-background/50 backdrop-blur-md border-b border-white/10">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="font-bold tracking-tight text-lg flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xs shadow-lg shadow-sky-500/20">${initials}</div>
        ${p?.name?.split(" ")[0] || "Portfolio"}
      </div>
      <nav class="hidden md:flex gap-6 text-sm font-medium text-slate-400">
        <a href="#about" class="hover:text-white transition">About</a>
        <a href="#skills" class="hover:text-white transition">Expertise</a>
        ${proj.length ? '<a href="#projects" class="hover:text-white transition">Work</a>' : ''}
        ${intern.length ? '<a href="#experience" class="hover:text-white transition">Experience</a>' : ''}
      </nav>
      <a href="mailto:${p?.email || ""}" class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:opacity-90 transition shadow-lg shadow-primary/25">Contact</a>
    </div>
  </header>

  <!-- Hero Section -->
  <main id="about" class="pt-32 pb-20 px-6 max-w-4xl mx-auto text-center flex flex-col items-center min-h-[90vh] justify-center reveal">
    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-xs text-emerald-400 font-medium mb-8 border border-emerald-400/20">
      <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span></span>
      Available for Opportunities
    </div>
    
    ${avatarEl}
    
    <h1 class="text-5xl sm:text-7xl font-bold tracking-tight leading-tight mb-6">
      Hi, I'm <span class="gradient-text">${p?.name || "a Professional"}</span>
    </h1>
    <p class="text-xl sm:text-2xl text-slate-300 font-medium mb-8 max-w-2xl mx-auto">
      ${p?.title || "Building digital experiences and AI solutions."}
    </p>
    <div class="flex flex-wrap justify-center gap-3 text-sm text-slate-400 mb-12">
      <span class="px-3 py-1 rounded-full glass-card">Developer</span>
      <span class="px-3 py-1 rounded-full glass-card">Engineer</span>
      <span class="px-3 py-1 rounded-full glass-card">Problem Solver</span>
      ${p?.location ? `<span class="px-3 py-1 rounded-full glass-card flex items-center gap-1">📍 ${p.location}</span>` : ''}
    </div>
  </main>

  <!-- Skills Section -->
  <section id="skills" class="py-20 px-6 max-w-6xl mx-auto reveal">
    <div class="mb-12">
      <div class="text-sky-400 font-semibold text-sm tracking-wider uppercase mb-2">Expertise</div>
      <h2 class="text-3xl sm:text-4xl font-bold">Technical Arsenal</h2>
    </div>
    <div class="flex flex-wrap gap-3">
      ${skills.map(s => `<div class="px-5 py-2.5 rounded-full glass-card text-sm font-medium hover:bg-white/5 hover:border-white/20 transition cursor-default">${s}</div>`).join("") || "<p class='text-slate-500'>No skills found.</p>"}
    </div>
  </section>

  <!-- Projects -->
  ${proj.length ? `
  <section id="projects" class="py-20 px-6 max-w-6xl mx-auto reveal">
    <div class="mb-12">
      <div class="text-violet-400 font-semibold text-sm tracking-wider uppercase mb-2">Work</div>
      <h2 class="text-3xl sm:text-4xl font-bold">Featured Projects</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${proj.map((p2: any) => `
      <div class="glass-card rounded-2xl overflow-hidden border-gradient card-hover transition-all duration-300 flex flex-col group">
        ${p2.fileUrl ? `<img src="${p2.fileUrl}" alt="${p2.title}" class="w-full h-48 object-cover border-b border-white/10 group-hover:scale-105 transition-transform duration-500"/>` : `<div class="w-full h-48 bg-gradient-to-br from-sky-500/10 to-violet-500/10 border-b border-white/10 flex items-center justify-center text-4xl">💻</div>`}
        <div class="p-6 flex-1 flex flex-col">
          <div class="text-xs font-mono text-slate-400 mb-3 bg-white/5 inline-block px-2 py-1 rounded w-fit">${p2.year}</div>
          <h3 class="text-xl font-bold mb-2">${p2.title}</h3>
          <p class="text-slate-400 text-sm leading-relaxed mb-6 flex-1">${p2.summary}</p>
          <div class="flex flex-wrap gap-2 mt-auto">
            ${(p2.entities?.tech || []).slice(0,4).map((t:string)=>`<span class="text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded bg-white/5 text-slate-300">${t}</span>`).join("")}
          </div>
        </div>
      </div>
      `).join("")}
    </div>
  </section>` : ""}

  <!-- Experience -->
  ${intern.length ? `
  <section id="experience" class="py-20 px-6 max-w-6xl mx-auto reveal">
    <div class="mb-12">
      <div class="text-emerald-400 font-semibold text-sm tracking-wider uppercase mb-2">Experience</div>
      <h2 class="text-3xl sm:text-4xl font-bold">Professional Journey</h2>
    </div>
    <div class="space-y-6">
      ${intern.map((p2: any) => `
      <div class="glass-card rounded-2xl p-6 sm:p-8 border-gradient card-hover transition-all">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
          <div>
            <h3 class="text-xl font-bold">${p2.title}</h3>
            <div class="text-primary font-medium text-sm mt-1">${p2.entities?.orgs?.[0] || "Organization"}</div>
          </div>
          <div class="text-sm font-mono bg-white/5 px-3 py-1 rounded-full w-fit">${p2.year}</div>
        </div>
        <p class="text-slate-400 text-sm leading-relaxed">${p2.summary}</p>
      </div>
      `).join("")}
    </div>
  </section>` : ""}

  <!-- Education & Certifications -->
  ${(acad.length || cert.length || ach.length) ? `
  <section class="py-20 px-6 max-w-6xl mx-auto reveal">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
      ${acad.length ? `
      <div>
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-3"><span class="text-sky-400">🎓</span> Education</h2>
        <div class="space-y-4">
          ${acad.map((p2: any) => `
          <div class="glass-card p-5 rounded-xl border-l-4 border-l-sky-400 border-t border-r border-b border-white/5 card-hover transition-all">
            <h4 class="font-bold">${p2.title}</h4>
            <div class="text-xs text-slate-400 mt-2">${p2.year} • ${p2.entities?.orgs?.[0] || "Institution"}</div>
          </div>
          `).join("")}
        </div>
      </div>` : ""}
      
      ${cert.length || ach.length ? `
      <div>
        <h2 class="text-2xl font-bold mb-6 flex items-center gap-3"><span class="text-pink-400">🏆</span> Awards & Certs</h2>
        <div class="space-y-4">
          ${[...cert, ...ach].slice(0, 5).map((c: any) => `
          <div class="glass-card p-5 rounded-xl border-l-4 border-l-pink-400 border-t border-r border-b border-white/5 card-hover transition-all">
            <h4 class="font-bold">${c.title}</h4>
            <div class="text-xs text-slate-400 mt-2">${c.year}</div>
          </div>
          `).join("")}
        </div>
      </div>` : ""}
    </div>
  </section>` : ""}

  <!-- Footer -->
  <footer class="py-10 text-center border-t border-white/10 mt-20 reveal">
    <p class="text-slate-500 text-sm">&copy; ${new Date().getFullYear()} ${p?.name || "Portfolio"}. Auto-generated via MemoryVerse AI.</p>
  </footer>

  <script>
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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
