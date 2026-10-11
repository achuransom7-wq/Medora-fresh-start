/**
 * Medora Symptom Synonym Dictionary
 * ---------------------------------
 * The disease dataset (data/diseases.js) uses clinical/dataset symptom tokens
 * like "high_fever", "joint_pain", "burning_micturition". Real patients don't
 * type that — they say "my temperature is really high" or "it burns when I
 * pee". This dictionary bridges the gap: each canonical symptom maps to a
 * list of everyday phrases that should count as a match.
 *
 * This is hand-curated and can always be extended — add more phrases to any
 * entry, or add new canonical symptoms, and matching quality improves
 * immediately with no other code changes needed.
 */

const SYNONYMS = {
  itching: ['itching', 'itchy', 'itchiness'],
  skin_rash: ['skin rash', 'rash on my skin', 'red rash', 'rash'],
  nodal_skin_eruptions: ['skin eruptions', 'bumps on skin', 'skin nodules'],
  continuous_sneezing: ['sneezing a lot', 'constant sneezing', 'sneezing'],
  shivering: ['shivering', 'shaking with cold'],
  chills: ['chills', 'chilly', 'cold shivers'],
  joint_pain: ['joint pain', 'my joints hurt', 'painful joints', 'aching joints'],
  stomach_pain: ['stomach pain', 'my stomach hurts', 'stomach ache', 'tummy pain'],
  acidity: ['acidity', 'acid reflux', 'heartburn'],
  ulcers_on_tongue: ['ulcers on my tongue', 'mouth ulcers', 'tongue sores'],
  muscle_wasting: ['muscle wasting', 'losing muscle', 'muscles shrinking'],
  vomiting: ['vomiting', 'throwing up', 'threw up', 'puking'],
  burning_micturition: ['burns when i pee', 'burning when i urinate', 'painful urination', 'urine burns'],
  spotting_urination: ['spotting urine', 'dribbling urine'],
  fatigue: ['fatigue', 'exhausted', 'no energy', 'tired all the time', 'very tired', 'am tired', 'feel tired', 'i am tired'],
  weight_gain: ['gained weight', 'weight gain', 'putting on weight'],
  anxiety: ['anxious', 'anxiety', 'nervous all the time'],
  cold_hands_and_feets: ['cold hands', 'cold feet', 'cold hands and feet'],
  mood_swings: ['mood swings', 'moody', 'emotional ups and downs'],
  weight_loss: ['losing weight', 'weight loss', 'lost weight without trying'],
  restlessness: ['restless', 'can\u2019t sit still', 'restlessness'],
  lethargy: ['lethargic', 'sluggish', 'low energy'],
  patches_in_throat: ['white patches in throat', 'patches on tonsils', 'throat patches'],
  irregular_sugar_level: ['blood sugar swings', 'irregular sugar', 'sugar levels all over the place'],
  cough: ['cough', 'coughing'],
  high_fever: ['high fever', 'very high temperature', 'burning up', 'fever', 'have a fever', 'running a fever'],
  sunken_eyes: ['sunken eyes', 'eyes look sunken'],
  breathlessness: ['breathless', 'short of breath', 'hard to breathe', 'difficulty breathing'],
  sweating: ['sweating a lot', 'excessive sweating', 'sweaty'],
  dehydration: ['dehydrated', 'dehydration', 'very thirsty and dizzy'],
  indigestion: ['indigestion', 'upset stomach', 'bloating after eating'],
  headache: ['headache', 'head pain', 'my head hurts', 'migraine'],
  yellowish_skin: ['yellow skin', 'skin looks yellow', 'jaundiced skin'],
  dark_urine: ['dark urine', 'urine is dark', 'brown urine'],
  nausea: ['nausea', 'nauseous', 'feel sick to my stomach', 'queasy'],
  loss_of_appetite: ['no appetite', 'lost my appetite', 'not hungry', 'don\u2019t want to eat', 'loss of appetite'],
  pain_behind_the_eyes: ['pain behind my eyes', 'pain behind the eyes', 'eye socket pain'],
  back_pain: ['back pain', 'my back hurts', 'backache'],
  constipation: ['constipated', 'constipation', 'can\u2019t poop', 'hard stool'],
  abdominal_pain: ['abdominal pain', 'belly pain', 'pain in my stomach area', 'stomach cramps'],
  diarrhoea: ['diarrhea', 'diarrhoea', 'loose stool', 'watery stool'],
  mild_fever: ['mild fever', 'low grade fever', 'slight fever'],
  yellow_urine: ['yellow urine', 'urine is yellow'],
  yellowing_of_eyes: ['yellow eyes', 'eyes turning yellow', 'whites of eyes yellow'],
  acute_liver_failure: ['liver failure', 'liver shutting down'],
  fluid_overload: ['fluid retention', 'swelling from fluid', 'fluid overload'],
  swelling_of_stomach: ['swollen stomach', 'stomach swelling', 'bloated belly'],
  swelled_lymph_nodes: ['swollen lymph nodes', 'swollen glands', 'lumps in neck'],
  malaise: ['malaise', 'general unwell feeling', 'just feel off'],
  blurred_and_distorted_vision: ['blurred vision', 'blurry vision', 'distorted vision'],
  phlegm: ['phlegm', 'mucus when i cough', 'coughing up phlegm'],
  throat_irritation: ['throat irritation', 'scratchy throat', 'irritated throat'],
  redness_of_eyes: ['red eyes', 'eyes are red', 'bloodshot eyes'],
  sinus_pressure: ['sinus pressure', 'sinus pain', 'pressure in my face'],
  runny_nose: ['runny nose', 'nose is running'],
  congestion: ['congestion', 'stuffy nose', 'blocked nose', 'nasal congestion'],
  chest_pain: ['chest pain', 'pain in my chest', 'chest hurts', 'chest tightness'],
  weakness_in_limbs: ['weak arms', 'weak legs', 'weakness in my limbs'],
  fast_heart_rate: ['heart racing', 'fast heartbeat', 'rapid heart rate', 'palpitations'],
  pain_during_bowel_movements: ['pain when i poop', 'painful bowel movement'],
  pain_in_anal_region: ['pain around my anus', 'rectal pain', 'anal pain'],
  bloody_stool: ['blood in my stool', 'bloody stool', 'blood when i poop'],
  irritation_in_anus: ['itching around my anus', 'anal irritation'],
  neck_pain: ['neck pain', 'my neck hurts', 'stiff neck'],
  dizziness: ['dizzy', 'dizziness', 'lightheaded', 'feel faint'],
  cramps: ['cramps', 'muscle cramps', 'cramping'],
  bruising: ['bruising easily', 'bruises easily', 'unexplained bruises'],
  obesity: ['overweight', 'obese', 'obesity'],
  swollen_legs: ['swollen legs', 'legs are swollen'],
  swollen_blood_vessels: ['swollen veins', 'bulging veins'],
  puffy_face_and_eyes: ['puffy face', 'puffy eyes', 'swollen face'],
  enlarged_thyroid: ['swelling in my neck', 'enlarged thyroid', 'goiter'],
  brittle_nails: ['brittle nails', 'nails breaking easily'],
  swollen_extremeties: ['swollen hands', 'swollen feet', 'swollen extremities'],
  excessive_hunger: ['always hungry', 'excessive hunger', 'constantly hungry'],
  extra_marital_contacts: ['unprotected sex with multiple partners', 'multiple sexual partners'],
  drying_and_tingling_lips: ['dry lips', 'tingling lips', 'lips tingling'],
  slurred_speech: ['slurred speech', 'speech is slurred', 'trouble speaking clearly'],
  knee_pain: ['knee pain', 'my knee hurts'],
  hip_joint_pain: ['hip pain', 'hip joint pain'],
  muscle_weakness: ['muscle weakness', 'muscles feel weak', 'feel weak', 'i am weak', 'feeling weak', 'no strength'],
  stiff_neck: ['stiff neck', 'neck is stiff', 'can\u2019t move my neck'],
  swelling_joints: ['swollen joints', 'joints are swollen'],
  movement_stiffness: ['stiff movements', 'stiffness when i move'],
  spinning_movements: ['room is spinning', 'spinning sensation', 'vertigo'],
  loss_of_balance: ['losing my balance', 'loss of balance', 'off balance', 'lost my balance', 'lost balance'],
  unsteadiness: ['unsteady on my feet', 'unsteadiness', 'feel unsteady', 'feeling unsteady'],
  weakness_of_one_body_side: ['weakness on one side', 'one side of my body is weak', 'face drooping on one side'],
  loss_of_smell: ['lost my sense of smell', 'can\u2019t smell', 'loss of smell'],
  bladder_discomfort: ['bladder discomfort', 'bladder pain'],
  foul_smell_of_urine: ['smelly urine', 'foul smelling urine', 'urine smells bad'],
  continuous_feel_of_urine: ['always feel like i need to pee', 'constant urge to urinate'],
  passage_of_gases: ['excessive gas', 'passing a lot of gas', 'flatulence'],
  internal_itching: ['internal itching', 'itching inside'],
  depression: ['depressed', 'feeling down all the time', 'depression'],
  irritability: ['irritable', 'easily irritated', 'irritability'],
  muscle_pain: ['muscle pain', 'body aches', 'muscles ache', 'sore muscles', 'body pain', 'body ache', 'aching all over'],
  altered_sensorium: ['confused', 'confusion', 'not thinking clearly'],
  red_spots_over_body: ['red spots on my body', 'red spots all over'],
  belly_pain: ['belly pain', 'pain in my belly'],
  abnormal_menstruation: ['irregular periods', 'abnormal periods', 'period problems'],
  dischromic_patches: ['discolored patches on skin', 'skin discoloration patches'],
  watering_from_eyes: ['watery eyes', 'eyes watering'],
  increased_appetite: ['eating more than usual', 'increased appetite'],
  polyuria: ['urinating a lot', 'peeing frequently', 'frequent urination'],
  mucoid_sputum: ['thick mucus when coughing', 'mucoid sputum'],
  rusty_sputum: ['rust colored mucus', 'rusty sputum when coughing'],
  lack_of_concentration: ['can\u2019t concentrate', 'trouble focusing', 'poor concentration'],
  visual_disturbances: ['visual disturbances', 'seeing spots', 'vision problems'],
  coma: ['unconscious', 'unresponsive', 'in a coma'],
  stomach_bleeding: ['bleeding from my stomach', 'stomach bleeding', 'vomiting blood'],
  distention_of_abdomen: ['bloated abdomen', 'abdomen is distended', 'swollen belly'],
  history_of_alcohol_consumption: ['i drink alcohol regularly', 'heavy drinker', 'history of drinking'],
  blood_in_sputum: ['blood when i cough', 'coughing up blood', 'blood in my mucus'],
  prominent_veins_on_calf: ['visible veins on my leg', 'bulging veins on calf', 'varicose veins'],
  palpitations: ['heart palpitations', 'heart pounding', 'palpitations'],
  painful_walking: ['painful to walk', 'hurts to walk', 'pain when walking'],
  pus_filled_pimples: ['pimples with pus', 'pus filled pimples'],
  blackheads: ['blackheads'],
  skin_peeling: ['skin peeling', 'skin is peeling'],
  silver_like_dusting: ['silvery scales on skin', 'silver like patches on skin'],
  small_dents_in_nails: ['pits in my nails', 'small dents in nails'],
  inflammatory_nails: ['inflamed nails', 'nail inflammation'],
  blister: ['blisters', 'blister on my skin'],
  red_sore_around_nose: ['sore around my nose', 'red sore near nose'],
  yellow_crust_ooze: ['yellow crust oozing', 'oozing yellow crust on skin'],
};

const STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'my', 'is', 'are', 'am', 'have', 'has', 'had', 'feel', 'feels', 'feeling',
  'been', 'being', 'it', 'its', "it's", 'that', 'this', 'of', 'in', 'on', 'with', 'to', 'for', 'and',
  'or', 'me', 'im', "i'm", 've', 'like', 'when',
]);

const IRREGULAR_STEMS = {
  lost: 'los', losing: 'los', loses: 'los', lose: 'los',
  felt: 'feel',
  hurts: 'hurt', hurting: 'hurt',
  aches: 'ach', aching: 'ach', ached: 'ach',
  bled: 'bleed', bleeding: 'bleed',
};

function stem(word) {
  const w = word.toLowerCase();
  if (IRREGULAR_STEMS[w]) return IRREGULAR_STEMS[w];
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/**
 * Flattened, pre-stemmed phrase entries used by localDifferential.js for fast
 * bag-of-words matching: { contentStems: string[], canonical: string }.
 * Stopwords are dropped and each remaining word is stemmed once here, at
 * module load, rather than recomputed per request.
 */
const PHRASE_ENTRIES = Object.entries(SYNONYMS).flatMap(([canonical, phrases]) =>
  phrases.map((phrase) => ({
    canonical,
    contentStems: phrase
      .toLowerCase()
      .replace(/[^\w\s'’]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !STOPWORDS.has(w))
      .map(stem),
  }))
);

module.exports = { SYNONYMS, PHRASE_ENTRIES, stem };
