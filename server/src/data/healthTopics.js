/**
 * Medora Health Topics (shared)
 * -----------------------------
 * Curated, reviewed short answers for common general-wellness questions that
 * aren't tied to one specific disease in data/diseases.js (e.g. "how much
 * water should I drink," "what's a normal resting heart rate"). Shared by
 * services/localResearch.js (the "Learn more" panel) and
 * services/localKnowledgeQA.js (casual conversational questions), so both
 * features draw from one reviewed source instead of duplicating content.
 *
 * Same rules as the rest of the local agent: no specific drug names or
 * dosages, general public-health-level guidance only, and always framed to
 * defer to a doctor for anything personal/diagnostic.
 */

const GENERAL_TOPICS = [
  {
    topic: 'Managing a fever at home',
    keywords: ['fever', 'temperature', 'high temperature'],
    content:
      'For a fever in an otherwise healthy adult: rest, stay hydrated, dress lightly, and an over-the-counter fever reducer can help with comfort. See a doctor if it exceeds 39.4°C (103°F), lasts more than 3 days, or comes with a stiff neck, confusion, rash, or difficulty breathing. For infants under 3 months, any fever needs prompt medical attention.',
  },
  {
    topic: 'When a headache needs urgent care',
    keywords: ['headache', 'migraine'],
    content:
      'Most headaches are benign and respond to rest, hydration, and an over-the-counter pain reliever. Seek immediate care for: the "worst headache of your life" with sudden onset, a headache with fever and stiff neck, headache after a head injury, or one with confusion, vision loss, or one-sided weakness.',
  },
  {
    topic: 'Staying hydrated',
    keywords: ['dehydration', 'hydration', 'fluids', 'water intake', 'drink water', 'how much water'],
    content:
      'A common rule of thumb is about 2-3 liters (8-12 cups) of fluid a day for adults, more in heat or with exercise, but needs vary by person. Pale yellow urine is a good sign of adequate hydration. During vomiting or diarrhea, small frequent sips work better than large amounts at once.',
  },
  {
    topic: 'Common cold vs. flu',
    keywords: ['cold', 'flu', 'influenza'],
    content:
      'Colds come on gradually with mild symptoms (runny nose, sneezing, mild cough) and usually resolve in about a week. Flu tends to come on suddenly with higher fever, body aches, and fatigue, taking 1-2 weeks to fully resolve. Both are managed with rest and fluids; see a doctor if you\'re high-risk (elderly, pregnant, chronic illness) or symptoms are severe.',
  },
  {
    topic: 'Caring for a minor wound',
    keywords: ['cut', 'wound', 'scrape'],
    content:
      'Clean minor wounds with running water, apply gentle pressure to stop bleeding, and cover with a clean dressing. Watch for signs of infection over the next few days: increasing redness, warmth, swelling, or pus. Tetanus boosters are generally recommended every 10 years, sooner for deep or dirty wounds.',
  },
  {
    topic: 'Blood pressure basics',
    keywords: ['blood pressure', 'hypertension', 'systolic', 'diastolic'],
    content:
      'A normal blood pressure reading is generally under 120/80 mmHg. Readings consistently at or above 130/80 are considered elevated/high and worth discussing with a doctor. Lifestyle factors that help: reducing salt intake, regular exercise, maintaining a healthy weight, limiting alcohol, and managing stress. High blood pressure often has no symptoms, which is why regular checks matter.',
  },
  {
    topic: 'Normal heart rate',
    keywords: ['heart rate', 'pulse', 'palpitations', 'resting heart rate'],
    content:
      'A normal resting heart rate for adults is typically 60-100 beats per minute; well-conditioned athletes may run lower. A rate that\'s persistently very high or low, or accompanied by dizziness, chest pain, or fainting, is worth having checked by a doctor.',
  },
  {
    topic: 'How much sleep you need',
    keywords: ['sleep', 'insomnia', "can't sleep", 'how much sleep'],
    content:
      'Most adults need about 7-9 hours of sleep a night. Consistent sleep/wake times, limiting screens and caffeine before bed, and a calming wind-down routine all help. Ongoing trouble sleeping that affects daily life is worth discussing with a doctor rather than managing indefinitely alone.',
  },
  {
    topic: 'Understanding BMI',
    keywords: ['bmi', 'body mass index', 'healthy weight'],
    content:
      'BMI (weight in kg divided by height in meters squared) is a rough screening tool, not a diagnosis: under 18.5 is considered underweight, 18.5-24.9 typical, 25-29.9 overweight, and 30+ classified as obese. It doesn\'t account for muscle mass, so it\'s one data point among several a doctor would consider.',
  },
  {
    topic: 'Vaccination basics',
    keywords: ['vaccine', 'vaccination', 'immunization'],
    content:
      'Vaccines work by training your immune system to recognize a disease-causing germ without causing the disease itself, so your body can respond quickly if you\'re later exposed. Recommended vaccine schedules vary by country and age. A local clinic or your national health ministry\'s guidance is the best source for what\'s currently recommended for you or your child.',
  },
  {
    topic: 'Managing everyday stress and anxiety',
    keywords: ['anxiety', 'stress', 'panic', 'overwhelmed'],
    content:
      'Regular sleep, exercise, and reduced caffeine intake meaningfully ease everyday anxiety. Slow breathing (in for 4 counts, hold 4, out for 6) can help in the moment. Persistent anxiety that interferes with daily life, or panic attacks with physical symptoms, are best discussed with a doctor or mental health professional.',
  },
  {
    topic: 'Recognizing depression',
    keywords: ['depression', 'depressed', 'feeling down', 'no motivation'],
    content:
      'Ongoing low mood, loss of interest in things you used to enjoy, changes in sleep or appetite, and low energy lasting more than two weeks can be signs worth discussing with a doctor or mental health professional. This is common and treatable, and reaching out for support is a strong first step, not a weakness.',
  },
  {
    topic: 'Sprains and the R.I.C.E method',
    keywords: ['sprain', 'twisted ankle', 'twisted joint'],
    content:
      'For mild sprains: Rest the joint, Ice it for 15-20 minutes at a time, Compress with an elastic bandage, and Elevate above heart level. See a doctor if you cannot bear any weight, the joint looks deformed, or there\'s no improvement after a few days.',
  },
  {
    topic: 'Diarrhea and when to worry',
    keywords: ['diarrhea', 'diarrhoea'],
    content:
      'Most diarrhea resolves within a couple of days with hydration and a bland diet. See a doctor if it lasts more than 2 days, comes with blood, high fever, or signs of dehydration, or affects a young child, elderly person, or someone with a chronic condition.',
  },
  {
    topic: 'Basic nutrition guidance',
    keywords: ['nutrition', 'healthy diet', 'balanced diet', 'eating healthy'],
    content:
      'A generally balanced diet includes plenty of vegetables and fruit, whole grains, lean protein sources, and healthy fats, while limiting added sugar, excess salt, and highly processed foods. Specific dietary needs vary a lot by health condition, age, and goals, so a doctor or dietitian can tailor advice to you.',
  },
  {
    topic: 'Exercise recommendations',
    keywords: ['exercise', 'physical activity', 'how much exercise'],
    content:
      'General guidance for adults is about 150 minutes of moderate activity (like brisk walking) per week, plus muscle-strengthening activity twice a week. Any amount of movement is better than none, and it\'s worth easing in gradually, especially with an existing health condition. Check with a doctor first if you have one.',
  },
  {
    topic: 'Pregnancy: general wellness',
    keywords: ['pregnant', 'pregnancy', 'prenatal'],
    content:
      'Regular prenatal checkups, a balanced diet, staying active as advised by your provider, and avoiding alcohol/smoking are core general guidance during pregnancy. Any new or unusual symptoms during pregnancy, such as bleeding, severe pain, reduced fetal movement, severe headache, or vision changes, should be discussed with your doctor or midwife promptly rather than waited out.',
  },
  {
    topic: 'Menstrual cycle basics',
    keywords: ['period', 'menstrual cycle', 'menstruation'],
    content:
      'A typical cycle runs about 21-35 days, with bleeding lasting 2-7 days, but "typical" varies quite a bit between people. Sudden major changes (much heavier bleeding, missed periods when not expected, severe new pain) are worth discussing with a doctor.',
  },
  {
    topic: 'Skin care for acne',
    keywords: ['acne', 'pimples', 'breakouts'],
    content:
      'Gentle cleansing twice a day, avoiding harsh scrubbing, and not picking at spots all help. Over-the-counter treatments containing common acne-fighting ingredients can help mild cases. Persistent or severe acne, or acne causing scarring, is worth seeing a dermatologist about, as there are effective prescription options they can discuss with you.',
  },
  {
    topic: 'Understanding cholesterol',
    keywords: ['cholesterol', 'ldl', 'hdl'],
    content:
      'Cholesterol is a fat-like substance your body needs, but high LDL ("bad") cholesterol raises heart disease risk, while HDL ("good") cholesterol is protective. Diet, exercise, and not smoking all help manage it. It\'s typically checked via a blood test, and a doctor can interpret your specific numbers and advise next steps.',
  },
  {
    topic: 'Diabetes: general overview',
    keywords: ['diabetes', 'blood sugar', 'blood glucose'],
    content:
      'Diabetes is a condition where the body has trouble regulating blood sugar, either because it doesn\'t produce enough insulin (Type 1) or doesn\'t use it effectively (Type 2). Warning signs can include excessive thirst, frequent urination, unexplained weight loss, and fatigue. It\'s diagnosed and managed with a doctor\'s guidance, often involving blood sugar monitoring, diet, activity, and sometimes medication.',
  },
  {
    topic: 'Basic first aid for burns',
    keywords: ['burn', 'burned', 'scald'],
    content:
      'Cool a minor burn under cool (not ice-cold) running water for 10-20 minutes, then cover loosely with a clean, non-stick dressing. Avoid butter, oil, or toothpaste. See a doctor for burns larger than your palm, deep burns, extensive blistering, or burns on the face, hands, or genitals.',
  },
  {
    topic: 'Understanding allergies',
    keywords: ['allergy', 'allergies', 'allergic'],
    content:
      'Allergies happen when your immune system overreacts to a normally harmless substance (pollen, certain foods, medications, insect stings). Mild reactions (sneezing, itching, hives) can often be managed with an over-the-counter antihistamine. A reaction with swelling of the face/throat or difficulty breathing is a medical emergency, so seek immediate care.',
  },
  {
    topic: 'Recognizing dehydration in children',
    keywords: ['child dehydration', 'baby dehydrated', 'kid not drinking'],
    content:
      'Signs of dehydration in a child include: fewer wet diapers than usual, dry mouth, no tears when crying, unusual sleepiness or irritability, and sunken eyes. Offer small, frequent sips of fluid, and seek medical care promptly if you notice these signs, especially in infants.',
  },
  {
    topic: 'Hygiene and preventing infection',
    keywords: ['hand washing', 'hygiene', 'prevent infection', 'germs'],
    content:
      'Regular handwashing with soap for at least 20 seconds, especially before eating and after using the bathroom, is one of the most effective ways to prevent the spread of many infections. Covering coughs/sneezes and staying home when contagious also helps protect others.',
  },
  {
    topic: 'When a sore throat needs a doctor',
    keywords: ['sore throat', 'throat pain'],
    content:
      'Most sore throats improve within a week with rest, warm fluids, and salt-water gargles. See a doctor if it\'s severe, lasts more than a week, comes with a high fever, white patches on the tonsils, or makes swallowing/breathing difficult.',
  },
  {
    topic: 'Managing back pain',
    keywords: ['back pain', 'backache'],
    content:
      'Gentle movement is usually better than complete bed rest for ordinary back pain. Short walks can help, along with an over-the-counter pain reliever and a warm compress. See a doctor if pain is severe, spreads down a leg, or comes with numbness, tingling, or leg weakness.',
  },
  {
    topic: 'Elderly care: fall prevention',
    keywords: ['elderly fall', 'fall prevention', 'falling down'],
    content:
      'Common fall-prevention steps for older adults: removing loose rugs and clutter, improving lighting, installing grab bars in bathrooms, regular vision checks, and reviewing medications with a doctor (some can affect balance). Regular gentle exercise also helps maintain strength and balance.',
  },
  {
    topic: 'Understanding antibiotics',
    keywords: ['antibiotic', 'antibiotics'],
    content:
      'Antibiotics treat bacterial infections and don\'t work on viruses (like most colds and flu). Taking them only when prescribed, and completing the full course as directed by a doctor, helps avoid antibiotic resistance. Never take antibiotics prescribed for someone else or a previous illness.',
  },
];

module.exports = { GENERAL_TOPICS };
