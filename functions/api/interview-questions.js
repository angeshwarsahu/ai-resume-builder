// =============================================================================
// functions/api/interview-questions.js
// Becomes POST /api/interview-questions once deployed. Same pattern as
// generate-resume.js / generate-cover-letter.js — see those files for the
// Claude-swap note if you later want to switch providers.
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
  return `You are a senior interviewer preparing realistic interview questions for a candidate.

CANDIDATE LEVEL: ${level}
TARGET ROLE: ${profile.targetRole || 'not specified'}
EDUCATION: ${JSON.stringify(profile.education || [])}
EXPERIENCE (raw notes): ${JSON.stringify(profile.experience || [])}
PROJECTS (raw notes): ${JSON.stringify(profile.projects || [])}
SKILLS: ${profile.skills || ''}
${jd ? `TARGET JOB DESCRIPTION — base role-specific questions on what this actually asks for:\n"""${jd}"""` : 'No job description given — ask general questions for the target role.'}

Generate exactly 8 interview questions:
- 2 general/behavioral (e.g. "tell me about yourself", strengths/weaknesses style)
- 3 role-specific/technical, grounded in the target role, JD, and the candidate's actual listed skills/projects — do not ask about tools or experience the candidate never mentioned
- 2 situational ("what would you do if...")
- 1 closing question ("why should we hire you" style)

Return ONLY JSON, no markdown fences:
{"questions": [{"id": "q1", "category": "behavioral|technical|situational|closing", "question": "text"}]}`;
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
    const result = await callGemini(buildPrompt(body), apiKey, { temperature: 0.6, maxOutputTokens: 1400 });
    return okResponse(result);
  } catch (err) {
    return aiErrorResponse();
  }
}

export async function onRequestGet() { return methodNotAllowed(); }
