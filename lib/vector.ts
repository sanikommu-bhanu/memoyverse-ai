import { MemDoc } from "./types";
import { embed } from "./gemini";
import { getDocs } from "./hybridStore";

export function cosine(a: number[], b: number[]): number {
  if (!a?.length || a.length !== b?.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
  const d = Math.sqrt(na)*Math.sqrt(nb);
  return d===0 ? 0 : dot/d;
}

export async function semanticSearch(
  query: string, topK=20, cat?: string, userId="local"
): Promise<{doc:MemDoc;score:number}[]> {
  const docs = await getDocs(userId);
  if (!docs.length) return [];
  const qv = await embed(query);
  const pool = cat && cat!=="All" ? docs.filter(d=>d.cat===cat) : docs;
  const scored = pool
    .filter(d=>d.embedding?.length>0)
    .map(d=>({doc:d,score:cosine(qv,d.embedding)}))
    .sort((a,b)=>b.score-a.score);
  if ((scored[0]?.score??0)<0.001) return kwSearch(query,pool,topK);
  return scored.slice(0,topK);
}

function kwSearch(q:string,docs:MemDoc[],k:number){
  const tokens=q.toLowerCase().split(/\s+/).filter(Boolean);
  return docs.map(d=>{
    const hay=`${d.title} ${d.summary} ${d.cat} ${d.year} ${(d.entities?.skills || []).join(" ")}`.toLowerCase();
    const score=tokens.reduce((a,t)=>a+(hay.includes(t)?1:0),0)/Math.max(tokens.length,1);
    return {doc:d,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,k);
}

export async function retrieveTop(query:string, k=6, userId="local"){
  return semanticSearch(query,k,undefined,userId);
}
