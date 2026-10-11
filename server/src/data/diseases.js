/**
 * Medora Local Disease Dataset
 * ----------------------------
 * Source: the widely-used open "Disease Prediction Using Machine Learning"
 * dataset (41 diseases x 132 symptoms, originally shared on Kaggle by
 * kaushil268, mirrored on GitHub). This gives the local agent real,
 * structured disease-symptom associations, official short descriptions, and
 * standard precaution lists — instead of hand-typed guesses.
 *
 * A few edits were made on top of the raw dataset for safety/consistency
 * with Medora's rules:
 *  - Added a `severityTier` per disease (self_care / monitor / see_doctor /
 *    urgent) reflecting what Medora should recommend for an UNDIAGNOSED
 *    person describing these symptoms — conservative by design: most of
 *    these 41 conditions need a clinician/tests to actually confirm, so they
 *    default to "see_doctor" even though the underlying condition itself
 *    might sometimes be manageable at home once properly diagnosed.
 *  - Rewrote a couple of precaution lines that named a specific drug
 *    (e.g. "chew aspirin", "acetaminophen") to match Medora's rule of never
 *    naming specific medications — general categories only.
 *
 * IMPORTANT: this is real, structured medical education data — not fabricated
 * — but it is still only 41 conditions. It is not a substitute for a
 * clinician, and the agent is built to say so (see localDifferential.js).
 */

const DISEASES = [
  {
    "name": "(vertigo) Paroymsal Positional Vertigo",
    "symptoms": [
      "headache",
      "loss_of_balance",
      "nausea",
      "spinning_movements",
      "unsteadiness",
      "vomiting"
    ],
    "symptomsHuman": [
      "headache",
      "loss of balance",
      "nausea",
      "spinning movements",
      "unsteadiness",
      "vomiting"
    ],
    "description": "Benign paroxysmal positional vertigo (BPPV) is one of the most common causes of vertigo \u2014 the sudden sensation that you're spinning or that the inside of your head is spinning. Benign paroxysmal positional vertigo causes brief episodes of mild to intense dizziness.",
    "precautions": [
      "lie down",
      "avoid sudden change in body",
      "avoid abrupt head movment",
      "relax"
    ],
    "severityTier": "monitor"
  },
  {
    "name": "AIDS",
    "symptoms": [
      "extra_marital_contacts",
      "high_fever",
      "muscle_wasting",
      "patches_in_throat"
    ],
    "symptomsHuman": [
      "extra marital contacts",
      "high fever",
      "muscle wasting",
      "patches in throat"
    ],
    "description": "Acquired immunodeficiency syndrome (AIDS) is a chronic, potentially life-threatening condition caused by the human immunodeficiency virus (HIV). By damaging your immune system, HIV interferes with your body's ability to fight infection and disease.",
    "precautions": [
      "avoid open cuts",
      "wear ppe if possible",
      "consult doctor",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Acne",
    "symptoms": [
      "blackheads",
      "pus_filled_pimples",
      "scurring",
      "skin_rash"
    ],
    "symptomsHuman": [
      "blackheads",
      "pus filled pimples",
      "scurring",
      "skin rash"
    ],
    "description": "Acne vulgaris is the formation of comedones, papules, pustules, nodules, and/or cysts as a result of obstruction and inflammation of pilosebaceous units (hair follicles and their accompanying sebaceous gland). Acne develops on the face and upper trunk. It most often affects adolescents.",
    "precautions": [
      "bath twice",
      "avoid fatty spicy food",
      "drink plenty of water",
      "avoid too many products"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Alcoholic hepatitis",
    "symptoms": [
      "abdominal_pain",
      "distention_of_abdomen",
      "fluid_overload",
      "history_of_alcohol_consumption",
      "swelling_of_stomach",
      "vomiting",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "distention of abdomen",
      "fluid overload",
      "history of alcohol consumption",
      "swelling of stomach",
      "vomiting",
      "yellowish skin"
    ],
    "description": "Alcoholic hepatitis is a diseased, inflammatory condition of the liver caused by heavy alcohol consumption over an extended period of time. It's also aggravated by binge drinking and ongoing alcohol use. If you develop this condition, you must stop drinking alcohol",
    "precautions": [
      "stop alcohol consumption",
      "consult doctor",
      "any medication prescribed by your doctor",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Allergy",
    "symptoms": [
      "chills",
      "continuous_sneezing",
      "shivering",
      "watering_from_eyes"
    ],
    "symptomsHuman": [
      "chills",
      "continuous sneezing",
      "shivering",
      "watering from eyes"
    ],
    "description": "An allergy is an immune system response to a foreign substance that's not typically harmful to your body.They can include certain foods, pollen, or pet dander. Your immune system's job is to keep you healthy by fighting harmful pathogens.",
    "precautions": [
      "apply calamine",
      "cover area with bandage",
      "use ice to compress itching"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Arthritis",
    "symptoms": [
      "movement_stiffness",
      "muscle_weakness",
      "painful_walking",
      "stiff_neck",
      "swelling_joints"
    ],
    "symptomsHuman": [
      "movement stiffness",
      "muscle weakness",
      "painful walking",
      "stiff neck",
      "swelling joints"
    ],
    "description": "Arthritis is the swelling and tenderness of one or more of your joints. The main symptoms of arthritis are joint pain and stiffness, which typically worsen with age. The most common types of arthritis are osteoarthritis and rheumatoid arthritis.",
    "precautions": [
      "exercise",
      "use hot and cold therapy",
      "try acupuncture",
      "massage"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Bronchial Asthma",
    "symptoms": [
      "breathlessness",
      "cough",
      "family_history",
      "fatigue",
      "high_fever",
      "mucoid_sputum"
    ],
    "symptomsHuman": [
      "breathlessness",
      "cough",
      "family history",
      "fatigue",
      "high fever",
      "mucoid sputum"
    ],
    "description": "Bronchial asthma is a medical condition which causes the airway path of the lungs to swell and narrow. Due to this swelling, the air path produces excess mucus making it hard to breathe, which results in coughing, short breath, and wheezing. The disease is chronic and interferes with daily working.",
    "precautions": [
      "switch to loose cloothing",
      "take deep breaths",
      "get away from trigger",
      "seek help"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Cervical spondylosis",
    "symptoms": [
      "back_pain",
      "dizziness",
      "loss_of_balance",
      "neck_pain",
      "weakness_in_limbs"
    ],
    "symptomsHuman": [
      "back pain",
      "dizziness",
      "loss of balance",
      "neck pain",
      "weakness in limbs"
    ],
    "description": "Cervical spondylosis is a general term for age-related wear and tear affecting the spinal disks in your neck. As the disks dehydrate and shrink, signs of osteoarthritis develop, including bony projections along the edges of bones (bone spurs).",
    "precautions": [
      "use heating pad or cold pack",
      "exercise",
      "take otc pain reliver",
      "consult doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Chicken pox",
    "symptoms": [
      "fatigue",
      "headache",
      "high_fever",
      "itching",
      "lethargy",
      "loss_of_appetite",
      "malaise",
      "mild_fever",
      "red_spots_over_body",
      "skin_rash",
      "swelled_lymph_nodes"
    ],
    "symptomsHuman": [
      "fatigue",
      "headache",
      "high fever",
      "itching",
      "lethargy",
      "loss of appetite",
      "malaise",
      "mild fever",
      "red spots over body",
      "skin rash",
      "swelled lymph nodes"
    ],
    "description": "Chickenpox is a highly contagious disease caused by the varicella-zoster virus (VZV). It can cause an itchy, blister-like rash. The rash first appears on the chest, back, and face, and then spreads over the entire body, causing between 250 and 500 itchy blisters.",
    "precautions": [
      "use neem in bathing",
      "consume neem leaves",
      "take vaccine",
      "avoid public places"
    ],
    "severityTier": "monitor"
  },
  {
    "name": "Chronic cholestasis",
    "symptoms": [
      "abdominal_pain",
      "itching",
      "loss_of_appetite",
      "nausea",
      "vomiting",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "itching",
      "loss of appetite",
      "nausea",
      "vomiting",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "Chronic cholestatic diseases, whether occurring in infancy, childhood or adulthood, are characterized by defective bile acid transport from the liver to the intestine, which is caused by primary damage to the biliary epithelium in most cases",
    "precautions": [
      "cold baths",
      "anti itch medicine",
      "consult doctor",
      "eat healthy"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Common Cold",
    "symptoms": [
      "chest_pain",
      "chills",
      "congestion",
      "continuous_sneezing",
      "cough",
      "fatigue",
      "headache",
      "high_fever",
      "loss_of_smell",
      "malaise",
      "muscle_pain",
      "phlegm",
      "redness_of_eyes",
      "runny_nose",
      "sinus_pressure",
      "swelled_lymph_nodes",
      "throat_irritation"
    ],
    "symptomsHuman": [
      "chest pain",
      "chills",
      "congestion",
      "continuous sneezing",
      "cough",
      "fatigue",
      "headache",
      "high fever",
      "loss of smell",
      "malaise",
      "muscle pain",
      "phlegm",
      "redness of eyes",
      "runny nose",
      "sinus pressure",
      "swelled lymph nodes",
      "throat irritation"
    ],
    "description": "The common cold is a viral infection of your nose and throat (upper respiratory tract). It's usually harmless, although it might not feel that way. Many types of viruses can cause a common cold.",
    "precautions": [
      "drink vitamin c rich drinks",
      "take vapour",
      "avoid cold food",
      "keep fever in check"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Dengue",
    "symptoms": [
      "back_pain",
      "chills",
      "fatigue",
      "headache",
      "high_fever",
      "joint_pain",
      "loss_of_appetite",
      "malaise",
      "muscle_pain",
      "nausea",
      "pain_behind_the_eyes",
      "red_spots_over_body",
      "skin_rash",
      "vomiting"
    ],
    "symptomsHuman": [
      "back pain",
      "chills",
      "fatigue",
      "headache",
      "high fever",
      "joint pain",
      "loss of appetite",
      "malaise",
      "muscle pain",
      "nausea",
      "pain behind the eyes",
      "red spots over body",
      "skin rash",
      "vomiting"
    ],
    "description": "an acute infectious disease caused by a flavivirus (species Dengue virus of the genus Flavivirus), transmitted by aedes mosquitoes, and characterized by headache, severe joint pain, and a rash. \u2014 called also breakbone fever, dengue fever.",
    "precautions": [
      "drink papaya leaf juice",
      "avoid fatty spicy food",
      "keep mosquitos away",
      "keep hydrated"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Diabetes",
    "symptoms": [
      "blurred_and_distorted_vision",
      "excessive_hunger",
      "fatigue",
      "increased_appetite",
      "irregular_sugar_level",
      "lethargy",
      "obesity",
      "polyuria",
      "restlessness",
      "weight_loss"
    ],
    "symptomsHuman": [
      "blurred and distorted vision",
      "excessive hunger",
      "fatigue",
      "increased appetite",
      "irregular sugar level",
      "lethargy",
      "obesity",
      "polyuria",
      "restlessness",
      "weight loss"
    ],
    "description": "Diabetes is a disease that occurs when your blood glucose, also called blood sugar, is too high. Blood glucose is your main source of energy and comes from the food you eat. Insulin, a hormone made by the pancreas, helps glucose from food get into your cells to be used for energy.",
    "precautions": [
      "have balanced diet",
      "exercise",
      "consult doctor",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Dimorphic hemmorhoids(piles)",
    "symptoms": [
      "bloody_stool",
      "constipation",
      "irritation_in_anus",
      "pain_during_bowel_movements",
      "pain_in_anal_region"
    ],
    "symptomsHuman": [
      "bloody stool",
      "constipation",
      "irritation in anus",
      "pain during bowel movements",
      "pain in anal region"
    ],
    "description": "",
    "precautions": [
      "avoid fatty spicy food",
      "consume witch hazel",
      "warm bath with epsom salt",
      "consume alovera juice"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Drug Reaction",
    "symptoms": [
      "burning_micturition",
      "itching",
      "skin_rash",
      "spotting_ urination",
      "stomach_pain"
    ],
    "symptomsHuman": [
      "burning micturition",
      "itching",
      "skin rash",
      "spotting urination",
      "stomach pain"
    ],
    "description": "An adverse drug reaction (ADR) is an injury caused by taking medication. ADRs may occur following a single dose or prolonged administration of a drug or result from the combination of two or more drugs.",
    "precautions": [
      "stop irritation",
      "consult nearest hospital",
      "stop taking drug",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Fungal infection",
    "symptoms": [
      "dischromic _patches",
      "itching",
      "nodal_skin_eruptions",
      "skin_rash"
    ],
    "symptomsHuman": [
      "dischromic patches",
      "itching",
      "nodal skin eruptions",
      "skin rash"
    ],
    "description": "In humans, fungal infections occur when an invading fungus takes over an area of the body and is too much for the immune system to handle. Fungi can live in the air, soil, water, and plants. There are also some fungi that live naturally in the human body. Like many microbes, there are helpful fungi and harmful fungi.",
    "precautions": [
      "bath twice",
      "use detol or neem in bathing water",
      "keep infected area dry",
      "use clean cloths"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "GERD",
    "symptoms": [
      "acidity",
      "chest_pain",
      "cough",
      "stomach_pain",
      "ulcers_on_tongue",
      "vomiting"
    ],
    "symptomsHuman": [
      "acidity",
      "chest pain",
      "cough",
      "stomach pain",
      "ulcers on tongue",
      "vomiting"
    ],
    "description": "Gastroesophageal reflux disease, or GERD, is a digestive disorder that affects the lower esophageal sphincter (LES), the ring of muscle between the esophagus and stomach. Many people, including pregnant women, suffer from heartburn or acid indigestion caused by GERD.",
    "precautions": [
      "avoid fatty spicy food",
      "avoid lying down after eating",
      "maintain healthy weight",
      "exercise"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Gastroenteritis",
    "symptoms": [
      "dehydration",
      "diarrhoea",
      "sunken_eyes",
      "vomiting"
    ],
    "symptomsHuman": [
      "dehydration",
      "diarrhoea",
      "sunken eyes",
      "vomiting"
    ],
    "description": "Gastroenteritis is an inflammation of the digestive tract, particularly the stomach, and large and small intestines. Viral and bacterial gastroenteritis are intestinal infections associated with symptoms of diarrhea , abdominal cramps, nausea , and vomiting .",
    "precautions": [
      "stop eating solid food for while",
      "try taking small sips of water",
      "rest",
      "ease back into eating"
    ],
    "severityTier": "monitor"
  },
  {
    "name": "Heart attack",
    "symptoms": [
      "breathlessness",
      "chest_pain",
      "sweating",
      "vomiting"
    ],
    "symptomsHuman": [
      "breathlessness",
      "chest pain",
      "sweating",
      "vomiting"
    ],
    "description": "The death of heart muscle due to the loss of blood supply. The loss of blood supply is usually caused by a complete blockage of a coronary artery, one of the arteries that supplies blood to the heart muscle.",
    "precautions": [
      "call ambulance",
      "call emergency services immediately and do not drive yourself",
      "keep calm"
    ],
    "severityTier": "urgent"
  },
  {
    "name": "Hepatitis B",
    "symptoms": [
      "abdominal_pain",
      "dark_urine",
      "fatigue",
      "itching",
      "lethargy",
      "loss_of_appetite",
      "malaise",
      "receiving_blood_transfusion",
      "receiving_unsterile_injections",
      "yellow_urine",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "dark urine",
      "fatigue",
      "itching",
      "lethargy",
      "loss of appetite",
      "malaise",
      "receiving blood transfusion",
      "receiving unsterile injections",
      "yellow urine",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "Hepatitis B is an infection of your liver. It can cause scarring of the organ, liver failure, and cancer. It can be fatal if it isn't treated. It's spread when people come in contact with the blood, open sores, or body fluids of someone who has the hepatitis B virus.",
    "precautions": [
      "consult nearest hospital",
      "vaccination",
      "eat healthy",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hepatitis C",
    "symptoms": [
      "family_history",
      "fatigue",
      "loss_of_appetite",
      "nausea",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "family history",
      "fatigue",
      "loss of appetite",
      "nausea",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "Inflammation of the liver due to the hepatitis C virus (HCV), which is usually spread via blood transfusion (rare), hemodialysis, and needle sticks. The damage hepatitis C does to the liver can lead to cirrhosis and its complications as well as cancer.",
    "precautions": [
      "Consult nearest hospital",
      "vaccination",
      "eat healthy",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hepatitis D",
    "symptoms": [
      "abdominal_pain",
      "dark_urine",
      "fatigue",
      "joint_pain",
      "loss_of_appetite",
      "nausea",
      "vomiting",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "dark urine",
      "fatigue",
      "joint pain",
      "loss of appetite",
      "nausea",
      "vomiting",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "Hepatitis D, also known as the hepatitis delta virus, is an infection that causes the liver to become inflamed. This swelling can impair liver function and cause long-term liver problems, including liver scarring and cancer. The condition is caused by the hepatitis D virus (HDV).",
    "precautions": [
      "consult doctor",
      "any medication prescribed by your doctor",
      "eat healthy",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hepatitis E",
    "symptoms": [
      "abdominal_pain",
      "acute_liver_failure",
      "coma",
      "dark_urine",
      "fatigue",
      "high_fever",
      "joint_pain",
      "loss_of_appetite",
      "nausea",
      "stomach_bleeding",
      "vomiting",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "acute liver failure",
      "coma",
      "dark urine",
      "fatigue",
      "high fever",
      "joint pain",
      "loss of appetite",
      "nausea",
      "stomach bleeding",
      "vomiting",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "A rare form of liver inflammation caused by infection with the hepatitis E virus (HEV). It is transmitted via food or drink handled by an infected person or through infected water supplies in areas where fecal matter may get into the water. Hepatitis E does not cause chronic liver disease.",
    "precautions": [
      "stop alcohol consumption",
      "rest",
      "consult doctor",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hypertension",
    "symptoms": [
      "chest_pain",
      "dizziness",
      "headache",
      "lack_of_concentration",
      "loss_of_balance"
    ],
    "symptomsHuman": [
      "chest pain",
      "dizziness",
      "headache",
      "lack of concentration",
      "loss of balance"
    ],
    "description": "Hypertension (HTN or HT), also known as high blood pressure (HBP), is a long-term medical condition in which the blood pressure in the arteries is persistently elevated. High blood pressure typically does not cause symptoms.",
    "precautions": [
      "meditation",
      "salt baths",
      "reduce stress",
      "get proper sleep"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hyperthyroidism",
    "symptoms": [
      "abnormal_menstruation",
      "diarrhoea",
      "excessive_hunger",
      "fast_heart_rate",
      "fatigue",
      "irritability",
      "mood_swings",
      "muscle_weakness",
      "restlessness",
      "sweating",
      "weight_loss"
    ],
    "symptomsHuman": [
      "abnormal menstruation",
      "diarrhoea",
      "excessive hunger",
      "fast heart rate",
      "fatigue",
      "irritability",
      "mood swings",
      "muscle weakness",
      "restlessness",
      "sweating",
      "weight loss"
    ],
    "description": "Hyperthyroidism (overactive thyroid) occurs when your thyroid gland produces too much of the hormone thyroxine. Hyperthyroidism can accelerate your body's metabolism, causing unintentional weight loss and a rapid or irregular heartbeat.",
    "precautions": [
      "eat healthy",
      "massage",
      "use lemon balm",
      "discuss treatment options, including possible iodine therapy, with a doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hypoglycemia",
    "symptoms": [
      "anxiety",
      "blurred_and_distorted_vision",
      "drying_and_tingling_lips",
      "excessive_hunger",
      "fatigue",
      "headache",
      "irritability",
      "nausea",
      "palpitations",
      "slurred_speech",
      "sweating",
      "vomiting"
    ],
    "symptomsHuman": [
      "anxiety",
      "blurred and distorted vision",
      "drying and tingling lips",
      "excessive hunger",
      "fatigue",
      "headache",
      "irritability",
      "nausea",
      "palpitations",
      "slurred speech",
      "sweating",
      "vomiting"
    ],
    "description": "Hypoglycemia is a condition in which your blood sugar (glucose) level is lower than normal. Glucose is your body's main energy source. Hypoglycemia is often related to diabetes treatment. But other drugs and a variety of conditions \u2014 many rare \u2014 can cause low blood sugar in people who don't have diabetes.",
    "precautions": [
      "lie down on side",
      "check in pulse",
      "drink sugary drinks",
      "consult doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Hypothyroidism",
    "symptoms": [
      "abnormal_menstruation",
      "brittle_nails",
      "cold_hands_and_feets",
      "depression",
      "dizziness",
      "enlarged_thyroid",
      "fatigue",
      "irritability",
      "lethargy",
      "mood_swings",
      "puffy_face_and_eyes",
      "swollen_extremeties",
      "weight_gain"
    ],
    "symptomsHuman": [
      "abnormal menstruation",
      "brittle nails",
      "cold hands and feets",
      "depression",
      "dizziness",
      "enlarged thyroid",
      "fatigue",
      "irritability",
      "lethargy",
      "mood swings",
      "puffy face and eyes",
      "swollen extremeties",
      "weight gain"
    ],
    "description": "Hypothyroidism, also called underactive thyroid or low thyroid, is a disorder of the endocrine system in which the thyroid gland does not produce enough thyroid hormone.",
    "precautions": [
      "reduce stress",
      "exercise",
      "eat healthy",
      "get proper sleep"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Impetigo",
    "symptoms": [
      "blister",
      "high_fever",
      "red_sore_around_nose",
      "skin_rash",
      "yellow_crust_ooze"
    ],
    "symptomsHuman": [
      "blister",
      "high fever",
      "red sore around nose",
      "skin rash",
      "yellow crust ooze"
    ],
    "description": "Impetigo (im-puh-TIE-go) is a common and highly contagious skin infection that mainly affects infants and children. Impetigo usually appears as red sores on the face, especially around a child's nose and mouth, and on hands and feet. The sores burst and develop honey-colored crusts.",
    "precautions": [
      "soak affected area in warm water",
      "ask a doctor or pharmacist about appropriate treatment",
      "remove scabs with wet compressed cloth",
      "consult doctor"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Jaundice",
    "symptoms": [
      "abdominal_pain",
      "dark_urine",
      "fatigue",
      "high_fever",
      "itching",
      "vomiting",
      "weight_loss",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "dark urine",
      "fatigue",
      "high fever",
      "itching",
      "vomiting",
      "weight loss",
      "yellowish skin"
    ],
    "description": "Yellow staining of the skin and sclerae (the whites of the eyes) by abnormally high blood levels of the bile pigment bilirubin. The yellowing extends to other tissues and body fluids. Jaundice was once called the \"morbus regius\" (the regal disease) in the belief that only the touch of a king could cure it",
    "precautions": [
      "drink plenty of water",
      "consume milk thistle",
      "eat fruits and high fiberous food",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Malaria",
    "symptoms": [
      "chills",
      "diarrhoea",
      "headache",
      "high_fever",
      "muscle_pain",
      "nausea",
      "sweating",
      "vomiting"
    ],
    "symptomsHuman": [
      "chills",
      "diarrhoea",
      "headache",
      "high fever",
      "muscle pain",
      "nausea",
      "sweating",
      "vomiting"
    ],
    "description": "An infectious disease caused by protozoan parasites from the Plasmodium family that can be transmitted by the bite of the Anopheles mosquito or by a contaminated needle or transfusion. Falciparum malaria is the most deadly type.",
    "precautions": [
      "Consult nearest hospital",
      "avoid oily food",
      "avoid non veg food",
      "keep mosquitos out"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Migraine",
    "symptoms": [
      "acidity",
      "blurred_and_distorted_vision",
      "depression",
      "excessive_hunger",
      "headache",
      "indigestion",
      "irritability",
      "stiff_neck",
      "visual_disturbances"
    ],
    "symptomsHuman": [
      "acidity",
      "blurred and distorted vision",
      "depression",
      "excessive hunger",
      "headache",
      "indigestion",
      "irritability",
      "stiff neck",
      "visual disturbances"
    ],
    "description": "A migraine can cause severe throbbing pain or a pulsing sensation, usually on one side of the head. It's often accompanied by nausea, vomiting, and extreme sensitivity to light and sound. Migraine attacks can last for hours to days, and the pain can be so severe that it interferes with your daily activities.",
    "precautions": [
      "meditation",
      "reduce stress",
      "use poloroid glasses in sun",
      "consult doctor"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "Osteoarthristis",
    "symptoms": [
      "hip_joint_pain",
      "joint_pain",
      "knee_pain",
      "neck_pain",
      "painful_walking",
      "swelling_joints"
    ],
    "symptomsHuman": [
      "hip joint pain",
      "joint pain",
      "knee pain",
      "neck pain",
      "painful walking",
      "swelling joints"
    ],
    "description": "Osteoarthritis is the most common form of arthritis, affecting millions of people worldwide. It occurs when the protective cartilage that cushions the ends of your bones wears down over time.",
    "precautions": [
      "an over-the-counter pain reliever",
      "consult nearest hospital",
      "follow up",
      "salt baths"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Paralysis (brain hemorrhage)",
    "symptoms": [
      "altered_sensorium",
      "headache",
      "vomiting",
      "weakness_of_one_body_side"
    ],
    "symptomsHuman": [
      "altered sensorium",
      "headache",
      "vomiting",
      "weakness of one body side"
    ],
    "description": "Intracerebral hemorrhage (ICH) is when blood suddenly bursts into brain tissue, causing damage to your brain. Symptoms usually appear suddenly during ICH. They include headache, weakness, confusion, and paralysis, particularly on one side of your body.",
    "precautions": [
      "massage",
      "eat healthy",
      "exercise",
      "consult doctor"
    ],
    "severityTier": "urgent"
  },
  {
    "name": "Peptic ulcer diseae",
    "symptoms": [
      "abdominal_pain",
      "indigestion",
      "internal_itching",
      "loss_of_appetite",
      "passage_of_gases",
      "vomiting"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "indigestion",
      "internal itching",
      "loss of appetite",
      "passage of gases",
      "vomiting"
    ],
    "description": "Peptic ulcer disease (PUD) is a break in the inner lining of the stomach, the first part of the small intestine, or sometimes the lower esophagus. An ulcer in the stomach is called a gastric ulcer, while one in the first part of the intestines is a duodenal ulcer.",
    "precautions": [
      "avoid fatty spicy food",
      "consume probiotic food",
      "eliminate milk",
      "limit alcohol"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Pneumonia",
    "symptoms": [
      "breathlessness",
      "chest_pain",
      "chills",
      "cough",
      "fast_heart_rate",
      "fatigue",
      "high_fever",
      "malaise",
      "phlegm",
      "rusty_sputum",
      "sweating"
    ],
    "symptomsHuman": [
      "breathlessness",
      "chest pain",
      "chills",
      "cough",
      "fast heart rate",
      "fatigue",
      "high fever",
      "malaise",
      "phlegm",
      "rusty sputum",
      "sweating"
    ],
    "description": "Pneumonia is an infection in one or both lungs. Bacteria, viruses, and fungi cause it. The infection causes inflammation in the air sacs in your lungs, which are called alveoli. The alveoli fill with fluid or pus, making it difficult to breathe.",
    "precautions": [
      "consult doctor",
      "any medication prescribed by your doctor",
      "rest",
      "follow up"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Psoriasis",
    "symptoms": [
      "inflammatory_nails",
      "joint_pain",
      "silver_like_dusting",
      "skin_peeling",
      "skin_rash",
      "small_dents_in_nails"
    ],
    "symptomsHuman": [
      "inflammatory nails",
      "joint pain",
      "silver like dusting",
      "skin peeling",
      "skin rash",
      "small dents in nails"
    ],
    "description": "Psoriasis is a common skin disorder that forms thick, red, bumpy patches covered with silvery scales. They can pop up anywhere, but most appear on the scalp, elbows, knees, and lower back. Psoriasis can't be passed from person to person. It does sometimes happen in members of the same family.",
    "precautions": [
      "wash hands with warm soapy water",
      "stop bleeding using pressure",
      "consult doctor",
      "salt baths"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Tuberculosis",
    "symptoms": [
      "blood_in_sputum",
      "breathlessness",
      "chest_pain",
      "chills",
      "cough",
      "fatigue",
      "high_fever",
      "loss_of_appetite",
      "malaise",
      "mild_fever",
      "phlegm",
      "sweating",
      "swelled_lymph_nodes",
      "vomiting",
      "weight_loss",
      "yellowing_of_eyes"
    ],
    "symptomsHuman": [
      "blood in sputum",
      "breathlessness",
      "chest pain",
      "chills",
      "cough",
      "fatigue",
      "high fever",
      "loss of appetite",
      "malaise",
      "mild fever",
      "phlegm",
      "sweating",
      "swelled lymph nodes",
      "vomiting",
      "weight loss",
      "yellowing of eyes"
    ],
    "description": "Tuberculosis (TB) is an infectious disease usually caused by Mycobacterium tuberculosis (MTB) bacteria. Tuberculosis generally affects the lungs, but can also affect other parts of the body. Most infections show no symptoms, in which case it is known as latent tuberculosis.",
    "precautions": [
      "cover mouth",
      "consult doctor",
      "any medication prescribed by your doctor",
      "rest"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Typhoid",
    "symptoms": [
      "abdominal_pain",
      "belly_pain",
      "chills",
      "constipation",
      "diarrhoea",
      "fatigue",
      "headache",
      "high_fever",
      "nausea",
      "toxic_look_(typhos)",
      "vomiting"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "belly pain",
      "chills",
      "constipation",
      "diarrhoea",
      "fatigue",
      "headache",
      "high fever",
      "nausea",
      "toxic look (typhos)",
      "vomiting"
    ],
    "description": "An acute illness characterized by fever caused by infection with the bacterium Salmonella typhi. Typhoid fever has an insidious onset, with fever, headache, constipation, malaise, chills, and muscle pain. Diarrhea is uncommon, and vomiting is not usually severe.",
    "precautions": [
      "eat high calorie vegitables",
      "seek antibiotic treatment from a doctor",
      "consult doctor",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Urinary tract infection",
    "symptoms": [
      "bladder_discomfort",
      "burning_micturition",
      "continuous_feel_of_urine",
      "foul_smell_of urine"
    ],
    "symptomsHuman": [
      "bladder discomfort",
      "burning micturition",
      "continuous feel of urine",
      "foul smell of urine"
    ],
    "description": "Urinary tract infection: An infection of the kidney, ureter, bladder, or urethra. Abbreviated UTI. Not everyone with a UTI has symptoms, but common symptoms include a frequent urge to urinate and pain or burning when urinating.",
    "precautions": [
      "drink plenty of water",
      "increase vitamin c intake",
      "drink cranberry juice",
      "take probiotics"
    ],
    "severityTier": "see_doctor"
  },
  {
    "name": "Varicose veins",
    "symptoms": [
      "bruising",
      "cramps",
      "fatigue",
      "obesity",
      "prominent_veins_on_calf",
      "swollen_blood_vessels",
      "swollen_legs"
    ],
    "symptomsHuman": [
      "bruising",
      "cramps",
      "fatigue",
      "obesity",
      "prominent veins on calf",
      "swollen blood vessels",
      "swollen legs"
    ],
    "description": "A vein that has enlarged and twisted, often appearing as a bulging, blue blood vessel that is clearly visible through the skin. Varicose veins are most common in older adults, particularly women, and occur especially on the legs.",
    "precautions": [
      "lie down flat and raise the leg high",
      "use oinments",
      "use vein compression",
      "dont stand still for long"
    ],
    "severityTier": "self_care"
  },
  {
    "name": "hepatitis A",
    "symptoms": [
      "abdominal_pain",
      "dark_urine",
      "diarrhoea",
      "joint_pain",
      "loss_of_appetite",
      "mild_fever",
      "muscle_pain",
      "nausea",
      "vomiting",
      "yellowing_of_eyes",
      "yellowish_skin"
    ],
    "symptomsHuman": [
      "abdominal pain",
      "dark urine",
      "diarrhoea",
      "joint pain",
      "loss of appetite",
      "mild fever",
      "muscle pain",
      "nausea",
      "vomiting",
      "yellowing of eyes",
      "yellowish skin"
    ],
    "description": "Hepatitis A is a highly contagious liver infection caused by the hepatitis A virus. The virus is one of several types of hepatitis viruses that cause inflammation and affect your liver's ability to function.",
    "precautions": [
      "Consult nearest hospital",
      "wash hands through",
      "avoid fatty spicy food",
      "any medication prescribed by your doctor"
    ],
    "severityTier": "see_doctor"
  }
];

const SYMPTOM_SEVERITY_WEIGHTS = {
  "itching": 1,
  "skin_rash": 3,
  "nodal_skin_eruptions": 4,
  "continuous_sneezing": 4,
  "shivering": 5,
  "chills": 3,
  "joint_pain": 3,
  "stomach_pain": 5,
  "acidity": 3,
  "ulcers_on_tongue": 4,
  "muscle_wasting": 3,
  "vomiting": 5,
  "burning_micturition": 6,
  "spotting_urination": 6,
  "fatigue": 4,
  "weight_gain": 3,
  "anxiety": 4,
  "cold_hands_and_feets": 5,
  "mood_swings": 3,
  "weight_loss": 3,
  "restlessness": 5,
  "lethargy": 2,
  "patches_in_throat": 6,
  "irregular_sugar_level": 5,
  "cough": 4,
  "high_fever": 7,
  "sunken_eyes": 3,
  "breathlessness": 4,
  "sweating": 3,
  "dehydration": 4,
  "indigestion": 5,
  "headache": 3,
  "yellowish_skin": 3,
  "dark_urine": 4,
  "nausea": 5,
  "loss_of_appetite": 4,
  "pain_behind_the_eyes": 4,
  "back_pain": 3,
  "constipation": 4,
  "abdominal_pain": 4,
  "diarrhoea": 6,
  "mild_fever": 5,
  "yellow_urine": 4,
  "yellowing_of_eyes": 4,
  "acute_liver_failure": 6,
  "fluid_overload": 4,
  "swelling_of_stomach": 7,
  "swelled_lymph_nodes": 6,
  "malaise": 6,
  "blurred_and_distorted_vision": 5,
  "phlegm": 5,
  "throat_irritation": 4,
  "redness_of_eyes": 5,
  "sinus_pressure": 4,
  "runny_nose": 5,
  "congestion": 5,
  "chest_pain": 7,
  "weakness_in_limbs": 7,
  "fast_heart_rate": 5,
  "pain_during_bowel_movements": 5,
  "pain_in_anal_region": 6,
  "bloody_stool": 5,
  "irritation_in_anus": 6,
  "neck_pain": 5,
  "dizziness": 4,
  "cramps": 4,
  "bruising": 4,
  "obesity": 4,
  "swollen_legs": 5,
  "swollen_blood_vessels": 5,
  "puffy_face_and_eyes": 5,
  "enlarged_thyroid": 6,
  "brittle_nails": 5,
  "swollen_extremeties": 5,
  "excessive_hunger": 4,
  "extra_marital_contacts": 5,
  "drying_and_tingling_lips": 4,
  "slurred_speech": 4,
  "knee_pain": 3,
  "hip_joint_pain": 2,
  "muscle_weakness": 2,
  "stiff_neck": 4,
  "swelling_joints": 5,
  "movement_stiffness": 5,
  "spinning_movements": 6,
  "loss_of_balance": 4,
  "unsteadiness": 4,
  "weakness_of_one_body_side": 4,
  "loss_of_smell": 3,
  "bladder_discomfort": 4,
  "foul_smell_ofurine": 5,
  "continuous_feel_of_urine": 6,
  "passage_of_gases": 5,
  "internal_itching": 4,
  "toxic_look_(typhos)": 5,
  "depression": 3,
  "irritability": 2,
  "muscle_pain": 2,
  "altered_sensorium": 2,
  "red_spots_over_body": 3,
  "belly_pain": 4,
  "abnormal_menstruation": 6,
  "dischromic_patches": 6,
  "watering_from_eyes": 4,
  "increased_appetite": 5,
  "polyuria": 4,
  "family_history": 5,
  "mucoid_sputum": 4,
  "rusty_sputum": 4,
  "lack_of_concentration": 3,
  "visual_disturbances": 3,
  "receiving_blood_transfusion": 5,
  "receiving_unsterile_injections": 2,
  "coma": 7,
  "stomach_bleeding": 6,
  "distention_of_abdomen": 4,
  "history_of_alcohol_consumption": 5,
  "blood_in_sputum": 5,
  "prominent_veins_on_calf": 6,
  "palpitations": 4,
  "painful_walking": 2,
  "pus_filled_pimples": 2,
  "blackheads": 2,
  "scurring": 2,
  "skin_peeling": 3,
  "silver_like_dusting": 2,
  "small_dents_in_nails": 2,
  "inflammatory_nails": 2,
  "blister": 4,
  "red_sore_around_nose": 2,
  "yellow_crust_ooze": 3,
  "prognosis": 5,
  "spotting_ urination": 6,
  "foul_smell_of urine": 2,
  "dischromic _patches": 6
};

module.exports = { DISEASES, SYMPTOM_SEVERITY_WEIGHTS };
