### AgenticSprit — Setup, Keys, and Next Steps

This guide lists the exact steps to get the project running locally and what to do next in staging/production. Use it as a checklist.

---

## 1) Prerequisites
- Node.js 18+
- npm 9+
- Python 3.9+
- Git
- Accounts/Access: Firebase project, Google Cloud project (for Gemini/Maps/Vision)

---

## 2) Environment Files
Create the following from the provided examples and fill values.
- Backend: copy `backend/.env.example` → `backend/.env`
- Frontend: copy `frontend/.env.example` → `frontend/.env`

---

## 3) Required Keys and Config
Fill these in `.env` files. Names may vary; use the examples in repo as canonical.

- Backend `.env` (examples)
  - `PORT=8080`
  - `NODE_ENV=development`
  - `FIREBASE_PROJECT_ID=`
  - `FIREBASE_CLIENT_EMAIL=`
  - `FIREBASE_PRIVATE_KEY=`  # Use proper escaping for newlines on Windows
  - `GEMINI_API_KEY=`
  - `GOOGLE_MAPS_API_KEY=`
  - `GOOGLE_VISION_API_KEY=` (or configure service account)
  - `RATE_LIMIT_WINDOW_MS=60000`
  - `RATE_LIMIT_MAX=100`

- Frontend `.env`
  - `VITE_API_BASE_URL=http://localhost:8080`
  - `VITE_FIREBASE_API_KEY=`
  - `VITE_FIREBASE_AUTH_DOMAIN=`
  - `VITE_FIREBASE_PROJECT_ID=`
  - `VITE_FIREBASE_STORAGE_BUCKET=`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=`
  - `VITE_FIREBASE_APP_ID=`

---

## 4) How to Obtain Keys
- Google Cloud Project
  - Create/select a project in Google Cloud Console.
  - Enable APIs: Generative Language (Gemini), Maps Places/Directions, Vision API.
  - Create API keys or service accounts as needed.
- Gemini API Key
  - In Google AI Studio, create an API key and restrict by HTTP referrers or IPs as appropriate.
- Google Maps API Key
  - Create a Maps API key; enable Places and Directions; restrict by HTTP referrers (frontend) and/or IPs (backend) if applicable.
- Google Vision
  - Prefer service account with JSON key; set envs or use ADC. For direct API key usage, enable Vision API.
- Firebase
  - Create a Firebase project; enable Authentication (Email/Password or chosen providers). Get web app config for frontend envs; generate Admin SDK service account for backend.

---

## 5) Local Setup
- Backend
```bash
cd backend
npm ci
npm run dev
```
- Frontend
```bash
cd frontend
npm ci
npm run dev
```
- Python models (optional for full AI features)
```bash
cd backend/models
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

---

## 6) Smoke Tests
- Backend: `GET /health` (if available) or run `npm test`
- Frontend: open Vite dev URL in browser; verify login page and dashboard load
- Key flows:
  - Chatbot responds (Gemini configured)
  - Daily Check-in submits successfully
  - Upload report → text extraction works (Vision configured)
  - Nearby ambulance search returns results (Maps configured)

---

## 7) Recommended Next Steps
- Security hardening
  - Ensure `helmet` and `express-rate-limit` enabled and tuned in production
  - Enforce HTTPS; configure CORS allow-list
  - Move secrets to a secret manager (GCP Secret Manager)
- Observability
  - Integrate error tracking (Sentry) and logging sinks
  - Add uptime monitoring and basic metrics
- CI/CD
  - Configure pipeline secrets for all keys above
  - Gate merges with tests and lint
- Data & Compliance
  - Review PHI/PII handling; ensure storage and transmission are compliant
  - Add data retention and backup policies (`backend/scripts/dataBackup.js`)
- Model lifecycle
  - Verify `backend/scripts/retrainModel.py` and schedule retraining if applicable

---

## 8) Production Readiness Checklist
- [ ] All required env vars present in staging/production
- [ ] API rate limits and quotas reviewed
- [ ] CORS, HTTPS, and WAF configured
- [ ] Error tracking and monitoring active
- [ ] Backups and disaster recovery plan documented
- [ ] Access controls and least privilege enforced

---

## 9) References in Repo
- `PROJECT_OVERVIEW.md` — architecture and workflows
- `backend/config/config.js` — centralized config usage
- `backend/services/*.js` — API client integrations
- `backend/middleware/*` — auth and error handling
- `frontend/src/services/api.js` — frontend API client
- AI/ML docs
  - `docs/ai-libraries.md` — overview of AI libraries and roles
  - `docs/pytorch.md` — PyTorch usage and service integration
  - `docs/captum.md` — Captum explainability flow
  - `docs/shap.md` — SHAP status and integration ideas
  - `docs/scipy.md` — SciPy role and potential uses
