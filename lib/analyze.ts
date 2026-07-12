import { DocCat, Entities } from "./types";
import { generate, embed, hasKey, parseJSON } from "./gemini";

export interface Analysis {
  title: string; cat: DocCat; summary: string;
  entities: Entities; year: string; confidence: number; embedding: number[];
}

const SKILLS = ["Python","JavaScript","TypeScript","React","React Native","Node.js","Java","C++","C#","Go","Rust","TensorFlow","PyTorch","Keras","Scikit-learn","Machine Learning","Deep Learning","Computer Vision","NLP","LLM","SQL","PostgreSQL","MongoDB","Redis","Firebase","AWS","Azure","GCP","Docker","Kubernetes","Git","GitHub","Figma","Photoshop","Illustrator","Data Structures","Algorithms","OpenCV","Flask","Django","FastAPI","Express","Next.js","Vue.js","Angular","HTML","CSS","Tailwind","REST API","GraphQL","Linux","Cloud Computing","Pandas","NumPy","Matplotlib","Jupyter","Spark","Hadoop","Blockchain","Swift","Kotlin","Flutter","Unity","R","MATLAB","Excel","Power BI","Tableau","Selenium","Pytest","Jest","CI/CD","Terraform","Ansible"];

function localExtract(text: string): Entities {
  const skills = SKILLS.filter(s => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text));
  const dates = [...new Set((text.match(/\b(19|20)\d{2}\b/g) ?? []))].slice(0,8);
  const orgs = [...new Set((text.match(/\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+){0,3})\s(?:University|Institute|College|Technologies|Inc|Labs|Solutions|Academy|Corp|Ltd|LLC|Pvt)\b/g) ?? []))].slice(0,6);
  const tech = skills.filter(s => ["Python","JavaScript","TypeScript","React","Node.js","Java","C++","TensorFlow","PyTorch","OpenCV","Flask","Django","Next.js","Kubernetes","Docker","AWS","Azure","GCP"].includes(s));
  return { skills, orgs, dates, tech };
}

function localCat(text: string, name: string): DocCat {
  const t = (text + " " + name).toLowerCase();
  if (/certif|completion|credential/.test(t)) return "Certifications";
  if (/intern(ship)?/.test(t)) return "Internships";
  if (/research|paper|journal|publication|thesis|academic|degree|bachelor|master|phd/.test(t)) return "Academics";
  if (/award|winner|achievement|hackathon|finalist|prize/.test(t)) return "Achievements";
  if (/resume|curriculum vitae|\bcv\b/.test(t)) return "Resume";
  if (/project|github|repositor/.test(t)) return "Projects";
  if (/skill/.test(t)) return "Skills";
  return "Other";
}

export async function analyzeDoc(rawText: string, fileName: string): Promise<Analysis> {
  const trimmed = rawText.slice(0, 7000);

  const [embedding, aiResult] = await Promise.all([
    embed(trimmed),
    hasKey() ? geminiAnalyze(trimmed, fileName) : Promise.resolve(null),
  ]);

  if (aiResult) return { ...aiResult, embedding };

  const entities = localExtract(trimmed);
  const cat = localCat(trimmed, fileName);
  const year = entities.dates[0] ?? String(new Date().getFullYear());
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-]+/g, " ").trim() || "Untitled";
  return {
    title, cat,
    summary: `A ${cat.toLowerCase()} document. ${entities.skills.slice(0,3).join(", ") || ""}. Add a Gemini API key for AI summaries.`,
    entities, year, confidence: 65, embedding,
  };
}

async function geminiAnalyze(text: string, fileName: string): Promise<Omit<Analysis,"embedding"> | null> {
  try {
    const raw = await generate(`You are a document intelligence engine for a personal AI knowledge system.
Extract information from this document and return ONLY valid JSON (no markdown fences):
{
  "title": "concise title max 8 words",
  "cat": "Certifications|Projects|Internships|Skills|Academics|Achievements|Resume|Other",
  "summary": "2 clear sentences about what this document represents for the person's career",
  "entities": {
    "skills": ["skill1","skill2"],
    "orgs": ["organization1"],
    "dates": ["2024"],
    "tech": ["technology1"]
  },
  "year": "primary year e.g. 2024",
  "confidence": 85
}

File name: ${fileName}
Document text:
"""${text}"""`, 900);
    const p = parseJSON<any>(raw, null);
    if (p) {
      if (!p.entities) p.entities = {};
      p.entities.skills = Array.isArray(p.entities.skills) ? p.entities.skills : [];
      p.entities.orgs = Array.isArray(p.entities.orgs) ? p.entities.orgs : [];
      p.entities.dates = Array.isArray(p.entities.dates) ? p.entities.dates : [];
      p.entities.tech = Array.isArray(p.entities.tech) ? p.entities.tech : [];
      return p;
    }
    return null;
  } catch { return null; }
}
