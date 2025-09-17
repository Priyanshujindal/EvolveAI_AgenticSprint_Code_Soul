// Shared scoring helpers to keep Dashboard and Daily Check-in consistent

export function scoreFromAnswersV2(a) {
  if (!a) return 0.5;
  const map4 = (v) => ({
    'None': 1.0,
    'Normal': 1.0,
    'Slept well – no trouble falling or staying asleep': 1.0,
    'None – no unusual warmth': 1.0,

    'Mild': 0.7,
    'Mild – occasional discomfort': 0.7,
    'Mild – didn’t interfere with work': 0.7,
    'Mild – occasional queasiness': 0.7,
    'Mild – slightly tired': 0.7,
    'Mild – slight temperature fluctuation': 0.7,
    'Mild – occasional cough or shortness of breath': 0.7,
    'Slight irregularity – mild constipation/diarrhea': 0.7,
    'Slight – minor discomfort or frequency change': 0.7,
    'Minor – small rashes, bruises, or pimples': 0.7,
    'Mild – occasional lightheadedness': 0.7,

    'Moderate': 0.4,
    'Moderate – noticeable, affects tasks': 0.4,
    'Moderate – interfered with tasks': 0.4,
    'Moderate – affected meals': 0.4,
    'Moderate – noticeable fatigue': 0.4,
    'Moderate – measurable fever (100–102°F / 37.7–38.8°C)': 0.4,
    'Moderate – daily cough or breathing difficulty': 0.4,
    'Moderate – frequent or loose stools': 0.4,
    'Moderate – frequent or painful urination': 0.4,
    'Noticeable – persistent rash, sores, or swelling': 0.4,
    'Moderate – dizziness affecting tasks': 0.4,
    'Moderate difficulty – frequent waking or poor sleep quality': 0.4,
    'Moderate – noticeable episodes affecting comfort': 0.4,

    'Severe': 0.2,
    'Severe – persistent pain': 0.2,
    'Severe – unable to perform daily activities': 0.2,
    'Severe – persistent vomiting': 0.2,
    'Severe – could barely perform activities': 0.2,
    'Severe – high fever (>102°F / 38.8°C)': 0.2,
    'Severe – persistent cough or severe breathing issues': 0.2,
    'Severe – persistent diarrhea/constipation': 0.2,
    'Severe – inability to urinate normally or severe discomfort': 0.2,
    'Severe – bleeding, large lesions, or non-healing wounds': 0.2,
    'Severe – fainting or inability to stand': 0.2,
    'Severe – frequent or intense hot flashes': 0.2,
  })[v] ?? 0.5;

  const parts = [
    map4(a.ns_q1), map4(a.ns_q2), map4(a.ns_q3), map4(a.ns_q4), map4(a.ns_q5),
    map4(a.ns_q6), map4(a.ns_q7), map4(a.ns_q8), map4(a.ns_q9), map4(a.ns_q10),
    map4(a.ns_q11), map4(a.ns_q12)
  ];
  const avg = parts.reduce((s, v) => s + (typeof v === 'number' ? v : 0.5), 0) / parts.length;
  return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
}

export function riskFromAnswersV2(a) {
  return 1 - scoreFromAnswersV2(a);
}


