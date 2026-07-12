import { MemDoc } from "./types";
import { embed } from "./gemini";
import { getDocs } from "./hybridStore";

export function cosine(av: number[], bv: number[], aSource?: string, bSource?: string): number {
  if (!av?.length || av.length !== bv?.length) return 0;
  if (aSource && bSource && aSource !== bSource) {
    console.warn(`[Vector] Mismatched embedding sources: ${aSource} vs ${bSource}. Ignoring doc.`);
    return -1; // sentinel: caller counts these
  }
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < av.length; i++) { dot+=av[i]*bv[i]; na+=av[i]*av[i]; nb+=bv[i]*bv[i]; }
  const d = Math.sqrt(na)*Math.sqrt(nb);
  return d===0 ? 0 : dot/d;
}

export async function semanticSearch(
  query: string, topK=20, cat?: string, userId="local"
): Promise<{doc:MemDoc;score:number}[]> {
  const { results } = await semanticSearchWithMeta(query, topK, cat, userId);
  return results;
}

/** Like semanticSearch but also returns the count of docs skipped due to
 *  embedding source mismatch so callers can surface "N docs need re-embedding". */
export async function semanticSearchWithMeta(
  query: string, topK=20, cat?: string, userId="local"
): Promise<{results:{doc:MemDoc;score:number}[]; skippedMismatch:number}> {
  const docs = await getDocs(userId);
  if (!docs.length) return { results: [], skippedMismatch: 0 };
  const { values: qv, source: qSource } = await embed(query);
  const pool = cat && cat!=="All" ? docs.filter(d=>d.cat===cat) : docs;
  let skippedMismatch = 0;
  const scored = pool
    .filter(d=>d.embedding?.length>0)
    .map(d=>{
      const s = cosine(qv, d.embedding, qSource, d.embeddingSource);
      if (s === -1) { skippedMismatch++; return null; }
      return { doc: d, score: s };
    })
    .filter((x): x is {doc:MemDoc;score:number} => x !== null)
    .sort((a,b)=>b.score-a.score);
  if ((scored[0]?.score??0)<0.001) return { results: kwSearch(query,pool,topK), skippedMismatch };
  return { results: scored.slice(0,topK), skippedMismatch };
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
