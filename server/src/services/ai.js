const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { checkRedFlags, escalate } = require('./triage');
const { getLocalResponse, getOllamaResponse } = require('./local-ai');

const configuredApiKey = process.env.ANTHROPIC_API_KEY || '';
const hasAnthropicKey = configuredApiKey && !configuredApiKey.includes('your-key-here');
const OLLAMA_MODE = process.env.AI_PROVIDER === 'ollama';
const LOCAL_MODE = process.env.AI_PROVIDER === 'local' || OLLAMA_MODE || !hasAnthropicKey;
const client = new Anthropic({ apiKey: hasAnthropicKey ? configuredApiKey : 'local-mode-disabled-key' });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const BASE_SYSTEM_PROMPT = `You are Medora, a compassionate AI health assistant for users in Cameroon, primarily accessed over WhatsApp-style chat and a web/mobile app. You are NOT a doctor and you never diagnose with certainty. Your job is to:

1. Ask short, focused clarifying questions to understand symptoms (one or two questions at a time, not a wall of questions).
2. Once you have enough information, give general, safe, evidence-based self-care guidance for mild issues.
3. Classify the severity of the situation and recommend next steps.
4. Always be clear about the limits of AI guidance and encourage professional care when appropriate.
5. You may receive photos (rashes, swelling, injuries, prescriptions, lab report pages). Describe what you observe in plain terms, note its limits (you cannot definitively diagnose from a photo), and factor it into your severity assessment.

SEVERITY LEVELS you must classify every substantive response with (respond with the tag exactly as shown at the very end of your message, on its own line):
[SEVERITY: self_care] - mild, manageable at home (e.g. common cold, minor headache, mild indigestion)
[SEVERITY: monitor] - should be watched, may need care if it persists or worsens (e.g. fever under 2 days, mild persistent cough)
[SEVERITY: see_doctor] - should see a doctor within 24-48 hours (e.g. persistent high fever, moderate pain, signs of infection)
[SEVERITY: urgent] - needs immediate in-person medical attention (e.g. chest pain, difficulty breathing, severe bleeding, stroke signs, suicidal ideation, anaphylaxis, seizures)

RULES:
- Never prescribe specific prescription medication names or dosages. You can mention general categories (e.g. "an over-the-counter pain reliever") but never specific drug + dosage combinations.
- Never claim certainty about a diagnosis. Use language like "this could be consistent with..." not "you have...".
- For anything urgent, tell the user clearly and immediately to seek emergency care or go to the nearest hospital, and keep your message SHORT and directive — do not ask further clarifying questions first.
- Be warm, clear, and calm. Avoid alarming language unless the situation is genuinely urgent.
- Keep responses concise — this is a chat interface, not an essay. 2-5 short paragraphs or a short list, maximum.
- If the user asks something unrelated to health, gently redirect to how you can help with health questions.
- Always end your substantive response with the severity tag on its own line, exactly as: [SEVERITY: level]
- If you are still gathering information and haven't reached a conclusion yet, you may omit the severity tag on early clarifying-question turns, OR use [SEVERITY: monitor] as a safe default if any concerning symptoms have been mentioned.`;

const STYLE_INSTRUCTIONS = {
  simple: 'Use very plain, everyday language. Short sentences. Avoid medical jargon entirely — if you must use a clinical term, immediately explain it in parentheses.',
  standard: 'Use clear, everyday language with light medical terminology where it aids precision, briefly explained.',
  clinical: 'You may use standard clinical terminology (still avoiding definitive diagnosis or specific prescriptions). Assume the reader has some health literacy.',
};

const LANGUAGE_INSTRUCTIONS = {
  en: 'Respond in English.',
  fr: 'Respond in French.',
  pidgin: 'Respond in Cameroonian Pidgin English, kept simple and warm.',
};

function extractSeverity(responseText) {
  const match = responseText.match(/\[SEVERITY:\s*(self_care|monitor|see_doctor|urgent)\]/i);
  return match ? match[1].toLowerCase() : null;
}

function stripSeverityTag(responseText) {
  return responseText.replace(/\[SEVERITY:\s*(self_care|monitor|see_doctor|urgent)\]/i, '').trim();
}

function buildSystemPrompt(preferences) {
  const style = STYLE_INSTRUCTIONS[preferences?.communication_style] || STYLE_INSTRUCTIONS.standard;
  const language = LANGUAGE_INSTRUCTIONS[preferences?.language] || LANGUAGE_INSTRUCTIONS.en;
  return `${BASE_SYSTEM_PROMPT}\n\nCOMMUNICATION STYLE: ${style}\nLANGUAGE: ${language}`;
}

/** Build an Anthropic image content block from a file on disk */
function imageBlockFromFile(filePath, mimeType) {
  const data = fs.readFileSync(filePath).toString('base64');
  return { type: 'image', source: { type: 'base64', media_type: mimeType, data } };
}

/**
 * Get an AI health consultation response.
 * @param {Array<{role: string, content: string}>} history - prior conversation turns
 * @param {string} userMessage - the new user message
 * @param {object} opts
 * @param {object} opts.healthProfile - allergies/conditions/medications from the profile form
 * @param {Array<object>} opts.memories - active long-term memory facts learned about this patient
 * @param {Array<{file_path:string, mime_type:string, original_name:string}>} opts.attachments - image attachments for this message
 * @param {object} opts.preferences - communication_style / language
 */
async function getConsultationResponse(history, userMessage, opts = {}) {
  const { healthProfile = null, memories = [], attachments = [], preferences = null } = opts;

  // Hard safety override: check red flags before even calling the model
  const redFlagHit = checkRedFlags(userMessage);

  if (LOCAL_MODE) {
    let localResponse;
    if (OLLAMA_MODE) {
      try {
        const ollamaText = await getOllamaResponse(userMessage, history, preferences, attachments);
        const ollamaSeverity = extractSeverity(ollamaText);
        localResponse = {
          text: stripSeverityTag(ollamaText),
          severity: redFlagHit ? 'urgent' : ollamaSeverity || 'monitor',
          redFlagOverride: redFlagHit,
        };
      } catch (err) {
        localResponse = await getLocalResponse(userMessage, history, preferences, attachments, healthProfile, memories);
      }
    } else {
      localResponse = await getLocalResponse(userMessage, history, preferences, attachments, healthProfile, memories);
    }
    return {
      text: localResponse.text,
      severity: localResponse.severity || (redFlagHit ? 'urgent' : 'monitor'),
      redFlagOverride: localResponse.redFlagOverride || redFlagHit,
    };
  }

  let profileContext = '';
  if (healthProfile) {
    const parts = [];
    if (healthProfile.allergies) parts.push(`Allergies: ${healthProfile.allergies}`);
    if (healthProfile.chronic_conditions) parts.push(`Chronic conditions: ${healthProfile.chronic_conditions}`);
    if (healthProfile.current_medications) parts.push(`Current medications: ${healthProfile.current_medications}`);
    if (parts.length) profileContext += `\n\n[User health profile: ${parts.join('; ')}]`;
  }

  if (memories.length) {
    const memText = memories.map((m) => `- (${m.category}) ${m.content}`).join('\n');
    profileContext += `\n\n[Things Medora remembers about this patient from past visits:\n${memText}]`;
  }

  // Build the content for the new user turn: text plus any image attachments
  const imageBlocks = attachments
    .filter((a) => a.mime_type?.startsWith('image/'))
    .map((a) => {
      try {
        return imageBlockFromFile(a.file_path, a.mime_type);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);

  const userContent = imageBlocks.length
    ? [...imageBlocks, { type: 'text', text: userMessage + profileContext }]
    : userMessage + profileContext;

  const messages = [...history.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: userContent }];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: buildSystemPrompt(preferences),
    messages,
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  let severity = extractSeverity(text);
  const cleanText = stripSeverityTag(text);

  // Safety net: red-flag keyword match always escalates to at least 'urgent'
  if (redFlagHit) {
    severity = escalate(severity, 'urgent');
  } else if (!severity) {
    severity = 'monitor'; // safe default when model doesn't tag (still gathering info)
  }

  return { text: cleanText, severity, redFlagOverride: redFlagHit };
}

/** Generate a short title for a new conversation based on the first message */
function fallbackTitle(firstMessage) {
  const words = String(firstMessage || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s\[({"']+|[\s\])}"']+$/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 6);

  if (words.length === 0 || words.join(' ').toLowerCase() === '(see attached)') return 'Health concern';

  const title = words.join(' ').replace(/[.,!?;:]+$/g, '');
  return title.charAt(0).toUpperCase() + title.slice(1);
}

async function generateTitle(firstMessage) {
  const fallback = fallbackTitle(firstMessage);
  if (LOCAL_MODE) return fallback;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 20,
      system: 'Generate a very short (3-5 word) title summarizing this health concern for a conversation list. Respond with ONLY the title, no quotes, no punctuation at the end.',
      messages: [{ role: 'user', content: firstMessage }],
    });
    const text = response.content
      .find((b) => b.type === 'text')
      ?.text?.trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/[.!?]+$/g, '')
      .slice(0, 80);
    return text || fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Generate a downloadable "visit summary" document from a conversation transcript.
 * This is Medora's equivalent of an Artifact: a clean, structured, shareable document
 * the patient can save, print, or take to a clinic.
 */
async function generateCareSummary(history, { patientName, latestSeverity } = {}) {
  const transcript = history.map((m) => `${m.role === 'user' ? 'Patient' : 'Medora'}: ${m.content}`).join('\n\n');

  if (LOCAL_MODE) {
    const reportedSymptoms = history
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .filter(Boolean);
    const latestAssistantReply = [...history].reverse().find((m) => m.role === 'assistant')?.content;
    const severityLabel = {
      self_care: 'Self-care — generally manageable at home',
      monitor: 'Monitor — seek care if symptoms persist or worsen',
      see_doctor: 'See a doctor — arrange an in-person visit',
      urgent: 'Urgent — seek immediate in-person care',
    }[latestSeverity] || 'Not classified';

    return `# Visit Summary
**Date:** ${new Date().toISOString().slice(0, 10)}
**Patient:** ${patientName || 'Not specified'}

## Reported Symptoms
${reportedSymptoms.length ? reportedSymptoms.map((item) => `- ${item}`).join('\n') : '- No symptoms recorded'}

## Discussion Summary
This summary was generated from the recorded Medora conversation in offline mode. The patient described the concerns listed above and received general health guidance.

## Medora's Assessment
${latestAssistantReply || 'No assistant assessment was recorded.'}

## Severity Level
${severityLabel}

## Recommended Next Steps
- Review the guidance and monitor for changes.
- Seek in-person care if symptoms are severe, persistent, unusual, or worsening.
- Seek emergency care immediately for warning signs.

## Important Note
This is AI-generated general guidance, not a medical diagnosis. A qualified clinician should assess any urgent or worsening concern.`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: `You write clean, structured visit summary documents from a patient/AI-assistant chat transcript, for the patient to save or show a clinician. Use this exact Markdown structure:

# Visit Summary
**Date:** {today's date}
**Patient:** {name or "Not specified"}

## Reported Symptoms
(bulleted list)

## Discussion Summary
(2-4 short sentences)

## Medora's Assessment
(1-2 sentences, always framed as guidance, never a diagnosis)

## Severity Level
{self_care / monitor / see_doctor / urgent, plain-language one-line explanation}

## Recommended Next Steps
(bulleted list, 2-4 items)

## Important Note
A brief standard note that this is AI-generated guidance, not a medical diagnosis, and to seek professional care for anything worsening or urgent.

Respond with ONLY the Markdown document, nothing else.`,
    messages: [
      {
        role: 'user',
        content: `Patient name: ${patientName || 'Not specified'}\nLatest severity tag from conversation: ${latestSeverity || 'unknown'}\n\nTranscript:\n${transcript}`,
      },
    ],
  });

  return response.content.find((b) => b.type === 'text')?.text?.trim() || '';
}

module.exports = { getConsultationResponse, generateTitle, generateCareSummary, client, MODEL, LOCAL_MODE };
