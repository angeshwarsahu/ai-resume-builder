// =============================================================================
// functions/api/interview-feedback.js
// Becomes POST /api/interview-feedback once deployed. Scores one practice
// answer at a time — kept separate from interview-questions.js so a person
// can re-request feedback on a single answer without regenerating the whole
// question set.
// =============================================================================

import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from '../_shared/gemini.js';

const MAX_LEN = 4000;

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  if (!body.question || !String(body.question).trim()) return 'Question is required.';
  if (!body.answer || !String(body.answer).trim()) return 'Answer is required.';
  if (String(body.answer).length > MAX_LEN) return 'Answer is too long.';
  return null;
}

function buildPrompt({ question, answer, targetRole }) {
  return `You are a supportive but honest interview coach. Evaluate this practice answer.

Target role: ${targetRole || 'not specified'}
Question asked: """${question}"""
Candidate's answer: """${answer}"""

Rules: Base feedback only on what the answer actually says. Be encouraging but genuinely useful — do not just praise. Never invent facts about the candidate beyond what their answer states.

Return ONLY JSON, no markdown fences:
{
  "strengths": ["short specific strength 1", "short specific strength 2"],
  "improvements": ["short specific, actionable improvement 1", "short specific, actionable improvement 2"],
  "betterOpening": "one example sentence showing a stronger way to start this answer, based on what the candidate already said"
}
Keep each strengths/improvements item to one sentence. Max 3 items each.`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return badRequest('Malformed JSON body.');
  }

  const validationError = validate(body);
  if (validationError) return badRequest(validationError);

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return notConfiguredResponse();

  try {
    const result = await callGemini(buildPrompt(body), apiKey, { temperature: 0.4, maxOutputTokens: 700 });
    return okResponse(result);
  } catch (err) {
    return aiErrorResponse();
  }
}

export async function onRequestGet() { return methodNotAllowed(); }
