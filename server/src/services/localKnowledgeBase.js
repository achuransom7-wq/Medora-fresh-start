/**
 * Medora Local Knowledge Base
 * ---------------------------
 * A hand-curated set of common, low-acuity presentations with matching logic.
 * This is the "brain" the local agent falls back on when no local LLM (Ollama)
 * is reachable, and it's also fed to the LLM as grounding context when one is
 * available, so responses stay anchored to reviewed guidance either way.
 *
 * IMPORTANT: This is intentionally conservative. It only covers presentations
 * that are almost always safe to give general self-care guidance for. Anything
 * outside this list — or anything with a red-flag phrase — falls through to a
 * cautious "monitor" or is escalated by triage.js's hard-coded red flag list.
 */

const CONDITIONS = [
  {
    id: 'common_cold',
    name: 'Common cold',
    keywords: ['cold', 'runny nose', 'stuffy nose', 'sneezing', 'blocked nose', 'nasal congestion', 'sniffles'],
    questions: ['How many days have you had these symptoms?', 'Do you also have a fever or body aches?'],
    severityDefault: 'self_care',
    advice: [
      'Rest and drink plenty of fluids (water, warm broths, herbal tea).',
      'A warm saline nasal rinse or steam inhalation can ease congestion.',
      'An over-the-counter pain reliever can help with any body aches or mild fever.',
      'Most colds improve within 7–10 days.',
    ],
    escalateIf: ['fever for more than 3 days', 'high fever', 'severe headache', 'chest pain', 'trouble breathing'],
  },
  {
    id: 'flu',
    name: 'Flu-like illness',
    keywords: ['flu', 'influenza', 'body aches', 'chills', 'high fever and cough', 'fever and body ache'],
    questions: ['How high has your temperature been?', 'Any shortness of breath or chest tightness?'],
    severityDefault: 'monitor',
    advice: [
      'Rest as much as possible and stay well hydrated.',
      'An over-the-counter fever reducer can help with fever and aches.',
      'Isolate from others where possible while you have a fever, to avoid spreading it.',
      'Most flu symptoms peak in 2–3 days and improve within a week.',
    ],
    escalateIf: ['difficulty breathing', 'chest pain', 'confusion', 'persistent high fever'],
  },
  {
    id: 'sore_throat',
    name: 'Sore throat',
    keywords: ['sore throat', 'throat pain', 'scratchy throat', 'painful to swallow', 'throat hurts'],
    questions: ['Is it painful enough to make swallowing difficult?', 'Do you have a fever or swollen glands?'],
    severityDefault: 'self_care',
    advice: [
      'Warm salt-water gargles (a few times a day) can soothe the throat.',
      'Warm fluids like tea with honey can help.',
      'An over-the-counter pain reliever or throat lozenge can ease discomfort.',
      'See a doctor if it lasts more than a week, or if you have white patches on your tonsils or a high fever.',
    ],
    escalateIf: ['difficulty swallowing saliva', 'difficulty breathing', 'drooling', 'high fever with rash'],
  },
  {
    id: 'headache',
    name: 'Headache',
    keywords: ['headache', 'head pain', 'migraine', 'head hurts', 'head is pounding'],
    questions: ['On a scale of 1-10, how bad is the pain?', 'Is this the worst headache of your life, or similar to headaches you have had before?'],
    severityDefault: 'self_care',
    advice: [
      'Rest in a quiet, dim room and stay hydrated.',
      'An over-the-counter pain reliever can help for occasional headaches.',
      'Notice any triggers — skipped meals, poor sleep, screen time, stress — and try to address them.',
      'If headaches are frequent or worsening, it is worth discussing with a doctor.',
    ],
    escalateIf: ['worst headache of my life', 'sudden severe headache', 'headache with confusion', 'headache with stiff neck', 'headache with vision loss', 'head injury'],
  },
  {
    id: 'fever',
    name: 'Fever',
    keywords: ['fever', 'high temperature', 'feel hot', 'running a temperature'],
    questions: ['How many degrees is your temperature, and how long have you had it?', 'Any other symptoms alongside the fever?'],
    severityDefault: 'monitor',
    advice: [
      'Rest and drink plenty of fluids.',
      'An over-the-counter fever reducer can help you feel more comfortable.',
      'Light clothing and a cool (not cold) room can help.',
      'See a doctor if fever lasts more than 3 days, is very high, or comes with a rash, stiff neck, or confusion.',
    ],
    escalateIf: ['stiff neck', 'confusion', 'rash', 'fever in an infant', 'fever over 3 days', 'seizure'],
  },
  {
    id: 'cough',
    name: 'Cough',
    keywords: ['cough', 'coughing'],
    questions: ['Is the cough dry, or are you bringing up mucus?', 'How many days has this been going on?'],
    severityDefault: 'self_care',
    advice: [
      'Warm fluids like tea with honey can soothe the throat and ease coughing.',
      'A humidifier or steam from a hot shower can help loosen mucus.',
      'Avoid smoke and other irritants while recovering.',
      'See a doctor if the cough lasts more than 2–3 weeks, or produces blood or thick colored mucus with fever.',
    ],
    escalateIf: ['coughing blood', 'chest pain', 'difficulty breathing', 'cough over 3 weeks'],
  },
  {
    id: 'indigestion',
    name: 'Indigestion / mild stomach upset',
    keywords: ['indigestion', 'upset stomach', 'stomach ache', 'bloating', 'heartburn', 'stomach pain'],
    questions: ['Is the pain mild, or is it severe and constant?', 'Have you noticed any vomiting or blood in your stool?'],
    severityDefault: 'self_care',
    advice: [
      'Eat smaller, lighter meals and avoid spicy, fatty, or acidic foods for a day or two.',
      'Stay upright for a while after eating.',
      'An antacid can help for occasional heartburn.',
      'See a doctor if pain is severe, persistent, or comes with vomiting blood or black stools.',
    ],
    escalateIf: ['severe abdominal pain', 'vomiting blood', 'black stool', 'blood in stool', 'pain in lower right abdomen'],
  },
  {
    id: 'diarrhea',
    name: 'Diarrhea',
    keywords: ['diarrhea', 'diarrhoea', 'loose stool', 'watery stool'],
    questions: ['How many days has this lasted, and how many times a day?', 'Any blood in the stool, or signs of dehydration like dizziness or very dark urine?'],
    severityDefault: 'monitor',
    advice: [
      'Drink plenty of fluids — water, oral rehydration solution, or diluted juice — to prevent dehydration.',
      'Eat bland foods (rice, bananas, toast) as you are able.',
      'Avoid dairy, caffeine, and very fatty foods until it settles.',
      'See a doctor if it lasts more than 2 days, or if there is blood, high fever, or signs of dehydration.',
    ],
    escalateIf: ['blood in stool', 'signs of dehydration', 'high fever', 'severe abdominal pain', 'lasting more than 2 days'],
  },
  {
    id: 'nausea_vomiting',
    name: 'Nausea / vomiting',
    keywords: ['nausea', 'vomiting', 'throwing up', 'feel sick to my stomach', 'nauseous'],
    questions: ['How many times have you vomited, and can you keep fluids down at all?', 'Any severe abdominal pain or blood in the vomit?'],
    severityDefault: 'monitor',
    advice: [
      'Sip small amounts of clear fluids frequently rather than large amounts at once.',
      'Rest and avoid solid food until vomiting settles, then reintroduce bland foods gradually.',
      'Ginger tea can sometimes help settle the stomach.',
      'Seek care if you cannot keep any fluids down for more than 24 hours, or notice blood in the vomit.',
    ],
    escalateIf: ['vomiting blood', 'cannot keep fluids down', 'severe abdominal pain', 'signs of dehydration'],
  },
  {
    id: 'minor_cut',
    name: 'Minor cut or scrape',
    keywords: ['cut myself', 'small cut', 'scrape', 'graze', 'minor wound'],
    questions: ['How deep is the cut, and has the bleeding stopped with pressure?', 'When did you last have a tetanus shot?'],
    severityDefault: 'self_care',
    advice: [
      'Rinse the wound with clean water and apply gentle pressure with a clean cloth until bleeding stops.',
      'Clean around the wound and apply an antiseptic and a clean bandage.',
      'Watch for signs of infection over the next few days — increasing redness, warmth, swelling, or pus.',
      'See a doctor if the cut is deep, gaping, won\'t stop bleeding, or you\'re unsure about your tetanus vaccination.',
    ],
    escalateIf: ['bleeding won\'t stop', 'deep cut', 'wound gaping open', 'signs of infection', 'animal bite'],
  },
  {
    id: 'sprain',
    name: 'Sprain or minor joint injury',
    keywords: ['sprained ankle', 'sprain', 'twisted my ankle', 'rolled my ankle', 'twisted knee'],
    questions: ['Can you put any weight on it?', 'Is there significant swelling or deformity?'],
    severityDefault: 'self_care',
    advice: [
      'Follow R.I.C.E: Rest, Ice (20 minutes at a time), Compression (elastic bandage), Elevation above heart level.',
      'An over-the-counter pain reliever can help with pain and swelling.',
      'Avoid putting weight on it until pain allows.',
      'See a doctor if you cannot bear weight at all, the joint looks deformed, or it does not improve in a few days.',
    ],
    escalateIf: ['cannot bear weight', 'visible deformity', 'severe swelling', 'numbness'],
  },
  {
    id: 'back_pain',
    name: 'Back pain',
    keywords: ['back pain', 'my back hurts', 'lower back pain', 'backache'],
    questions: ['Did this start after an injury or heavy lifting, or come on gradually?', 'Any numbness, tingling, or weakness in your legs?'],
    severityDefault: 'self_care',
    advice: [
      'Gentle movement is usually better than complete bed rest — short walks can help.',
      'An over-the-counter pain reliever and a warm compress can ease discomfort.',
      'Avoid heavy lifting or twisting motions until it improves.',
      'See a doctor if pain is severe, spreads down a leg, or comes with numbness, tingling, or weakness.',
    ],
    escalateIf: ['numbness in legs', 'loss of bladder control', 'loss of bowel control', 'weakness in legs', 'severe unrelenting pain'],
  },
  {
    id: 'skin_rash',
    name: 'Mild skin rash',
    keywords: ['rash', 'skin irritation', 'itchy skin', 'red spots', 'hives'],
    questions: ['Is it spreading, and do you have any new medications, foods, or products you have recently used?', 'Any swelling of the face, lips, or tongue, or difficulty breathing?'],
    severityDefault: 'self_care',
    advice: [
      'Avoid scratching, and keep the area clean and dry.',
      'A fragrance-free moisturizer or over-the-counter antihistamine cream can ease itching.',
      'Try to identify and avoid any new soap, food, plant, or medication that coincided with the rash.',
      'See a doctor if the rash spreads quickly, blisters, or comes with fever or swelling.',
    ],
    escalateIf: ['swelling of face', 'swelling of lips', 'difficulty breathing', 'rash spreading rapidly', 'rash with fever', 'blistering'],
  },
  {
    id: 'allergic_reaction_mild',
    name: 'Mild allergic reaction',
    keywords: ['allergic reaction', 'allergy flare', 'itchy eyes and sneezing', 'hay fever'],
    questions: ['Is it just skin/eyes/nose symptoms, or any swelling of your face or throat, or trouble breathing?'],
    severityDefault: 'self_care',
    advice: [
      'An over-the-counter antihistamine can help with mild allergy symptoms.',
      'Avoid the suspected trigger if you can identify one.',
      'Cool compresses can soothe itchy eyes or skin.',
      'Seek emergency care immediately if you develop swelling of the face/throat or difficulty breathing.',
    ],
    escalateIf: ['swelling of throat', 'swelling of face', 'difficulty breathing', 'dizziness with rash'],
  },
  {
    id: 'urinary_symptoms',
    name: 'Urinary symptoms',
    keywords: ['burning when i urinate', 'painful urination', 'frequent urination', 'urine burns'],
    questions: ['Do you have any fever, back pain, or blood in the urine?'],
    severityDefault: 'see_doctor',
    advice: [
      'Drink plenty of water to help flush the urinary tract.',
      'Avoid caffeine and alcohol while symptoms persist.',
      'These symptoms often need a urine test and sometimes antibiotics, so a doctor visit is recommended within the next day or two.',
      'Seek urgent care if you develop fever, chills, or back/flank pain — this can indicate a kidney infection.',
    ],
    escalateIf: ['fever', 'back pain', 'flank pain', 'blood in urine', 'chills'],
  },
  {
    id: 'insomnia',
    name: 'Trouble sleeping',
    keywords: ['can\'t sleep', 'insomnia', 'trouble sleeping', 'not sleeping well'],
    questions: ['How long has this been going on, and is anything on your mind that might be affecting your sleep?'],
    severityDefault: 'self_care',
    advice: [
      'Keep a consistent sleep and wake time, even on weekends.',
      'Avoid screens, caffeine, and heavy meals for a few hours before bed.',
      'A calming wind-down routine (reading, stretching, breathing exercises) can help signal it is time to sleep.',
      'If this persists for weeks or affects your daily life, it is worth discussing with a doctor.',
    ],
    escalateIf: ['thoughts of self harm', 'severe anxiety', 'chest pain at night'],
  },
  {
    id: 'stress_anxiety',
    name: 'Stress or anxiety',
    keywords: ['anxious', 'anxiety', 'stressed', 'panic attack', 'overwhelmed', 'worried all the time'],
    questions: ['How long have you been feeling this way, and is it affecting your daily activities?'],
    severityDefault: 'monitor',
    advice: [
      'Slow, deep breathing (in for 4 counts, hold for 4, out for 6) can help in the moment.',
      'Regular physical activity, sleep, and reducing caffeine can help with underlying anxiety.',
      'Talking to someone you trust, or a counselor, can make a real difference.',
      'If anxiety is frequent, intense, or affecting daily life, please consider speaking with a doctor or mental health professional.',
    ],
    escalateIf: ['suicidal', 'want to die', 'panic attack with chest pain', 'can\'t breathe'],
  },
  {
    id: 'dehydration',
    name: 'Dehydration',
    keywords: ['dehydrated', 'dizzy and thirsty', 'very thirsty', 'dark urine'],
    questions: ['Have you been unable to keep fluids down, or had heavy sweating, vomiting, or diarrhea recently?'],
    severityDefault: 'monitor',
    advice: [
      'Sip water or an oral rehydration solution steadily rather than large amounts at once.',
      'Rest in a cool environment and avoid strenuous activity.',
      'Watch your urine color — pale yellow is a good sign of adequate hydration.',
      'Seek care urgently if you feel confused, cannot keep fluids down, or have not urinated in many hours.',
    ],
    escalateIf: ['confusion', 'cannot keep fluids down', 'no urination', 'fainting'],
  },
  {
    id: 'constipation',
    name: 'Constipation',
    keywords: ['constipated', 'constipation', 'haven\'t had a bowel movement', 'hard stool'],
    questions: ['How many days has it been, and is there any abdominal pain or bloating?'],
    severityDefault: 'self_care',
    advice: [
      'Increase fiber intake (fruits, vegetables, whole grains) and drink more water.',
      'Regular light physical activity can help stimulate digestion.',
      'An over-the-counter stool softener can help if dietary changes aren\'t enough.',
      'See a doctor if it lasts more than a week, or comes with severe pain, vomiting, or blood.',
    ],
    escalateIf: ['severe abdominal pain', 'vomiting', 'blood in stool', 'unable to pass gas'],
  },
  {
    id: 'minor_burn',
    name: 'Minor burn',
    keywords: ['burned myself', 'minor burn', 'small burn'],
    questions: ['How large is the burn, and does the skin look blistered or charred?'],
    severityDefault: 'self_care',
    advice: [
      'Cool the burn under cool (not ice-cold) running water for about 10–20 minutes.',
      'Cover loosely with a clean, non-stick dressing. Do not apply butter, oil, or toothpaste.',
      'An over-the-counter pain reliever can help with discomfort.',
      'See a doctor if the burn is larger than your palm, deep, blistering extensively, or on the face/hands/genitals.',
    ],
    escalateIf: ['large burn', 'charred skin', 'burn on face', 'burn on hands', 'electrical burn', 'chemical burn'],
  },
  {
    id: 'eye_irritation',
    name: 'Eye irritation',
    keywords: ['red eye', 'eye irritation', 'itchy eyes', 'eye discharge', 'pink eye'],
    questions: ['Is there discharge, and is your vision affected at all?'],
    severityDefault: 'self_care',
    advice: [
      'Avoid rubbing the eye and wash your hands frequently to prevent spreading any infection.',
      'A clean, cool damp cloth over closed eyes can soothe irritation.',
      'Over-the-counter lubricating eye drops can help with dryness or mild irritation.',
      'See a doctor if there is significant pain, vision changes, or thick discharge — this may need prescription treatment.',
    ],
    escalateIf: ['vision loss', 'severe eye pain', 'chemical in eye', 'eye injury'],
  },
  {
    id: 'ear_pain',
    name: 'Ear pain',
    keywords: ['ear pain', 'earache', 'ear hurts', 'ear infection'],
    questions: ['Is there any discharge from the ear, or fever?'],
    severityDefault: 'self_care',
    advice: [
      'A warm compress against the ear can ease discomfort.',
      'An over-the-counter pain reliever can help.',
      'Avoid inserting anything into the ear canal.',
      'See a doctor if pain is severe, there is discharge or hearing loss, or symptoms don\'t improve in 2-3 days — a true infection often needs prescription treatment.',
    ],
    escalateIf: ['discharge from ear', 'hearing loss', 'high fever', 'severe pain'],
  },
  {
    id: 'toothache',
    name: 'Toothache',
    keywords: ['toothache', 'tooth pain', 'my tooth hurts'],
    questions: ['Is there any visible swelling of your face or gum, or fever?'],
    severityDefault: 'see_doctor',
    advice: [
      'Rinse with warm salt water and gently floss to remove any trapped food.',
      'An over-the-counter pain reliever can help in the meantime.',
      'Avoid very hot, cold, or sugary foods on that side.',
      'Toothaches usually need a dentist to properly diagnose and treat — please try to see one soon.',
    ],
    escalateIf: ['facial swelling', 'fever with tooth pain', 'difficulty swallowing', 'difficulty opening mouth'],
  },
  {
    id: 'menstrual_cramps',
    name: 'Menstrual cramps',
    keywords: ['period pain', 'menstrual cramps', 'period cramps'],
    questions: ['Is this similar to your usual periods, or notably more painful this time?'],
    severityDefault: 'self_care',
    advice: [
      'A heating pad on the lower abdomen can ease cramping.',
      'An over-the-counter pain reliever taken early can help.',
      'Gentle movement and staying hydrated can also help some people.',
      'See a doctor if pain is severe, worsening over time, or very different from your usual pattern.',
    ],
    escalateIf: ['severe pain not relieved by medication', 'heavy bleeding', 'fainting', 'fever'],
  },
];

/** Normalize text for matching: lowercase, strip punctuation to spaces */
function normalize(text) {
  return (text || '').toLowerCase().replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Count how many of a condition's keyword phrases appear in the text */
function scoreCondition(normalizedText, condition) {
  let score = 0;
  for (const kw of condition.keywords) {
    if (normalizedText.includes(kw)) score += kw.split(' ').length; // longer/more specific phrases score higher
  }
  return score;
}

/**
 * Find the best-matching condition(s) for a block of text.
 * Returns a sorted array of { condition, score }, highest first, score > 0 only.
 */
function matchConditions(text) {
  const normalized = normalize(text);
  return CONDITIONS.map((condition) => ({ condition, score: scoreCondition(normalized, condition) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Check whether any of a condition's own escalation phrases appear in the text */
function hasEscalationTrigger(text, condition) {
  const normalized = normalize(text);
  return (condition.escalateIf || []).some((phrase) => normalized.includes(normalize(phrase)));
}

module.exports = { CONDITIONS, normalize, matchConditions, hasEscalationTrigger };
