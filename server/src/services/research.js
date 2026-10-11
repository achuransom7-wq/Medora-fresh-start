const { client, MODEL, LOCAL_MODE } = require('./ai');

/**
 * "Research mode" — a deeper, multi-source lookup on a health topic, grounded in
 * live web search rather than the model's memory alone. Used for the "Learn more"
 * button on assistant messages, e.g. "what does the WHO recommend for managing
 * type 2 diabetes at home?"
 *
 * Returns a plain-language report plus the list of sources actually consulted,
 * so the patient (or a clinician) can verify anything.
 */
async function researchHealthTopic(query, { conversationContext } = {}) {
  if (LOCAL_MODE) {
    return {
      content: `Offline research mode cannot perform a live web search, but here is a safety-oriented starting point for "${query}". Use the linked guidance to verify details and discuss them with a clinician.\n\n- Describe when the symptom started, what makes it better or worse, and any warning signs.\n- Avoid treating this information as a diagnosis or as a substitute for professional care.\n- Seek urgent care for difficulty breathing, chest pain, severe bleeding, confusion, seizures, or rapidly worsening symptoms.\n\nWhen to see a doctor: arrange an in-person assessment if symptoms are severe, persistent, worsening, or worrying you.`,
      sources: [
        { title: 'World Health Organization — Health topics', url: 'https://www.who.int/health-topics' },
        { title: 'CDC — Health information', url: 'https://www.cdc.gov/health-topics.html' },
      ],
    };
  }

  const system = `You are Medora's research assistant. Given a health-related question, use web search to find current, reputable information (prioritize WHO, CDC, Mayo Clinic, NHS, peer-reviewed sources, and Cameroon Ministry of Public Health where relevant). Then produce a clear, plain-language report for a patient.

Rules:
- This is informational, not a diagnosis or prescription — never tell the reader they definitely have or don't have a condition.
- Never give specific prescription drug names + dosages; general categories are fine.
- Structure your answer as: a short direct answer first, then 3-6 bullet points of supporting detail, then a one-line note on when to see a doctor.
- Keep it concise — this is read on a phone.
- Paraphrase sources in your own words; do not quote long passages.`;

  const userContent = conversationContext
    ? `Relevant conversation context: ${conversationContext}\n\nQuestion to research: ${query}`
    : `Question to research: ${query}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: userContent }],
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  });

  const textParts = [];
  const sources = [];
  const seenUrls = new Set();

  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
      // Pull citation URLs attached to this text block, if present
      if (Array.isArray(block.citations)) {
        for (const c of block.citations) {
          if (c.url && !seenUrls.has(c.url)) {
            seenUrls.add(c.url);
            sources.push({ title: c.title || c.url, url: c.url });
          }
        }
      }
    }
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.url && !seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          sources.push({ title: result.title || result.url, url: result.url });
        }
      }
    }
  }

  return {
    content: textParts.join('\n\n').trim(),
    sources: sources.slice(0, 8),
  };
}

module.exports = { researchHealthTopic };
