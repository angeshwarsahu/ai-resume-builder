import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  const documents = String(body?.documents || "").trim();
  if (!documents) return badRequest("No document text was provided.");
  if (documents.length > 50000) return badRequest("The document set is too large for this request. Try fewer pages/files.");
  const mode = String(body?.mode || "summary");
  const question = String(body?.question || "").slice(0, 2000);
  const language = String(body?.language || "same as source");
  const prompt = `You are a careful document assistant. Work ONLY from the supplied document text. Never invent a fact and never claim that something is in a document unless the text supports it. If the answer is not present or cannot be determined, say so clearly. Preserve important names, numbers, dates and conditions exactly. Output useful plain text only.

TASK: ${mode}
LANGUAGE: ${language}
QUESTION: ${question}

DOCUMENTS:
${documents}

Rules by task:
- summary: concise structured summary with important details.
- qa: answer the question and mention the relevant page/file label when available.
- key_points: bullet the important points.
- action_items: list action, owner and deadline only when stated; otherwise say not stated.
- translate: translate the supplied content faithfully, without adding information.
- mcq: create 5 MCQs based only on the supplied text, with options and answer key.
- study_notes: make clear study notes with headings, definitions and examples only when supported by the source.`;
  try {
    const data = await callGemini(prompt, env.GEMINI_API_KEY, { maxOutputTokens: 3000 });
    return okResponse(data);
  } catch (e) { console.error("document-assistant error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
