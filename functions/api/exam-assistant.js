import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  if (!body || typeof body !== "object") return badRequest("Invalid request.");
  const mode = String(body.mode || "mcq");
  const exam = String(body.exam || "General").slice(0,300);
  const topic = String(body.topic || "General").slice(0,1500);
  const source = String(body.source || "").slice(0,10000);
  const level = String(body.level || "beginner").slice(0,100);
  try {
    const data = await callGemini(`You are a careful exam-preparation assistant. Create useful practice material, but do not claim that a question is from an official exam unless the supplied source says so. If source material is supplied, stay grounded in it and do not silently replace it with outside facts. Never invent an official syllabus, cutoff, date, notification, or current rule.

EXAM OR CLASS: ${exam}
TOPIC: ${topic}
LEARNER LEVEL: ${level}
MODE: ${mode}
SOURCE MATERIAL: ${source}

For MCQ mode, make 5 MCQs with four options and an answer plus one-line explanation. For mini mock test, make 10 mixed questions with an answer key. For explanation, teach from basics with a small example. For revision, make a realistic short plan. For strategy, give general preparation advice and clearly label any assumption. For practice questions, provide questions followed by answers.
Return JSON only: {"answer":"..."}.`, env.GEMINI_API_KEY, { maxOutputTokens: 2200 });
    return okResponse(data);
  } catch (e) { console.error("exam assistant error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
