// =============================================================================
// functions/api/generate-cover-letter.js
//
// Becomes POST /api/generate-cover-letter once deployed to Cloudflare Pages.
// Same pattern as generate-resume.js: validation, Gemini call, structured
// JSON response. See that file's header comment for the Claude-swap note —
// it applies here identically.
// =============================================================================

import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from '../_shared/gemini.js';

const MAX_LEN = 6000;

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  const { profile, level } = body;
  if (!profile || typeof profile !== 'object') return 'Profile is required.';
  if (!profile.name || !String(profile.name).trim()) return 'Name is required.';
  if (!['fresher', 'experienced', 'switcher'].includes(level)) return 'Invalid candidate level.';
  if (JSON.stringify(body).length > MAX_LEN * 6) return 'Request is too large.';
  return null;
}

function buildPrompt({ profile, jd, level }) {
  return `You are an expert cover letter writer. Write a genuine, specific cover letter using ONLY the real background given below — never invent achievements, employers, or skills not provided.

CANDIDATE LEVEL: ${level}
NAME: ${profile.name}
TARGET ROLE: ${profile.targetRole || 'not specified'}
EDUCATION: ${JSON.stringify(profile.education || [])}
EXPERIENCE (raw notes): ${JSON.stringify(profile.experience || [])}
PROJECTS (raw notes): ${JSON.stringify(profile.projects || [])}
SKILLS: ${profile.skills || ''}
CERTIFICATIONS: ${profile.certifications || ''}
${jd ? `TARGET JOB DESCRIPTION — reference the actual role/company/requirements mentioned in this naturally:\n"""${jd}"""` : 'No specific job description given — write a strong general cover letter for the target role.'}

Rules:
- 3-4 short paragraphs: (1) why this role/company interests the candidate and a one-line hook of who they are, (2) their most relevant real experience/project/skill matched to what the JD asks for, (3) one more concrete example if available, (4) a confident, brief closing.
- Natural, human tone — not generic corporate language, not overly formal, not desperate-sounding.
- Only reference facts actually given above. If the JD names a company, you may address it, but do not invent details about the company itself beyond what's in the JD text.

Return ONLY JSON, no markdown fences: {"paragraphs": ["paragraph 1 text", "paragraph 2 text", "..."]}
Each paragraph should be 2-4 sentences, no markdown, no bullet points — plain prose paragraphs only.`;
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
    const result = await callGemini(buildPrompt(body), apiKey, { temperature: 0.5, maxOutputTokens: 1200 });
    return okResponse(result);
  } catch (err) {
    return aiErrorResponse();
  }
}

export async function onRequestGet() { return methodNotAllowed(); }
