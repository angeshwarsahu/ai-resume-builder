import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  const mode = String(body?.mode || "match");
  const role = String(body?.role || "").slice(0, 500);
  const jd = String(body?.jd || "").slice(0, 18000);
  const profile = String(body?.profile || "").slice(0, 18000);
  if (!role && !jd && !profile) return badRequest("Provide a role, job description or profile.");
  const prompt = `You are a careful career assistant. Analyze only the information supplied by the user. Never invent qualifications, employers, salary, vacancy dates, exam rules, or job requirements. If something is missing, say it is missing. Give practical next steps. Do not guarantee hiring or selection.

TASK: ${mode}
TARGET ROLE: ${role}
JOB DESCRIPTION / VACANCY TEXT:
${jd}

USER PROFILE / RESUME TEXT:
${profile}

Return useful plain text with clear headings. For match: separate strong matches, partial matches, missing requirements, and evidence from the supplied profile. For gap: list skill gaps and a realistic learning/practice order. For resume: give a prioritized improvement plan. For interview: give likely question areas and preparation tasks, without claiming these are official questions. For cover: give a concise evidence-based cover-letter brief. For roadmap: give 30/60/90-day style steps only if useful, clearly labeling assumptions.`;
  try { return okResponse(await callGemini(prompt, env.GEMINI_API_KEY, { maxOutputTokens: 2800 })); }
  catch (e) { console.error("career-assistant error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
