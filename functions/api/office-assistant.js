import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  if (!body || typeof body !== "object") return badRequest("Invalid request.");
  try {
    const data = await callGemini(`You are a professional office productivity assistant. Transform the user's supplied material into the requested output. Never invent names, dates, figures, commitments, or facts that are not present. If information is missing, use a neutral placeholder such as [Name] or state that it is missing.

MODE: ${body.mode || "rewrite"}
INSTRUCTION: ${String(body.instruction || "").slice(0,4000)}
SOURCE MATERIAL: ${String(body.source || "").slice(0,10000)}

Return JSON only: {"answer":"..."}. Keep the result ready to copy into an email, report, minutes, or document as appropriate.`, env.GEMINI_API_KEY, { maxOutputTokens: 1800 });
    return okResponse(data);
  } catch (e) { console.error("AI endpoint error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
