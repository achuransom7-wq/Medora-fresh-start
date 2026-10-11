/**
 * Medora Intent Training Data
 * ---------------------------
 * Hand-curated labeled examples used to train the local intent classifier
 * (ml/intentModel.js). Every example is a short, realistic thing a real
 * patient might type, in English, French, or Cameroonian Pidgin.
 *
 * Labels match the categories classifyStandalone() already returns in
 * localIntent.js: greeting, gratitude, farewell, symptom, knowledge_question,
 * wellness_ok, small_talk, off_topic.
 *
 * WHY THIS FILE EXISTS: regex patterns only catch phrasings someone thought
 * to write down. A trained classifier generalizes to new phrasings of the
 * same intent ("my belle dey do me wahala" reads as a symptom report even
 * though no regex was written for that exact string). This file is the
 * classifier's only source of truth — extend it the same way you'd extend
 * data/symptomSynonyms.js: add real phrasings as you find gaps, retrain with
 * `node scripts/trainIntentModel.js`, done.
 *
 * Keeping languages roughly balanced within each label matters: if English
 * dominates a category, the model quietly gets worse at French/Pidgin for
 * that intent, even with more total examples.
 */

const TRAINING_EXAMPLES = [
  // ---------------------------------------------------------------- greeting
  { text: 'hi', label: 'greeting' },
  { text: 'hey there', label: 'greeting' },
  { text: 'hello', label: 'greeting' },
  { text: 'hey', label: 'greeting' },
  { text: 'good morning', label: 'greeting' },
  { text: 'good evening', label: 'greeting' },
  { text: 'good afternoon', label: 'greeting' },
  { text: "what's up", label: 'greeting' },
  { text: 'yo', label: 'greeting' },
  { text: 'how are you doing today', label: 'greeting' },
  { text: 'hiya, anyone there', label: 'greeting' },
  { text: 'hello is this medora', label: 'greeting' },
  { text: 'bonjour', label: 'greeting' },
  { text: 'salut', label: 'greeting' },
  { text: 'coucou', label: 'greeting' },
  { text: 'bonsoir', label: 'greeting' },
  { text: 'comment ça va', label: 'greeting' },
  { text: 'comment allez-vous', label: 'greeting' },
  { text: 'salut ça va bien', label: 'greeting' },
  { text: 'bonjour, comment vas-tu', label: 'greeting' },
  { text: 'how far', label: 'greeting' },
  { text: 'how far na', label: 'greeting' },
  { text: 'you dey fine', label: 'greeting' },
  { text: 'how you dey', label: 'greeting' },
  { text: 'wetin dey happen', label: 'greeting' },
  { text: 'bo how you dey', label: 'greeting' },
  { text: 'na how', label: 'greeting' },
  { text: 'good morning oh how you dey', label: 'greeting' },
  { text: 'wetin dey do', label: 'greeting' },

  // -------------------------------------------------------------- gratitude
  { text: 'thanks', label: 'gratitude' },
  { text: 'thank you', label: 'gratitude' },
  { text: 'thank you so much', label: 'gratitude' },
  { text: 'thx', label: 'gratitude' },
  { text: 'ty', label: 'gratitude' },
  { text: 'okay thanks', label: 'gratitude' },
  { text: 'that helps a lot, thank you', label: 'gratitude' },
  { text: 'appreciate it', label: 'gratitude' },
  { text: 'cool thanks', label: 'gratitude' },
  { text: 'got it thank you', label: 'gratitude' },
  { text: 'merci', label: 'gratitude' },
  { text: 'merci beaucoup', label: 'gratitude' },
  { text: "merci, c'est utile", label: 'gratitude' },
  { text: "d'accord merci", label: 'gratitude' },
  { text: 'thank you my broda', label: 'gratitude' },
  { text: 'i tank you', label: 'gratitude' },
  { text: 'thank you oh', label: 'gratitude' },
  { text: 'na so, tank God, thank you', label: 'gratitude' },
  { text: 'ok tank you sef', label: 'gratitude' },
  { text: 'merci bien, ça va beaucoup aider', label: 'gratitude' },
  { text: "c'est vraiment gentil, merci", label: 'gratitude' },
  { text: 'thank you, that will help a lot', label: 'gratitude' },

  // -------------------------------------------------------------- farewell
  { text: 'bye', label: 'farewell' },
  { text: 'goodbye', label: 'farewell' },
  { text: 'see you later', label: 'farewell' },
  { text: 'take care', label: 'farewell' },
  { text: "i've got to go now", label: 'farewell' },
  { text: 'talk to you later', label: 'farewell' },
  { text: 'au revoir', label: 'farewell' },
  { text: 'à bientôt', label: 'farewell' },
  { text: 'bonne journée, au revoir', label: 'farewell' },
  { text: 'i dey go', label: 'farewell' },
  { text: 'make i go now', label: 'farewell' },
  { text: 'we go see, bye bye', label: 'farewell' },
  { text: 'i dey off now, bye', label: 'farewell' },

  // --------------------------------------------------------------- symptom
  { text: 'i have a fever', label: 'symptom' },
  { text: 'my head is hurting really bad', label: 'symptom' },
  { text: "i've been vomiting since this morning", label: 'symptom' },
  { text: 'i feel dizzy and weak', label: 'symptom' },
  { text: 'my stomach is paining me', label: 'symptom' },
  { text: "i'm coughing a lot and it hurts to breathe", label: 'symptom' },
  { text: 'i have a rash on my arm that itches', label: 'symptom' },
  { text: 'my joints hurt and i feel tired all the time', label: 'symptom' },
  { text: 'i have chills and my whole body aches', label: 'symptom' },
  { text: "i've had diarrhea for two days now", label: 'symptom' },
  { text: 'it burns when i pee', label: 'symptom' },
  { text: 'my chest feels tight and i am short of breath', label: 'symptom' },
  { text: 'i noticed some swelling in my leg', label: 'symptom' },
  { text: "i've been feeling nauseous since last night", label: 'symptom' },
  { text: 'my throat is really sore and it hurts to swallow', label: 'symptom' },
  { text: "i can't stop sneezing and my nose is blocked", label: 'symptom' },
  { text: 'my heart is racing and i feel lightheaded', label: 'symptom' },
  { text: 'i lost my balance and fell earlier', label: 'symptom' },
  { text: "j'ai de la fièvre depuis hier", label: 'symptom' },
  { text: "j'ai mal à la tête depuis ce matin", label: 'symptom' },
  { text: 'je vomis depuis ce matin', label: 'symptom' },
  { text: "j'ai des vertiges et je me sens faible", label: 'symptom' },
  { text: 'mon ventre me fait très mal', label: 'symptom' },
  { text: "je tousse beaucoup et j'ai du mal à respirer", label: 'symptom' },
  { text: "j'ai une éruption cutanée qui me démange", label: 'symptom' },
  { text: "j'ai mal partout et je me sens fatigué", label: 'symptom' },
  { text: "j'ai la diarrhée depuis deux jours", label: 'symptom' },
  { text: 'ma gorge me fait très mal', label: 'symptom' },
  { text: 'my body dey hot since yesterday', label: 'symptom' },
  { text: 'my head dey pain me since morning', label: 'symptom' },
  { text: 'i dey vomit since this morning', label: 'symptom' },
  { text: 'i dey feel weak and my body dey shake', label: 'symptom' },
  { text: 'my belle dey pain me', label: 'symptom' },
  { text: 'i get catarrh and i dey cough well well', label: 'symptom' },
  { text: 'i no fine at all, my body dey pain me', label: 'symptom' },
  { text: 'my leg don swell since yesterday', label: 'symptom' },
  { text: 'i dey stool since morning', label: 'symptom' },
  { text: 'na wa oh, my throat dey pain me when i swallow', label: 'symptom' },
  { text: 'my heart dey beat fast fast and i dey feel dizzy', label: 'symptom' },

  // ---------------------------------------------------------- knowledge_question
  { text: 'what are the symptoms of malaria', label: 'knowledge_question' },
  { text: 'how do you treat typhoid', label: 'knowledge_question' },
  { text: 'is chicken pox contagious', label: 'knowledge_question' },
  { text: 'how much water should i drink a day', label: 'knowledge_question' },
  { text: "what's a normal blood pressure", label: 'knowledge_question' },
  { text: 'how long does the flu usually last', label: 'knowledge_question' },
  { text: 'can you tell me about diabetes', label: 'knowledge_question' },
  { text: 'what causes high cholesterol', label: 'knowledge_question' },
  { text: 'how is dengue diagnosed', label: 'knowledge_question' },
  { text: 'is it common here', label: 'knowledge_question' },
  { text: 'how long will it last', label: 'knowledge_question' },
  { text: 'quels sont les symptômes du paludisme', label: 'knowledge_question' },
  { text: 'comment traite-t-on la typhoïde', label: 'knowledge_question' },
  { text: 'est-ce que la varicelle est contagieuse', label: 'knowledge_question' },
  { text: 'combien de litres d\'eau dois-je boire par jour', label: 'knowledge_question' },
  { text: "quelle est la tension artérielle normale", label: 'knowledge_question' },
  { text: 'wetin be the sign for malaria', label: 'knowledge_question' },
  { text: 'how man fit treat typhoid', label: 'knowledge_question' },
  { text: 'malaria fit pass from person to person', label: 'knowledge_question' },
  { text: 'how much water i suppose dey drink for one day', label: 'knowledge_question' },
  { text: 'wetin dey cause high blood pressure', label: 'knowledge_question' },
  { text: 'wetin i suppose do if my fever no dey go', label: 'knowledge_question' },
  { text: 'wetin you go advise me to do', label: 'knowledge_question' },
  { text: 'is malaria dangerous for pregnant women', label: 'knowledge_question' },
  { text: 'what should i do if the fever does not go away', label: 'knowledge_question' },
  { text: 'is it dangerous for pregnant women', label: 'knowledge_question' },

  // -------------------------------------------------------------- wellness_ok
  { text: "i'm fine thanks", label: 'wellness_ok' },
  { text: 'feeling good today', label: 'wellness_ok' },
  { text: 'no complaints here', label: 'wellness_ok' },
  { text: "i'm doing well", label: 'wellness_ok' },
  { text: 'nothing wrong, i just feel great', label: 'wellness_ok' },
  { text: "i don't have any symptoms right now", label: 'wellness_ok' },
  { text: 'je vais bien merci', label: 'wellness_ok' },
  { text: 'ça va bien, rien de grave', label: 'wellness_ok' },
  { text: 'je me sens bien aujourd\'hui', label: 'wellness_ok' },
  { text: 'i dey fine', label: 'wellness_ok' },
  { text: 'body dey ok, no wahala', label: 'wellness_ok' },
  { text: 'i dey kampe, no wahala at all', label: 'wellness_ok' },

  // -------------------------------------------------------------- small_talk
  { text: 'just wanted to chat for a bit', label: 'small_talk' },
  { text: 'i have a few questions if that is ok', label: 'small_talk' },
  { text: 'just curious about a few things', label: 'small_talk' },
  { text: 'i wanted to learn a few things today', label: 'small_talk' },
  { text: 'je voulais juste discuter un peu', label: 'small_talk' },
  { text: "j'ai quelques questions à poser", label: 'small_talk' },
  { text: 'i just wan yarn small', label: 'small_talk' },
  { text: 'i get some question wey i wan ask', label: 'small_talk' },
  { text: 'i just wan learn small thing today', label: 'small_talk' },

  // -------------------------------------------------------------- off_topic
  { text: "what's the capital of france", label: 'off_topic' },
  { text: 'write me a poem about the ocean', label: 'off_topic' },
  { text: 'what is 2 plus 2', label: 'off_topic' },
  { text: 'tell me a joke', label: 'off_topic' },
  { text: 'who won the world cup', label: 'off_topic' },
  { text: 'can you help me with my homework', label: 'off_topic' },
  { text: "what's the weather like tomorrow", label: 'off_topic' },
  { text: 'recommend me a good movie', label: 'off_topic' },
  { text: 'quelle est la capitale de la france', label: 'off_topic' },
  { text: 'écris-moi un poème', label: 'off_topic' },
  { text: 'quel temps fait-il demain', label: 'off_topic' },
  { text: 'raconte-moi une blague', label: 'off_topic' },
  { text: 'wetin be the capital of nigeria', label: 'off_topic' },
  { text: 'tell me joke abeg', label: 'off_topic' },
  { text: 'sing me song', label: 'off_topic' },
  { text: 'who win the match yesterday', label: 'off_topic' },
  { text: 'quel est le meilleur restaurant en ville', label: 'off_topic' },
  { text: 'quel est le meilleur film en ce moment', label: 'off_topic' },
  { text: "what's the best restaurant in town", label: 'off_topic' },
  { text: 'which phone should i buy', label: 'off_topic' },
];

module.exports = { TRAINING_EXAMPLES };
