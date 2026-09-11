import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  const task = String(body?.task || "").trim().slice(0, 8000);
  if (!task) return badRequest("Describe the task first.");
  const prompt = `You are the planner for an all-in-one AI work and study assistant. Plan the user's task, but do not pretend that you executed actions you cannot actually execute. Choose exactly one primary workspace from: pdf, documents, study, exam, office, career, resume, interview, linkedin, tracker. Return ONLY valid JSON with keys: workspace, reason, steps, verification. steps must be an array of 3-7 short actionable steps. verification must be an array of 1-4 checks. If the task needs a file, say that the file must be provided in the relevant workspace. Never invent facts.

USER TASK:
${task}`;
  try {
    const raw = await callGemini(prompt, env.GEMINI_API_KEY, { maxOutputTokens: 1800 });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed || !parsed.workspace || !Array.isArray(parsed.steps)) throw new Error("Planner returned invalid JSON");
    const allowed = new Set(["pdf","documents","study","exam","office","career","resume","interview","linkedin","tracker"]);
    if (!allowed.has(parsed.workspace)) parsed.workspace = "documents";
    parsed.route = parsed.workspace;
    parsed.input = /pdf|document|file|scan|image|notes|report/i.test(task) ? "file_or_text" : "text";
    return okResponse(parsed);
  } catch (e) { console.error("robot error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
