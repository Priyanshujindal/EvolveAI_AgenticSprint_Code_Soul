### AgenticSprit Project Overview

This document provides a concise, high-signal overview of the AgenticSprit project: what it does, how it’s structured, how components interact, and how to develop, test, and deploy it.

---

## Purpose
AgenticSprit is a healthcare-focused, agentic application that assists clinicians and patients with:
- Conversational triage and guidance (chatbot)
- Daily symptom check-ins and risk monitoring
- Report uploads with AI-assisted analysis and explainability
- Red flag detection and nearby ambulance lookup
- Human-in-the-loop (HITL) feedback capture

---

## High-Level Architecture
- **Frontend**: React + Vite app with Tailwind CSS for UI, organized into `pages`, `components`, `context`, `services`, and `utils`.
- **Backend**: Node.js/Express API with modular `services` (Firebase, Google APIs), `agents` for specialized behaviors, `cloudFunctions` for specific AI operations, and `middleware` for auth/error handling.
- **AI/ML**: Python models for diagnosis and red-flag detection located in `backend/models/` with `requirements.txt` and utility modules.
- **External Services**: Google Gemini (LLM), Google Maps (places/directions), Google Vision (OCR), Firebase (auth/database/storage), and optional GCP Cloud Functions style handlers.
- **CI/CD**: Basic pipeline scaffolding in `ci-cd/` with `pipeline.yml` and `deploy.sh`.

---

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Zod (validation), Helmet (security), express-rate-limit
- **AI/ML**: Python 3.x, common ML/Explainability libs (see `backend/models/requirements.txt`)
- **Infra/Integrations**: Firebase SDK, Google Gemini, Google Maps, Google Vision
- **Testing**: Jest/React Testing Library (frontend), Jest (backend), PyTest (models)

---

## Repository Structure
```
backend/
  agents/               # Autonomous agents (chatbot, ingestion, analysis, advisory, HITL)
  cloudFunctions/       # LLM calls, ambulance search, report processing, feedback
  config/               # Centralized runtime configuration
  middleware/           # Auth and error middleware
  models/               # Python ML models and utilities
  services/             # External service clients (Firebase, Gemini, Maps, Vision)
  utils/                # Logging, HTTP client, NLP helpers, request correlation
  tests/                # Backend and service tests
frontend/
  src/
    components/         # UI components, charts, cards, forms
    context/            # Auth + Theme providers
    pages/              # App pages (Dashboard, Chatbot, etc.)
    services/           # API client
    utils/              # UI helpers (date, confidence)
    tests/              # Unit and component tests
  public/               # Static assets
ci-cd/                  # Pipeline and deploy scripts
```

---

## Key Capabilities
- **Conversational AI**: `backend/agents/chatbotAgent.js` with `cloudFunctions/chatWithGemini.js` and `services/googleGeminiService.js`.
- **Daily Check-ins**: `frontend/src/pages/DailyCheckin.jsx` with validation and storage via backend.
- **Report Upload and Analysis**: `cloudFunctions/processReport.js`, Google Vision for OCR, Python explainability utils.
- **Risk & Red Flags**: `backend/models/redFlagModel.py`, `frontend/src/components/RedFlagAlert.jsx` and `RiskChart.jsx`.
- **Nearby Ambulance**: `cloudFunctions/findNearbyAmbulance.js` + Google Maps service.
- **Human in the Loop**: `agents/hitlAgent.js` and `cloudFunctions/submitFeedback.js`.

---

## Implementation Details

### Backend Request Flow
- Entry point: `backend/index.js` initializes Express, loads `config/config.js`, attaches `middleware/authMiddleware.js` (where required), and global `middleware/errorHandler.js`.
- Route handlers delegate to feature modules in `cloudFunctions/` and `agents/` which call service clients under `services/`.
- Common utilities used in flow:
  - `utils/requestId.js`: generates and attaches a per-request correlation id for logs.
  - `utils/logger.js`: structured logging at info/error levels across modules.

### HTTP Endpoints and Handlers
- Chat with LLM
  - Handler: `cloudFunctions/chatWithGemini.js`
  - Dependencies: `services/googleGeminiService.js`, optional `agents/chatbotAgent.js` for conversation orchestration.
  - Flow: validate input → build prompt/context → call Gemini → stream/return response.
- Analyze check-in / report processing
  - Handlers: `cloudFunctions/analyzeCheckin.js`, `cloudFunctions/processReport.js`
  - Dependencies: `services/googleVisionService.js` (OCR), Python models (`models/*`) via process invocation or service bridge.
  - Flow: validate input → optionally OCR documents → run risk/diagnosis models → compute explainability via `models/explainabilityUtils.py` → return structured summary.
- Nearby ambulance search
  - Handler: `cloudFunctions/findNearbyAmbulance.js`
  - Dependencies: `services/googleMapsService.js`
  - Flow: validate coordinates → call Places/Directions → map results → respond.
- Feedback submission (HITL)
  - Handler: `cloudFunctions/submitFeedback.js`
  - Dependencies: `agents/hitlAgent.js`, `services/firebaseService.js`
  - Flow: validate payload → persist feedback → optionally trigger learning/review pipeline.

Note: Exact route paths are declared in `backend/index.js`. Auth with `authMiddleware.js` is applied on protected routes.

### Agents
- `agents/chatbotAgent.js`: Orchestrates conversation state, templates, and tool-use. It formats prompts for `googleGeminiService.js`, post-processes responses, and can call domain tools (e.g., red-flag checks).
- `agents/ingestionAgent.js`: Handles ingestion of reports and check-ins, calling OCR and model utilities, ensuring data normalization before storage.
- `agents/analysisAgent.js`: Coordinates model inference (`models/diagnosisModel.py`, `models/redFlagModel.py`) and explainability output merging.
- `agents/advisoryAgent.js`: Generates clinician/patient facing guidance from model outputs and rules.
- `agents/hitlAgent.js`: Captures and routes human feedback signals to storage and analytics.

### Services
- `services/firebaseService.js`: Wraps Firebase Admin/Web SDK calls for auth, Firestore/Storage operations; centralizes initialization from `config/config.js`.
- `services/googleGeminiService.js`: Thin client to Gemini API; handles API key usage, model selection, safety settings, retries, and timeouts.
- `services/googleMapsService.js`: Places and Directions wrappers with input sanitation and result shaping.
- `services/googleVisionService.js`: OCR image/PDF inputs and returns normalized text blocks with confidence scores.

### Validation and Error Handling
- Input schemas live in `validations/inputValidation.js` and `validations/feedbackValidation.js` (Zod). Handlers validate early and return 400 on failure.
- Errors propagate to `middleware/errorHandler.js` which logs with `logger.js` and responds with sanitized messages. Avoid leaking provider errors to clients.

### Auth
- Frontend authenticates with Firebase (Email/Password by default) using `frontend/src/firebase.js` and `context/AuthContext.jsx` via `hooks/useUserAuth.js`.
- `frontend/src/services/api.js` adds `Authorization: Bearer <idToken>` to outgoing requests; falls back to `x-user-id: demo` in permissive dev mode.
- Backend `middleware/authMiddleware.js` verifies Firebase ID tokens when `firebase-admin` is configured; otherwise it accepts `x-user-id` for local testing.

### Python Models Integration
- Primary files: `backend/models/diagnosisModel.py`, `backend/models/redFlagModel.py`, `backend/models/explainabilityUtils.py`, entry script `backend/models/ai_service/main.py`.
- Typical flow: Node handler spawns/requests the Python service with input JSON → Python loads model artifacts (per `requirements.txt`) → returns predictions and explanations.

### Frontend Data Flow
- Routing and Pages: `frontend/src/pages/*` composed under `App.jsx` with protected routes via `components/ProtectedRoute.jsx`.
- State and Context: `context/AuthContext.jsx` manages auth state; `context/ThemeContext.jsx` manages theme.
- API Client: `src/services/api.js` centralizes base URL and auth header injection; components call lightweight functions here.
- Key UX Components:
  - `components/ChatbotConsole.jsx`: sends user prompts, renders streaming or complete responses.
  - `components/RedFlagAlert.jsx` + `components/RiskChart.jsx`: surface risk inferences in UI.
  - `pages/UploadReport.jsx`: file upload → backend OCR/analysis → show summary.

### Logging and Observability
- All backend modules use `utils/logger.js` with `requestId` for correlation. Extend with external sinks (e.g., Cloud Logging or Sentry) without changing call sites.

### Extending the System
- Add a new external provider: create a client in `services/`, expose minimal function surface, inject via handler/agent.
- Add a new agent: place under `agents/`, define clear inputs/outputs, and wire via a handler or background worker.
- New endpoint: define route in `index.js`, validate inputs with Zod, call agent/service, and return typed responses.

---

## Configuration Overview
Environment variables are split by app layer. See `backend/.env.example` and `frontend/.env.example`.
- Backend (examples):
  - `PORT`, `NODE_ENV`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
  - `GEMINI_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
  - `GOOGLE_VISION_API_KEY` (or service account usage)
  - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- Frontend (examples):
  - `VITE_API_BASE`
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, optional storage/messaging ids

---

## Development
- Install root deps if any, then per-app:
```bash
# Backend
cd backend
npm ci
npm run dev

# Frontend (new terminal)
cd frontend
npm ci
npm run dev
```
- Python models:
```bash
cd backend/models
python -m venv .venv
. .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

---

## Testing
- Backend JS: `backend/tests/*.test.js`
- Frontend: `frontend/src/tests/*`
- Models (Python): `backend/tests/models.test.py` and Python-level tests
```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# Models
cd backend && pytest
```

---

## Build & Deploy
- Frontend build:
```bash
cd frontend && npm run build
```
- Backend deploy: refer to `ci-cd/pipeline.yml` and `ci-cd/deploy.sh`. Typical steps include:
  - Build/test → provision env → push images/artifacts → run migrations (if any) → restart services.
- CI/CD secrets to configure: Firebase credentials, Google API keys, Gemini key, environment variables.

---

## Security & Compliance
- Use `helmet` and `express-rate-limit` (see `backend/middleware/`).
- Validate inputs with `zod` in validations.
- Store secrets in environment variables or secret managers; never commit credentials.
- Enable HTTPS end-to-end; prefer signed URLs for storage.

---

## Observability
- Centralized logging via `backend/utils/logger.js`.
- Add request correlation with `backend/utils/requestId.js`.
- Consider uptime monitoring, error tracking (Sentry), and metrics (Prometheus/Grafana) for production.

---

## Troubleshooting Tips
- 4xx/5xx errors: check `backend/middleware/errorHandler.js` logs.
- Auth issues: verify Firebase config and tokens in `authMiddleware.js`.
- Google API failures: verify keys and quotas; review `services/google*Service.js`.
- Model issues: validate Python env and dependency versions from `requirements.txt`.

---

## License and Credits
This project integrates Google Gemini, Maps, and Vision APIs, and Firebase. Review each service’s terms before production use.
