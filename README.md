# 🏥 AI-Powered Diagnostic & Triage Support System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.x-yellow.svg)](https://python.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A comprehensive healthcare-focused application that provides AI-powered diagnostic assistance, conversational triage, and human-in-the-loop feedback systems for clinicians and patients.

## 🌟 Features

- **🤖 Conversational AI Triage**: Intelligent chatbot powered by Google Gemini for patient guidance
- **📊 Daily Health Check-ins**: Symptom monitoring and risk assessment with real-time analysis
- **📄 Report Analysis**: AI-assisted medical report processing with OCR and explainable insights
- **🚨 Red Flag Detection**: Automated identification of critical health indicators
- **🚑 Emergency Services**: Nearby ambulance lookup and emergency response integration
- **👥 Human-in-the-Loop**: Clinician feedback capture and continuous learning system
- **🔒 HIPAA-Compliant**: Built with healthcare security and compliance in mind

## 🏗️ Architecture

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for modern, responsive UI
- **Firebase Authentication** for secure user management
- **Chart.js & Recharts** for data visualization

### Backend
- **Node.js/Express** API server
- **Multi-agent system** for specialized healthcare tasks
- **Google Cloud Services** integration (Gemini, Maps, Vision)
- **Firebase** for authentication and data storage

### AI/ML Layer
- **Python-based models** for diagnosis and risk assessment
- **Explainable AI** with SHAP and Captum integration
- **OCR processing** for medical document analysis

## 🧠 AI/ML System Deep Dive

This section describes the AI/ML architecture, datasets, training/evaluation workflow, inference service, explainability, and operational concerns in detail.

### Overview
- **Purpose**: Provide risk-aware diagnostic assistance, red-flag detection, and explainable report insights to clinicians and patients.
- **Runtime**: Python 3.x (FastAPI/UVicorn) service exposed to the Node.js backend via `AI_SERVICE_URL`.
- **Core components**:
  - **`backend/models/diagnosisModel.py`**: Diagnosis and risk scoring logic.
  - **`backend/models/redFlagModel.py`**: Critical condition patterning and alerts.
  - **`backend/models/explainabilityUtils.py`**: SHAP/Captum explainability helpers.
  - **`backend/models/ai_service/main.py`**: FastAPI app that serves inference and explanations.
  - **`backend/scripts/retrainModel.py`**: Offline training/retraining script.
  - **`backend/services/reportExtractionService.js`** + **Google Vision**: OCR text extraction for uploaded reports.

### Data and Features
- **Data sources**:
  - Patient-reported symptoms from Daily Check-ins.
  - Uploaded clinical reports (PDF/images) parsed via OCR.
  - Chat interaction snippets (sanitized) for symptom cues.
- **Feature categories**:
  - Demographic/contextual: age band, sex (if provided), encounter type.
  - Symptom vectors: binary or scaled severity for common symptoms.
  - Document-derived terms: TF/IDF or key-phrase indicators from OCR.
  - Temporal aggregates: recent symptom trends from Activity Feed.
- **Preprocessing**:
  - Text normalization (lowercasing, punctuation, unicode cleanup).
  - Medical keyword extraction and lemmatization.
  - Robust missing-value handling and safe defaulting for sparse inputs.

### Modeling Approach
- **Diagnosis/Risk model** (`diagnosisModel.py`):
  - Classical ML (e.g., logistic-style risk scoring or tree ensemble) optimized for interpretability and stability.
  - Outputs include: per-condition risk scores, top-n candidates, and overall confidence.
- **Red-flag model** (`redFlagModel.py`):
  - Rule-augmented classifier that emphasizes sensitivity for urgent conditions.
  - Produces binary/ordinal flags and supporting evidence snippets.
- **Why classical-first**: predictable behavior, simple calibration, low-latency CPU inference, and easier explainability.

### Explainability (XAI)
- **Global and local explanations** with SHAP and Captum:
  - SHAP values to quantify each feature’s contribution to predictions.
  - Captum attribution (Integrated Gradients/GradientSHAP) for NN variants if introduced later.
- **Outputs**:
  - Per-prediction feature importances (JSON) consumable by frontend (e.g., `ReportSummary`, `RiskChart`).
  - Highlighted terms from OCR text contributing to risk/flags.
- **Safeguards**:
  - Explanation truncation for UI readability.
  - PHI/PII redaction enforcement before logging or UI surfacing.

### Inference Service
- **Location**: `backend/models/ai_service/main.py` (FastAPI)
- **Default port**: `8090` (set in `.env` as `AI_SERVICE_URL`)
- **Example startup**:
  ```bash
  cd backend/models
  uvicorn ai_service.main:app --reload --port 8090
  ```
- **Representative endpoints** (paths may be organized inside `main.py`):
  - `POST /inference/diagnose` → inputs: normalized symptoms, OCR text; outputs: ranked diagnoses with confidences.
  - `POST /inference/red-flags` → inputs: same as above; outputs: red-flag labels with evidences.
  - `POST /inference/explain` → inputs: model request + chosen label; outputs: SHAP/Captum attributions.
- **Contracts**:
  - All requests/responses are JSON.
  - Backend server (`Node.js`) is the sole client; frontend never calls AI service directly.

### Training & Retraining
- **Script**: `backend/scripts/retrainModel.py`
- **Workflow**:
  1. Ingest labeled datasets (ensure de-identified).
  2. Split train/val/test with stratification; fix random seeds for reproducibility.
  3. Feature build: mirror production transform pipeline.
  4. Model train: search limited hyperparams (ensure time-bounded).
  5. Evaluate: AUROC/PR, calibration, red-flag sensitivity/PPV.
  6. Export: persist model artifacts with version tags (e.g., `models/<name>-vX.pkl`).
  7. Smoke-test inference parity on holdout and golden cases.
- **Reproducibility**:
  - Pin Python deps in `backend/models/requirements.txt`.
  - Save random seeds and config snapshots alongside artifacts.
  - Keep a minimal model card (YAML/Markdown) with metrics and caveats.

### Evaluation & Monitoring
- **Validation metrics**:
  - Diagnosis: AUROC, AUPRC, Top-k accuracy, ECE calibration.
  - Red flags: Sensitivity-first, specificity, PPV, false-negative tracking.
- **Data drift checks** (planned): PSI/WoE on key features; alert thresholds.
- **Runtime monitoring**:
  - Latency and error-rate SLOs surfaced in backend logs.
  - Periodic canary requests with expected outputs.

### Performance & Scaling
- **Latency targets**: p95 < 300ms CPU-only for typical inputs.
- **Batching**: Single-request optimized; micro-batching optional behind queue if volume increases.
- **Resource modes**:
  - CPU default; GPU optional if deep models introduced.
  - Thread-safe model objects preloaded at process start to avoid cold load.

### Security, Privacy, Compliance
- **PHI/PII handling**:
  - Only de-identified data feeds training.
  - At inference, personally identifying text is not persisted.
- **Access control**:
  - AI service is network-restricted; only backend can reach it.
  - Firebase auth enforced at backend API; tokens never forwarded to AI service.
- **Auditability**:
  - Minimal, non-sensitive request fingerprints and model version IDs in logs.
  - Versioned artifacts + model card to trace prediction provenance.

### Failure Modes & Fallbacks
- **Low confidence**: degrade to safe advice, prompt HITL (`hitlAgent.js`).
- **Model service down**: backend returns graceful error with retry hints.
- **Explainability failure**: return prediction without attributions and log warning.

### Local Development Tips
- Keep `.venv` activated when working in `backend/models`.
- If adding new models:
  - Extend `requirements.txt` with pinned versions.
  - Encapsulate feature transforms for reuse across train/inference.
  - Add unit tests around transforms and scorer logic.
- If expanding explainability:
  - Add slim adapters to `explainabilityUtils.py` to decouple methods.
  - Limit attribution runtime; timebox to keep p95 acceptable.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.x
- Firebase project
- Google Cloud Platform account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EvolveAI_AgenticSprint-_Code_Soul
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   
   # Install Python dependencies
   cd ../backend/models
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**

   Create `.env` in the root directory:
   ```env
   # Backend Configuration
   PORT=8080
   NODE_ENV=development
   GOOGLE_API_KEY=your_google_maps_api_key
   GEMINI_API_KEY=your_gemini_api_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   AI_SERVICE_URL=http://localhost:8090
   ```

   Create `frontend/.env`:
   ```env
   # Frontend Configuration
   VITE_API_BASE=http://localhost:8080
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Start the application**
   ```bash
   # Start all services
   npm run start:all
   
   # Or start individually:
   # Backend only
   npm run start:backend
   
   # Frontend only  
   npm run start:frontend
   
   # Python AI service
   cd backend/models
   uvicorn ai_service.main:app --reload --port 8090
   ```

## 📁 Project Structure

```
├── backend/                    # Node.js backend server
│   ├── agents/                # AI agents (chatbot, analysis, advisory)
│   ├── cloudFunctions/        # API endpoints and business logic
│   ├── config/                # Configuration management
│   ├── middleware/            # Authentication and error handling
│   ├── models/                # Python ML models and AI services
│   ├── services/              # External service integrations
│   ├── utils/                 # Utility functions and helpers
│   └── validations/           # Input validation schemas
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Application pages
│   │   ├── context/          # React context providers
│   │   ├── services/         # API client services
│   │   └── utils/            # Frontend utilities
│   └── public/               # Static assets
└── docs/                     # Documentation
```

## 🔧 API Endpoints

### Core Endpoints

- `POST /api/analyze` - Analyze patient data and generate diagnoses
- `POST /functions/chat` - Conversational AI chat interface
- `POST /functions/processReport` - Process and analyze medical reports
- `POST /functions/findNearbyAmbulance` - Emergency services lookup
- `POST /functions/submitFeedback` - Human-in-the-loop feedback

### Authentication
Most endpoints require Firebase authentication via `Authorization: Bearer <token>` header.


## 🚀 Deployment

### Frontend Build
```bash
cd frontend && npm run build
```

### Backend Deployment
The application is designed for cloud deployment with:
- Environment variable configuration
- Docker containerization support
- CI/CD pipeline integration

### Deploy to Render

This repo includes `render.yaml` to deploy a single Web Service that builds the frontend and serves it from the backend.

1. Push your repo to GitHub/GitLab.
2. In Render, click New → Blueprint and select your repo.
3. Review the plan and service named `evolveai-backend` and create resources.
4. Set environment variables (in Render dashboard → Service → Environment):
   - `GOOGLE_API_KEY` (secret)
   - `GEMINI_API_KEY` (secret)
   - `GEMINI_MODEL` (optional, default `gemini-2.0-flash`)
   - `FIREBASE_PROJECT_ID`
   - `AI_SERVICE_URL` (optional; URL of Python AI service if used)
   - `ALLOWED_ORIGINS` (set to your Render app URL, e.g., `https://<your-service>.onrender.com`)
   - `DEV_ALLOW_ALL_CORS` = `false`

Build and start are handled automatically by Render using `render.yaml`:

```yaml
buildCommand: |
  npm ci --prefix frontend
  npm run build --prefix frontend
  npm ci --prefix backend
startCommand: npm start --prefix backend
healthCheckPath: /health
```

Notes:
- The backend serves the built frontend from `frontend/dist` in production.
- API base on the frontend is relative in production, so no extra config is needed.
- Ensure the Python AI service is reachable from Render if `AI_SERVICE_URL` is set.

## 🔒 Security & Compliance

- **HIPAA-aligned** architecture with proper data handling
- **Input validation** using Zod schemas
- **Rate limiting** and security headers
- **Firebase Authentication** for secure access
- **Environment-based** secret management

## 🛠️ Development

### Adding New Features
1. Create agent in `backend/agents/`
2. Add API endpoint in `backend/cloudFunctions/`
3. Implement frontend component in `frontend/src/components/`
4. Add validation in `backend/validations/`

### External Service Integration
- **Google Gemini**: Conversational AI and analysis
- **Google Maps**: Location services and emergency lookup
- **Google Vision**: OCR for document processing
- **Firebase**: Authentication and data storage

## 📚 Documentation

- [API Documentation](backend/docs/apiDocumentation.md)
- [Project Overview](PROJECT_OVERVIEW.md)
- [AI Libraries Guide](docs/ai-libraries.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Follow coding standards and add documentation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Important Notes

- **Google API Keys**: Ensure you have the necessary API keys and quotas configured
- **Firebase Setup**: Complete Firebase project configuration before deployment
- **Python Environment**: Use virtual environments for Python dependencies
- **CORS Configuration**: Backend is configured for `http://localhost:5173` (Vite dev server)

## 🆘 Troubleshooting

### Common Issues
- **Authentication errors**: Verify Firebase configuration and API keys
- **CORS issues**: Check backend CORS settings for your frontend URL
- **Python service errors**: Ensure virtual environment is activated and dependencies installed
- **API rate limits**: Check Google Cloud quotas and billing

### Support
For issues and questions, please check the documentation or create an issue in the repository.

---

**⚠️ Disclaimer**: This system is designed for healthcare assistance and should be used in conjunction with professional medical advice. Always consult qualified healthcare professionals for medical decisions.