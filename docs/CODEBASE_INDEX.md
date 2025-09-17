## Codebase Index

This document provides a high-level map of the repository to help you quickly locate key files, modules, and scripts.

### Top-level
- **Root scripts** (`package.json`):
  - `start:backend`: Start Node backend (installs deps first)
  - `start:frontend`: Start React dev server
  - `build:frontend`: Build frontend
  - `start:all`: Build frontend, then start backend
- **Docs**: `docs/` general guides; `backend/docs/apiDocumentation.md`
- **Apps**: `backend/` (Node/Express API + cloud functions + Python models), `frontend/` (React + Vite)

### Backend (`backend/`)
- **Entry**: `backend/index.js` (Express app, CORS/Helmet, rate limit, routes, SPA serving)
- **Config**: `backend/config/config.js` (env, allowed origins, Python AI service URL)
- **Middleware**: `backend/middleware/`
  - `authMiddleware.js` (Firebase auth guard)
  - `errorHandler.js` (centralized error handler)
- **Agents**: `backend/agents/`
  - `ingestionAgent.js` (normalize input)
  - `analysisAgent.js` (risk/diagnosis logic)
  - `advisoryAgent.js` (advice generation)
  - `chatbotAgent.js`, `hitlAgent.js` (chatbot, human-in-the-loop)
- **Cloud functions (routes)**: `backend/cloudFunctions/`
  - `analyzeCheckin.js`, `processReport.js`, `chatWithGemini.js`
  - `findNearbyAmbulance.js`, `submitFeedback.js`, `generateReportSummary.js`
- **Services**: `backend/services/`
  - `firebaseService.js`, `googleGeminiService.js`, `googleMapsService.js`, `googleVisionService.js`, `reportExtractionService.js`, `cacheService.js`
- **Utils**: `backend/utils/` (`httpClient.js`, `logger.js`, `requestId.js`, `dataProcessing.js`, `dataValidation.js`, `nlpHelpers.js`)
- **Validations**: `backend/validations/` (`inputValidation.js`, `feedbackValidation.js`)
- **Python AI service**: `backend/models/`
  - `ai_service/main.py` (FastAPI/uvicorn service), `requirements.txt`
  - `diagnosisModel.py`, `redFlagModel.py`, `explainabilityUtils.py`
- **Scripts**: `backend/scripts/` (`dataBackup.js`, `retrainModel.py`)
- **Package**: `backend/package.json`
  - Scripts: `start`, `dev`, `test`
  - Deps: express, cors, helmet, axios, multer, @google-cloud/vision, pdf-parse, zod, express-rate-limit

#### Backend routes and endpoints
- Health: `GET /health`
- Core API:
  - `POST /api/analyze` (validates -> Python `AI_SERVICE_URL` if available -> agents)
  - `POST /api/pdf-extract` (proxies to Python service `extract_from_pdf`)
  - `GET /api/ai/health` (checks Python service health)
- Cloud-function style:
  - `POST /functions/analyzeCheckin`
  - `POST /functions/processReport`
  - `POST /functions/chat`
  - `GET /functions/findNearbyAmbulance`
  - `POST /functions/submitFeedback`
  - `POST /functions/generateReportSummary`

### Frontend (`frontend/`)
- **Build/dev**: Vite; Tailwind CSS
- **Entry**: `src/main.jsx` (React root with `BrowserRouter`, providers)
- **App shell**: `src/App.jsx` (routes, layout)
- **Routing**:
  - `/` → `Dashboard` (protected)
  - `/daily-checkin` → `DailyCheckin` (protected)
  - `/upload-report` → `UploadReport` (protected)
  - `/profile` → `Profile` (protected)
  - `/login` → `LoginPage`, `/signup` → `SignupPage`
  - `*` → `NotFound`
- **Contexts**: `src/context/` (`AuthContext.jsx`, `ThemeContext.jsx`)
- **Firebase**: `src/firebase.js` (client setup)
- **Services**: `src/services/api.js` (backend API calls)
- **Components**: `src/components/`
  - UI: `ui/Button.jsx`, `ui/Input.jsx`, `ui/Card.jsx`, `ui/Skeleton.jsx`, `ui/Spinner.jsx`, `ui/Textarea.jsx`, `ui/ToastProvider.jsx`
  - Domain: `Navbar.jsx`, `Footer.jsx`, `RiskChart.jsx`, `DiagnosisList.jsx`, `ReportSummary.jsx`, `RedFlagAlert.jsx`, `ChatbotConsole.jsx`, `ChatbotWidget.jsx`, `ProtectedRoute.jsx`, `ActivityFeed.jsx`, `QuickActions.jsx`, `Hero.jsx`, `StatCard.jsx`
- **Pages**: `src/pages/` (`Dashboard.jsx`, `DailyCheckin.jsx`, `UploadReport.jsx`, `ChatbotPage.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `Profile.jsx`, `NotFound.jsx`)
- **Hooks/Utils**: `hooks/useUserAuth.js`, `utils/*` (formatDate, scoreHelpers, etc.)
- **Styles**: `styles/tailwind.css`, `tailwind.config.js`, `postcss.config.cjs`
- **i18n**: `i18n/translations.js`
- **Vite**: `vite.config.js`

### Root scripts and tooling
```json
// package.json
{
  "scripts": {
    "start:backend": "cd backend && npm install && npm run start",
    "start:frontend": "cd frontend && npm install && npm run dev",
    "build:frontend": "cd frontend && npm install && npm run build",
    "start:all": "npm run build:frontend && npm run start:backend"
  },
  "engines": { "node": ">=18.0.0" }
}
```

### Getting started
- Install: root `npm install`; then `backend` and `frontend` installs per README
- Env: root `.env` and `frontend/.env` as documented in `README.md`
- Run:
  - Dev: `npm run start:frontend` (Vite), `npm run start:backend`
  - All: `npm run start:all` (builds frontend, serves via backend in prod mode)
  - Python AI service: `uvicorn backend/models/ai_service.main:app --reload --port 8090`

### Cross-cutting concerns
- **Auth**: Firebase (frontend `AuthContext.jsx`, backend `authMiddleware.js`)
- **Security**: Helmet CSP, rate limiting, input validation (`zod`)
- **Observability**: `utils/logger.js`, `utils/requestId.js`
- **ML Integration**: Optional Python service proxied by backend

---
Last updated: automated index generation.


