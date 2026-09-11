import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  if (!body || typeof body !== "object") return badRequest("Invalid request.");
  try {
    const data = await callGemini(`You are a careful study assistant. Respond only with useful educational content. Do not invent facts presented as sourced facts. If source text is provided, stay grounded in it. Adapt the language and difficulty to the learner level.

LEVEL: ${body.level || "General"}
MODE: ${body.mode || "explain"}
TOPIC: ${String(body.topic || "").slice(0,3000)}
SOURCE TEXT: ${String(body.source || "").slice(0,8000)}

Return JSON only: {"answer":"..."}. For a quiz, create 5 MCQs with options and answer key. For revision, make a practical short plan. For explanation, use simple examples and avoid unnecessary jargon.`, env.GEMINI_API_KEY, { maxOutputTokens: 1800 });
    return okResponse(data);
  } catch (e) { console.error("AI endpoint error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
