# Codebase Structure and Component Importance

This document explains how the repository is organized, what each part does in the system, and why it matters. Use this as a quick orientation guide when navigating or modifying the project.

## Top-level Overview

- `backend/` — Node.js/Express backend API, domain logic, integrations, and middleware.
- `frontend/` — React (Vite) web application, UI components, pages, context, and client services.
- `docs/` — Developer and user documentation (architecture, AI libraries, guides).
- `README.md` — End-to-end overview, setup, run, and deployment instructions.
- `render.yaml` — Render.com blueprint to build and deploy the app (backend serving built frontend).
- `package.json` — Root npm scripts for orchestrating dev workflows across packages.
- `requirements.txt` — Reference-only mirror of Python deps (do not install from here).

## Backend (`backend/`)

High-level: Hosts the HTTP API used by the frontend, orchestrates multi-agent features, validates input, integrates with external services (Gemini, Maps, Vision, Firebase), and calls the Python AI service for inference/explainability.

- `index.js`
  - Purpose: Application entrypoint that configures Express, middleware, routes, static serving (production), health checks, and CORS.
  - Importance: Central bootstrap and HTTP lifecycle management for the server.

- `agents/`
  - Files: `chatbotAgent.js`, `analysisAgent.js`, `advisoryAgent.js`, `ingestionAgent.js`, `hitlAgent.js`.
  - Purpose: Encapsulate distinct agent behaviors (chat, analysis, advisory recommendations, data ingestion, human-in-the-loop feedback).
  - Importance: Keeps complex workflows modular; enables targeted iteration and testing per capability.

- `cloudFunctions/`
  - Files: `analyzeCheckin.js`, `processReport.js`, `riskSeries.js`, `chatWithGemini.js`, `findNearbyAmbulance.js`, `generateReportSummary.js`, `submitFeedback.js`, `index.js`.
  - Purpose: Route handlers and business logic for API endpoints.
  - Importance: Defines the public API surface; main place where request validation, orchestration, and responses happen.

- `middleware/`
  - Files: `authMiddleware.js`, `errorHandler.js`.
  - Purpose: Cross-cutting concerns like authentication/authorization, error normalization.
  - Importance: Enforces security and consistent error semantics across endpoints.

- `services/`
  - Files: `googleGeminiService.js`, `googleMapsService.js`, `googleVisionService.js`, `firebaseService.js`, `cacheService.js`, `reportExtractionService.js`.
  - Purpose: Integrations and service adapters to external systems and shared infrastructure.
  - Importance: Abstracts third-party dependencies to keep business logic clean and testable.

- `utils/`
  - Files: `logger.js`, `httpClient.js`, `dataProcessing.js`, `dataValidation.js`, `nlpHelpers.js`, `requestId.js`.
  - Purpose: Shared helpers for logging, HTTP, data transforms, and NLP utilities.
  - Importance: Reduces duplication; centralizes common patterns and conventions.

- `validations/`
  - Files: `inputValidation.js`, `feedbackValidation.js`.
  - Purpose: Zod (or similar) schemas and validation logic for incoming payloads.
  - Importance: Protects APIs from malformed/unsafe input; improves reliability.

- `config/`
  - Files: `config.js`.
  - Purpose: Centralized configuration (env vars, defaults, feature flags).
  - Importance: Ensures consistent config access and simplifies env-based behavior.

- `docs/`
  - Files: `apiDocumentation.md`.
  - Purpose: Backend-specific API documentation for developers and integrators.
  - Importance: Reference for route contracts and expected payloads.

- `models/`
  - Files: `diagnosisModel.py`, `redFlagModel.py`, `explainabilityUtils.py`, `ai_service/main.py`, `requirements.txt`.
  - Purpose: Python AI/ML components — inference service (FastAPI), risk/diagnosis logic, red-flag rules, and explainability utilities.
  - Importance: Core intelligence of the platform; decoupled via HTTP from Node backend for scalability and language-appropriate tooling.

- `scripts/`
  - Files: `retrainModel.py`, `dataBackup.js`.
  - Purpose: Operational scripts for model lifecycle and maintenance.
  - Importance: Supports continuous improvement and data hygiene.

- `package.json`, `package-lock.json`, `nodemon.json`
  - Purpose: Backend package management, lockfile, and dev tooling configuration.
  - Importance: Reproducible dev environment and hot-reload during development.

## Frontend (`frontend/`)

High-level: React app built with Vite and Tailwind, authenticated via Firebase, consuming backend APIs to render dashboards, triage flows, and report analysis.

- `src/`
  - `main.jsx`, `index.js`, `App.jsx`
    - Purpose: App bootstrap, router mount, and global providers.
    - Importance: Wiring point for the entire UI and routing graph.
  - `pages/` — `Dashboard.jsx`, `DailyCheckin.jsx`, `UploadReport.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `Profile.jsx`, `Home.jsx`, `NotFound.jsx`
    - Purpose: Route-level screens that compose components and business flows.
    - Importance: Defines user journeys and major features.
  - `components/`
    - Purpose: Reusable UI blocks (charts, chatbot, alerts, layout, etc.).
    - Importance: Enforces visual consistency and speeds development.
    - Notables: `ChatbotWidget.jsx`, `RiskChart.jsx`, `ReportSummary.jsx`, `RedFlagAlert.jsx`, `ui/` primitives (`Button.jsx`, `Card.jsx`, `Input.jsx`, `Spinner.jsx`, `Skeleton.jsx`, `ToastProvider.jsx`).
  - `context/` — `AuthContext.jsx`, `ThemeContext.jsx`
    - Purpose: Global state/providers for auth and theme.
    - Importance: Centralized state and cross-cutting UI concerns.
  - `services/` — `api.js`
    - Purpose: API client and request helpers.
    - Importance: Single place to configure base URL, headers, and error handling.
  - `utils/` — `formatDate.js`, `calculateConfidence.js`, `scoreHelpers.js`, `firebaseErrorMessages.js`
    - Purpose: Presentation-friendly utilities and score calculations.
    - Importance: Keeps components lean and focused on rendering.
  - `i18n/` — `translations.js`
    - Purpose: Translation resources.
    - Importance: Internationalization readiness.
  - `styles/` — `tailwind.css`
    - Purpose: Tailwind CSS base and utilities.
    - Importance: Styling system configuration.

- `public/`
  - Purpose: Static assets (e.g., favicon) copied to the build output.
  - Importance: Branding assets and public files.

- `dist/`
  - Purpose: Production build output served by the backend in production.
  - Importance: Artifact used during deployment; do not edit manually.

- `vite.config.js`, `tailwind.config.js`, `postcss.config.cjs`, `package.json`, `package-lock.json`
  - Purpose: Build toolchain, styling pipeline, and package management.
  - Importance: Controls dev experience and production bundle quality.

## Documentation (`docs/`)

- `CODEBASE_INDEX.md`, `projectOverview.md`
  - Purpose: High-level repository map and project context.
  - Importance: Onboarding guide and orientation.
- `ai-libraries.md`, `pytorch.md`, `scipy.md`, `shap.md`, `captum.md`
  - Purpose: References and tips for AI/ML libraries used by the Python service.
  - Importance: Aids model development and explainability work.

## Root Configuration and Deployment

- `README.md`
  - Purpose: Architecture, setup, run, and deployment instructions (including AI service usage and endpoints).
  - Importance: Source of truth for getting started and operating locally/in cloud.

- `render.yaml`
  - Purpose: Render.com blueprint to build frontend, install backend, start backend, and set env vars.
  - Importance: One-click blueprint-style deployment; ensures consistent CI-like build.

- `package.json` (root)
  - Purpose: Orchestrates common scripts to run both frontend and backend.
  - Importance: Developer ergonomics for local development and combined startup.

- `requirements.txt` (root)
  - Purpose: Reference-only mirror of Python dependencies.
  - Importance: Documentation aid. Do not install from here; use `backend/models/requirements.txt`.

## Runtime Contracts and Data Flow

1. Frontend calls the Backend using the configured API base (dev: `http://localhost:8080`).
2. Backend authenticates requests (Firebase), validates input, and orchestrates services.
3. Backend calls the Python AI service (FastAPI, default `8090`) for inference and explanations when needed.
4. Responses (including risk scores, red-flag alerts, summaries) are returned to the Frontend for display.

## Getting Started (Pointers)

- Environment variables
  - Root `.env`: `PORT`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `AI_SERVICE_URL=http://localhost:8090`.
  - Frontend `frontend/.env`: `VITE_API_BASE=http://localhost:8080` plus Firebase keys.
- Local run
  - Frontend: `npm run start:frontend`
  - Backend: `npm run start:backend`
  - AI service: `uvicorn ai_service.main:app --reload --port 8090` (from `backend/models`)

## Why This Structure Works

- Clear separation of concerns: UI (React), API/orchestration (Node), Intelligence (Python).
- Testability and modularity: agents, services, and utils keep logic isolated.
- Deployability: backend serves static frontend in production for a simpler footprint.
- Scalability: Python AI service is independently deployable and horizontally scalable.


