import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from "../_shared/gemini.js";

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return badRequest("Invalid JSON."); }
  if (!env.GEMINI_API_KEY) return notConfiguredResponse();
  const source = String(body?.source || "").trim();
  const answer = String(body?.answer || "").trim();
  if (!source || !answer) return badRequest("Source and answer are required.");
  if (source.length > 50000 || answer.length > 12000) return badRequest("Verification input is too large.");
  const prompt = `You are a strict verification assistant. Compare the proposed answer ONLY against the supplied source. Do not use outside knowledge. Identify unsupported claims, changed numbers/dates/names, contradictions, and important omissions. If the answer is fully supported, say so. Return ONLY valid JSON: {"status":"supported|partially_supported|unsupported","issues":["..."],"supported_points":["..."],"corrections":["..."]}. Keep each item short. Never invent a correction that is not supported by the source.

SOURCE:
${source}

PROPOSED ANSWER:
${answer}`;
  try {
    const raw = await callGemini(prompt, env.GEMINI_API_KEY, { maxOutputTokens: 1800 });
    let parsed; try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : null; }
    if (!parsed || !parsed.status) throw new Error("Invalid verification JSON");
    return okResponse(parsed);
  } catch (e) { console.error("verify error", e); return aiErrorResponse(); }
}
export async function onRequestGet(){ return methodNotAllowed(); }
