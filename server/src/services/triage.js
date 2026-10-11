/**
 * Medora Triage Engine
 *
 * Severity levels (in ascending urgency):
 *   self_care  -> Manageable at home, general guidance safe to give
 *   monitor    -> Keep an eye on it, seek care if it worsens or persists
 *   see_doctor -> Should see a doctor within 24-48 hours
 *   urgent     -> Emergency-level, seek immediate in-person care
 *
 * RED FLAG symptoms trigger an immediate 'urgent' classification
 * regardless of what the AI model concludes - this is a hard safety
 * override that never depends solely on the LLM.
 */

const RED_FLAG_PATTERNS = [
  /chest pain/i,
  /difficulty breathing|shortness of breath|can'?t breathe/i,
  /severe bleeding|won'?t stop bleeding/i,
  /unconscious|unresponsive|passed out|fainted/i,
  /stroke|face drooping|slurred speech|sudden numbness/i,
  /suicidal|want to die|end my life|kill myself/i,
  /severe allergic reaction|anaphylaxis|throat closing|swelling of face/i,
  /seizure|convulsion/i,
  /poisoning|overdose/i,
  /severe head injury|head trauma/i,
  /pregnant.{0,20}(bleeding|severe pain)/i,
  /coughing blood|vomiting blood/i,
  /high fever.{0,20}(stiff neck|confusion)/i,
];

const SEVERITY_ORDER = ['self_care', 'monitor', 'see_doctor', 'urgent'];

function checkRedFlags(text) {
  return RED_FLAG_PATTERNS.some((pattern) => {
    const match = pattern.exec(text || '');
    if (!match) return false;
    const beforeMatch = (text || '').slice(0, match.index).toLowerCase().split(/\s+/).slice(-5);
    return !beforeMatch.some((word) => ['no', 'not', 'never', 'without', "don't", 'dont', "didn't", 'didnt'].includes(word));
  });
}

function escalate(current, proposed) {
  const cIdx = SEVERITY_ORDER.indexOf(current || 'self_care');
  const pIdx = SEVERITY_ORDER.indexOf(proposed || 'self_care');
  return SEVERITY_ORDER[Math.max(cIdx, pIdx)];
}

const SEVERITY_META = {
  self_care: { label: 'Self-care', color: '#0F5E56', description: 'Manageable at home with general care.' },
  monitor: { label: 'Monitor', color: '#F0A93A', description: 'Keep watch — seek care if it worsens.' },
  see_doctor: { label: 'See a doctor soon', color: '#E8791A', description: 'Book a visit within 24–48 hours.' },
  urgent: { label: 'Urgent — seek care now', color: '#FF6F5E', description: 'This needs immediate in-person medical attention.' },
};

module.exports = { checkRedFlags, escalate, SEVERITY_META, SEVERITY_ORDER, RED_FLAG_PATTERNS };
