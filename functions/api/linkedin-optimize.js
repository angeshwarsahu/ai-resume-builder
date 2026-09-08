// =============================================================================
// functions/api/linkedin-optimize.js
// Becomes POST /api/linkedin-optimize once deployed. Same pattern as the
// other generate-*.js endpoints.
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

function buildPrompt({ profile, level }) {
  return `You are a LinkedIn profile writing expert. Write LinkedIn content using ONLY the real background given below — never invent achievements, employers, numbers, or skills not provided.

CANDIDATE LEVEL: ${level}
NAME: ${profile.name}
TARGET ROLE: ${profile.targetRole || 'not specified'}
EDUCATION: ${JSON.stringify(profile.education || [])}
EXPERIENCE (raw notes): ${JSON.stringify(profile.experience || [])}
PROJECTS (raw notes): ${JSON.stringify(profile.projects || [])}
SKILLS: ${profile.skills || ''}
CERTIFICATIONS: ${profile.certifications || ''}

Write:
1. A LinkedIn headline (under 220 characters) — not just a job title, should mention 1-2 real strengths/skills.
2. An About section (150-250 words, first person, warm but professional, plain language, not corporate jargon) covering who they are, their real experience/projects, and what they're looking for.
3. A short list of skills worth adding to a LinkedIn profile, based only on what they already listed.

Return ONLY JSON, no markdown fences:
{"headline": "string", "about": "string", "skillsToAdd": ["skill1","skill2"]}`;
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
    const result = await callGemini(buildPrompt(body), apiKey, { temperature: 0.5, maxOutputTokens: 900 });
    return okResponse(result);
  } catch (err) {
    return aiErrorResponse();
  }
}

export async function onRequestGet() { return methodNotAllowed(); }
