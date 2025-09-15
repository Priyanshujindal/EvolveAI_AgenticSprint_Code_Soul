API Documentation

POST /api/analyze
Body:
{
  notes?: string,
  vitals?: {
    heartRate?: number,
    systolicBP?: number,
    diastolicBP?: number,
    respiratoryRate?: number,
    temperature?: number
  },
  labs?: {
    wbc?: number,
    crp?: number,
    glucose?: number
  },
  topK?: number,
  explainMethod?: "auto" | "captum" | "shap" | "none",
  useScipyWinsorize?: boolean
}

Response:
{
  diagnoses: Array<{ label: string, confidence: number }>,
  redFlags: Array<{ condition: string, triggered: boolean, rationale: string[] }>,
  explainability: {
    available: boolean,
    method?: "auto" | "captum" | "shap" | "none",
    features?: string[],
    attributions?: number[]
  },
  latencyMs: number
}

POST /functions/chatWithGemini
Body: { messages: [{ role, content }] }
Response: { reply }


