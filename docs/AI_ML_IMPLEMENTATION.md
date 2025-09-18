# AI/ML Implementation Guide

This document explains the AI/ML layer in this repository: service architecture, data flow, model logic, explainability, OCR/report extraction, and retraining stubs. It reflects the current code under `backend/models` (Python) and relevant Node helpers.

## Overview

- Runtime: Python FastAPI app served by Uvicorn (ASGI)
- Location: `backend/models/ai_service/main.py`
- Default dev port: `8090` (see `.env` → `AI_SERVICE_URL`)
- Consumers: Only the Node/Express backend calls this service; the frontend never calls it directly.

Key modules:
- `backend/models/diagnosisModel.py` — minimal PyTorch model + featurization
- `backend/models/redFlagModel.py` — simple red‑flag rule detector
- `backend/models/explainabilityUtils.py` — Captum/SHAP helpers (optional deps)
- `backend/models/ai_service/main.py` — FastAPI endpoints for inference and OCR extraction
- `backend/scripts/retrainModel.py` — stub retraining script based on feedback
- `backend/services/reportExtractionService.js` — Node-side OCR structuring helpers

## Service Endpoints (FastAPI)

File: `backend/models/ai_service/main.py`

- `GET /health`
  - Returns environment diagnostics: Python version, torch/cuda availability, whether the model is loaded, and whether Captum/SHAP are importable.

- `POST /analyze`
  - Input schema (`AnalyzeRequest`):
    - `notes`: optional clinical notes
    - `vitals`: map of vital signs
    - `labs`: map of lab values
    - `topK`: optional integer to restrict top diagnoses
    - `explainMethod`: `auto` | `captum` | `shap` | `none`
    - `useScipyWinsorize`: optional boolean to clamp outliers in features
  - Pipeline:
    1. Lazily load model via `get_model()` (global singleton; thread‑locked on forward pass).
    2. Featurize payload → `(1, 8)` tensor using `featurize_payload_to_tensor`.
    3. Predict softmax probabilities → top‑K labels (`Condition A/B/C`).
    4. Compute explainability for the top‑1 (Captum IG → SHAP → Grad×Input).
    5. Run red‑flag detection via `detect_red_flags`.
  - Output:
    - `diagnoses`: array of `{ label, confidence }`
    - `redFlags`: array of flagged conditions with rationale
    - `explainability`: attribution method, feature names, values
    - `latencyMs`: total processing time

- `POST /extract_from_pdf`
  - Input: `{ url, use_ocr, lang }`
  - Flow:
    - Downloads PDF bytes, extracts text with pdfminer by default.
    - Falls back to OCR (pdf2image + Tesseract) if forced or text is too short.
    - Runs lightweight regex parsing to pull basic metadata and a few labs.
  - Output: `{ ok, ocr: { text, method, pageCount, lang }, extracted: { meta, labs }, latencyMs }`

- `POST /extract_from_upload`
  - Input: `{ data: base64, mime, use_ocr, lang }`
  - Flow:
    - For PDFs: same as above (pdfminer → OCR fallback).
    - For images: OCR directly with Tesseract.
    - Regex‑based metadata/lab extraction (same helpers as `/extract_from_pdf`).
  - Output identical in shape to `/extract_from_pdf`.

## Model and Featurization

File: `backend/models/diagnosisModel.py`

- `DiagnosisModel`
  - Tiny feed‑forward network: `Linear(8→16) → ReLU → Linear(16→3)`
  - Returns class probabilities via `predict_proba` (softmax)
  - Device selection: CPU by default; CUDA if available

- `featurize_payload_to_tensor(payload, use_scipy_winsorize=False)`
  - Builds a fixed 8‑feature vector from `vitals` and `labs`:
    - `heartRate, systolicBP, diastolicBP, respiratoryRate, temperature, wbc, crp, glucose`
  - Optional winsorization when SciPy is available
  - Normalizes with static means/stds; returns `torch.tensor` of shape `(1, 8)`

Notes:
- If `torch` is unavailable at runtime, model inference falls back to a stub in the API that returns example confidences (demo mode).

## Red‑Flag Detection

File: `backend/models/redFlagModel.py`

- `detect_red_flags(payload)`
  - Simple rules; example implemented: temperature ≥ 39°C → `Hyperpyrexia`
  - Extend with more vitals/labs/symptoms as needed (e.g., hypotension, hypoxia, tachycardia).

## Explainability (XAI)

File: `backend/models/explainabilityUtils.py`

- Optional dependencies: Captum (Integrated Gradients) and SHAP
- `compute_attributions(model, x_tensor, target_index, method)`
  - Method selection:
    - `captum`: Integrated Gradients if available; else falls back to Grad×Input
    - `shap`: KernelExplainer on the first sample
    - `auto`: prefer Captum → SHAP → Grad×Input
- `summarize_attributions(obj)`
  - Returns the attribution payload passed in; the API composes `{ features, attributions, method }` before calling this.

Returned explainability object from `/analyze` includes:
- `available`: whether attributions were computed
- `method`: `auto`/`captum`/`shap`/`none`
- `features`: the feature names in order
- `attributions`: list of floats (same order as features)

## OCR and Report Extraction

Two pathways exist:

1) Python FastAPI endpoints (`/extract_from_pdf`, `/extract_from_upload`)
- Use `pdfminer` for text extraction, with OCR fallback via `pdf2image` + `pytesseract`.
- Extract minimal metadata (patientName, patientId, date) and a handful of labs via regex.

2) Node service `backend/services/reportExtractionService.js`
- Provides a richer, extensible extraction with:
  - 50+ lab regex patterns and confidence scoring
  - Reference ranges and derived status (`low`/`normal`/`high`)
  - Heuristics for meta fields (date/name/id/age/gender)
  - Optional LLM‑assisted extraction via Gemini (`maybeGeminiExtraction`)
- Exposes `extractStructuredFromOcr(text, { useLLM })` returning `{ meta, labs, diagnoses, medications }`.

Recommended usage:
- Prefer Node extraction in production for richer coverage and unified logging.
- Python endpoints are useful for local experiments and when the AI service already has the bytes in context.

## Retraining Stub

File: `backend/scripts/retrainModel.py`

- Looks for `feedback_export.json` in CWD
- Prints a small summary of the first few feedback items
- Intended to be replaced with a real pipeline: dataset creation, split, training, evaluation, and artifact versioning

## Running the AI Service Locally

From project root:

```bash
cd backend/models
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn ai_service.main:app --reload --port 8090
```

Verify: open `http://localhost:8090/health` or `http://localhost:8090/docs` (if Swagger UI is enabled).

## Extending the System

- Add features to `featurize_payload_to_tensor` and retrain the model accordingly.
- Expand `detect_red_flags` with clinically meaningful thresholds/rules.
- Improve explainability summaries: normalize, rank, and UI‑friendly formatting.
- Integrate real OCR pipelines (e.g., via the Node `googleVisionService.js`) and then use `extractStructuredFromOcr` to structure text.
- Build a proper training script using PyTorch Lightning or pure PyTorch with config/versioning.

## Security and Compliance Considerations

- Ensure PHI/PII in OCR text is handled securely and not logged in raw form.
- Keep the FastAPI service network‑restricted; only the Node backend should call it.
- Version model artifacts and include a minimal model card with metrics and caveats.
