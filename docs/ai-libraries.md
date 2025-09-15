## AI libraries in this codebase

This document explains how the core AI/ML libraries are used in the repository, with links to the relevant modules.

- **PyTorch (`torch`)**: Primary tensor and neural network runtime.
  - Used to define and run the triage model in `backend/models/diagnosisModel.py` (`nn.Module`, `nn.Sequential`, tensor ops, softmax inference).
  - Device management in `backend/models/diagnosisModel.py` and `backend/models/ai_service/main.py` chooses CPU or CUDA if available and moves inputs to the model device.
  - Inference is exposed via `predict_proba(...)`, returning probabilities for 3 demo conditions.
  - The FastAPI microservice in `backend/models/ai_service/main.py` lazily instantiates a global `DiagnosisModel` and performs batched inference on the `/analyze` endpoint.
  - If PyTorch is not installed at runtime, code paths gracefully fall back to deterministic stub outputs so the app remains runnable.

- **Captum**: Model interpretability on top of PyTorch (optional dependency).
  - In `backend/models/explainabilityUtils.py`, `IntegratedGradients` is used when available to compute per-feature attributions for the top prediction.
  - If Captum is unavailable, the code falls back to a simple gradients×input method.
  - Attributions are surfaced by `/analyze` in `backend/models/ai_service/main.py` under the `explainability` field.

- **SHAP**: Listed for potential explainability, not currently wired in the demo flow.
  - Declared in `backend/models/requirements.txt` but not directly imported in the current Python modules.
  - Can be integrated in the future to provide model-agnostic explanations; current implementation relies on Captum/gradient methods instead.

- **SciPy**: Utility scientific routines (future-proofing).
  - Present in `backend/models/requirements.txt` to support potential preprocessing or signal/statistical utilities. Not directly imported in current modules.

- **FastAPI + Uvicorn**: Serving layer for the AI service.
  - `backend/models/ai_service/main.py` defines a small FastAPI app exposing:
    - `GET /health`: reports PyTorch/CUDA availability and model device.
    - `POST /analyze`: featurizes inputs, runs the PyTorch model, returns top-K diagnoses and explainability.
  - `uvicorn` runs the service locally; see the `__main__` guard in the same file.

### Data flow summary
1. Request JSON arrives at `/analyze` → parsed into `AnalyzeRequest`.
2. `featurize_payload_to_tensor(...)` in `backend/models/diagnosisModel.py` converts vitals/labs into an 8-dim normalized tensor.
3. Tensor is moved to the model device; `DiagnosisModel.predict_proba(...)` returns class probabilities using PyTorch ops.
4. Top-K predictions are selected; optional Captum-based attributions computed for the top class.
5. Response bundles `diagnoses`, `redFlags` (from `backend/models/redFlagModel.py`), and `explainability`.

### Installation and runtime notes
- Python deps for the AI service are listed in `backend/models/requirements.txt`.
- PyTorch and Captum are optional at runtime in this repo; if missing, the service can still return stub predictions and disable explainability.
- For GPU acceleration, install a CUDA-enabled PyTorch build and ensure `torch.cuda.is_available()` reports true.

### Quick pointers to source
- Model: `backend/models/diagnosisModel.py`
- Explainability: `backend/models/explainabilityUtils.py`
- Service API: `backend/models/ai_service/main.py`
- Requirements: `backend/models/requirements.txt`


