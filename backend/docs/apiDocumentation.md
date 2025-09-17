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

Auth
- Most endpoints accept an optional `Authorization: Bearer <FirebaseIdToken>` header. In development, when Firebase Admin is not configured, the server may accept `x-user-id: demo`.

POST /functions/chat
Headers:
- Authorization: Bearer <FirebaseIdToken>
Body:
{ messages: [{ role, content }] }
Response:
{ reply }


