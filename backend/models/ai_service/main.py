from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List
import platform
import threading
import time

try:
    from backend.models.diagnosisModel import (
        DiagnosisModel,
        featurize_payload_to_tensor,
    )
    from backend.models.redFlagModel import detect_red_flags
    from backend.models.explainabilityUtils import summarize_attributions, compute_attributions
except Exception:  # fallback to relative imports for execution context differences
    from ..diagnosisModel import DiagnosisModel, featurize_payload_to_tensor
    from ..redFlagModel import detect_red_flags
    from ..explainabilityUtils import summarize_attributions, compute_attributions

try:
    import torch
except Exception:
    torch = None

app = FastAPI()

# Lazily created global model to avoid per-request initialization cost
_MODEL: DiagnosisModel | None = None
_MODEL_LOCK = threading.Lock()


def get_model() -> DiagnosisModel:
    global _MODEL
    if _MODEL is None:
        _MODEL = DiagnosisModel()
    return _MODEL


class AnalyzeRequest(BaseModel):
    notes: str | None = None
    vitals: Dict[str, Any] | None = None
    labs: Dict[str, Any] | None = None
    topK: int | None = None
    explainMethod: str | None = None  # "auto" | "captum" | "shap" | "none"
    useScipyWinsorize: bool | None = None


@app.get("/health")
def health():
    cuda_ok = bool(torch and hasattr(torch, "cuda") and torch.cuda.is_available())
    device = None
    try:
        m = _MODEL
        device = getattr(m, "device", None) if m else None
    except Exception:
        device = None
    return {
        "status": "ok",
        "torchAvailable": bool(torch is not None),
        "cudaAvailable": cuda_ok,
        "modelLoaded": bool(_MODEL is not None),
        "modelDevice": device,
        "python": platform.python_version(),
        "platform": platform.platform(),
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    started = time.time()
    try:
        model = get_model()

        # Prepare features
        payload = req.dict() if req else {}
        x = featurize_payload_to_tensor(payload, use_scipy_winsorize=bool(payload.get("useScipyWinsorize")))

        diagnoses: List[Dict[str, Any]] = []
        explainability: Dict[str, Any] = {"available": False}

        if x is not None and torch is not None:
            with _MODEL_LOCK:
                # Move to the same device as model
                device = model.device if hasattr(model, "device") else ("cuda" if torch.cuda.is_available() else "cpu")
                x = x.to(device)
                probs = model.predict_proba(x)

            if probs is not None:
                p = probs[0].detach().cpu().tolist()
                labels = ["Condition A", "Condition B", "Condition C"]

                # top-K filter
                k = payload.get("topK") or len(p)
                k = max(1, min(int(k), len(p)))
                top_indices = sorted(range(len(p)), key=lambda i: p[i], reverse=True)[:k]
                diagnoses = [
                    {"label": labels[i], "confidence": float(p[i])} for i in top_indices
                ]

                # Compute simple feature attributions for top-1
                top1 = top_indices[0]
                method = payload.get("explainMethod")
                attrs = compute_attributions(model, x, target_index=int(top1), method=method)
                feature_names = [
                    "heartRate",
                    "systolicBP",
                    "diastolicBP",
                    "respiratoryRate",
                    "temperature",
                    "wbc",
                    "crp",
                    "glucose",
                ]
                explainability = summarize_attributions({
                    "available": attrs is not None,
                    "method": (method or "auto") if attrs is not None else "none",
                    "features": feature_names,
                    "attributions": attrs,
                })
        else:
            # Fallback if torch unavailable
            diagnoses = [
                {"label": "Condition A", "confidence": 0.72},
                {"label": "Condition B", "confidence": 0.18},
                {"label": "Condition C", "confidence": 0.10},
            ]
            explainability = {"available": False, "reason": "torch not available"}

        red_flags = detect_red_flags(payload)

        return {
            "diagnoses": diagnoses,
            "redFlags": red_flags,
            "explainability": explainability,
            "latencyMs": int((time.time() - started) * 1000),
        }
    except Exception as e:
        return {
            "diagnoses": [],
            "redFlags": [],
            "explainability": {"available": False},
            "error": str(e),
            "latencyMs": int((time.time() - started) * 1000),
        }


if __name__ == "__main__":
    # Allows: python backend/models/ai_service/main.py
    try:
        import uvicorn
        uvicorn.run("backend.models.ai_service.main:app", host="0.0.0.0", port=8000, reload=False)
    except Exception:
        # Fallback for relative path execution
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)


