import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_TIMEOUT_MS = parseInt(process.env.GEMINI_TIMEOUT_MS || '8000', 10);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const MANUAL_REVIEW_THRESHOLD = parseFloat(process.env.MANUAL_REVIEW_THRESHOLD || '0.6');

export type Category =
  | 'wifi'
  | 'electricity'
  | 'water'
  | 'food'
  | 'hygiene'
  | 'security'
  | 'maintenance'
  | 'other';

export interface ClassificationResult {
  category: Category;
  urgencyScore: number;      // 1–5
  confidenceScore: number;   // 0–1
  source: 'gemini' | 'keyword';
  needsManualReview: boolean;
}

// ─── Keyword/Regex Fallback Classifier ───────────────────────────────────────

const CATEGORY_KEYWORDS: Record<Category, RegExp> = {
  electricity: /(light|bijli|electricity|power|fan|ac\b|heater|switch|socket|bulb|wiring|current|power cut|load shedding|ऐसी|एसी|बिजली|लाइट|पंखा|हीटर|करंट)/i,
  wifi: /(wifi|wi-fi|internet|network|connection|signal|bandwidth|router|broadband|net|वाईफाई|इंटरनेट|नेट)/i,
  water: /(water|paani|pani|tap|pipe|leakage|drain|bathroom|toilet|flush|geyser|hot water|cold water|पानी|नल|पाइप|गीजर)/i,
  food: /(food|khana|meal|canteen|mess|breakfast|lunch|dinner|quality|taste|stale|rotten|bhookha|खाना|मेस|कैंटीन|रोटी|सब्जी)/i,
  hygiene: /(clean|dirty|garbage|waste|smell|cockroach|rat|insects|pest|dustbin|sweeping|mopping|ganda|safai|सफाई|गंदा|कचरा|बदबू|मक्खी|मच्छर)/i,
  security: /(security|guard|gate|lock|theft|stolen|safe|cctv|camera|unauthorized|stranger|threat|unsafe|सुरक्षा|गार्ड|गेट|ताला|चोरी)/i,
  maintenance: /(repair|fix|broken|damage|door|window|wall|ceiling|floor|furniture|bed|table|chair|tuta|kharaab|theek|ठीक|मरम्मत|टूटा|खराब)/i,
  other: /./,
};

const URGENCY_KEYWORDS: Record<number, RegExp> = {
  5: /\b(emergency|urgent|immediately|fire|flood|injury|hurt|blood|unconscious|sos|help|danger|bahut|serious|critical)\b/i,
  4: /\b(not working since|days|no water|no electricity|security breach|theft|broken lock|unsafe)\b/i,
  3: /\b(issue|problem|complaint|not working|kharab|band|nahi chal raha)\b/i,
  2: /\b(slow|sometimes|occasional|minor|small|thoda)\b/i,
  1: /\b(suggestion|feedback|improve|better|would be nice)\b/i,
};

export function keywordClassify(transcript: string): ClassificationResult {
  let detectedCategory: Category = 'other';

  for (const [cat, regex] of Object.entries(CATEGORY_KEYWORDS) as [Category, RegExp][]) {
    if (cat === 'other') continue;
    if (regex.test(transcript)) {
      detectedCategory = cat;
      break;
    }
  }

  let urgencyScore = 3;
  for (const [score, regex] of Object.entries(URGENCY_KEYWORDS) as unknown as [number, RegExp][]) {
    if (regex.test(transcript)) {
      urgencyScore = Number(score);
      break;
    }
  }

  const confidenceScore = 0.45; // Always below manual review threshold to flag for review

  console.log(JSON.stringify({
    level: 'info',
    stage: 'classification',
    source: 'keyword_fallback',
    category: detectedCategory,
    urgency_score: urgencyScore,
    confidence_score: confidenceScore,
  }));

  return {
    category: detectedCategory,
    urgencyScore,
    confidenceScore,
    source: 'keyword',
    needsManualReview: confidenceScore < MANUAL_REVIEW_THRESHOLD,
  };
}

// ─── Gemini AI Classifier ─────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function classifyTranscript(transcript: string): Promise<ClassificationResult> {
  const startTime = Date.now();

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn(JSON.stringify({
      level: 'warn',
      stage: 'classification',
      status: 'gemini_skipped',
      reason: 'no_api_key',
    }));
    return keywordClassify(transcript);
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are a hostel complaint management system. Classify the following student complaint transcript.

Transcript: "${transcript}"

Respond ONLY with a valid JSON object in this exact format:
{
  "category": "<one of: wifi, electricity, water, food, hygiene, security, maintenance, other>",
  "urgency_score": <integer 1-5, where 5 is most urgent>,
  "confidence_score": <float 0.0-1.0, how confident you are in the classification>
}

Guidelines:
- urgency 5: safety emergency, injury, fire, flood
- urgency 4: complete service failure (no water/electricity for days, security breach)
- urgency 3: significant disruption (service intermittent, noticeable problem)
- urgency 2: minor inconvenience
- urgency 1: suggestion or low-priority feedback
- confidence: 1.0 if very clear, 0.5 if ambiguous, 0.3 if barely understandable`;

    const geminiCall = model.generateContent(prompt);
    const result = await withTimeout(geminiCall, GEMINI_TIMEOUT_MS, 'gemini_classify');

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);
    const latencyMs = Date.now() - startTime;

    const category = parsed.category as Category;
    const urgencyScore = Math.min(5, Math.max(1, parseInt(parsed.urgency_score, 10)));
    const confidenceScore = Math.min(1, Math.max(0, parseFloat(parsed.confidence_score)));

    console.log(JSON.stringify({
      level: 'info',
      stage: 'classification',
      status: 'done',
      source: 'gemini',
      latency_ms: latencyMs,
      category,
      urgency_score: urgencyScore,
      confidence_score: confidenceScore,
    }));

    return {
      category,
      urgencyScore,
      confidenceScore,
      source: 'gemini',
      needsManualReview: confidenceScore < MANUAL_REVIEW_THRESHOLD,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error(JSON.stringify({
      level: 'error',
      stage: 'classification',
      status: 'gemini_failed',
      latency_ms: latencyMs,
      error: err.message,
      fallback: 'keyword_classifier',
    }));
    return keywordClassify(transcript);
  }
}
