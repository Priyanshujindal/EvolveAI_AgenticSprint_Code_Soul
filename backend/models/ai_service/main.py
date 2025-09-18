from fastapi import FastAPI
from pydantic import BaseModel
from typing import Any, Dict, List
import platform
import threading
import time
import io
import re
import base64

try:
    import requests
    from pdfminer.high_level import extract_text as pdfminer_extract_text
    from pdf2image import convert_from_bytes
    import pytesseract
    from PIL import Image
except Exception:
    requests = None
    pdfminer_extract_text = None
    convert_from_bytes = None
    pytesseract = None
    Image = None

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
class PdfExtractRequest(BaseModel):
    url: str
    use_ocr: bool | None = None  # True: force OCR, False: never OCR, None: auto-fallback
    lang: str | None = None      # e.g., 'eng', 'hin', 'eng+hin'
class UploadExtractRequest(BaseModel):
    data: str  # base64 of binary
    mime: str | None = None
    use_ocr: bool | None = None
    lang: str | None = None



@app.get("/health")
def health():
    cuda_ok = bool(torch and hasattr(torch, "cuda") and torch.cuda.is_available())
    device = None
    try:
        m = _MODEL
        device = getattr(m, "device", None) if m else None
    except Exception:
        device = None
    # Detect optional libs for explainability
    try:
        from backend.models.explainabilityUtils import IntegratedGradients, shap
    except Exception:
        try:
            from ..explainabilityUtils import IntegratedGradients, shap
        except Exception:
            IntegratedGradients = None
            shap = None
    return {
        "status": "ok",
        "torchAvailable": bool(torch is not None),
        "cudaAvailable": cuda_ok,
        "modelLoaded": bool(_MODEL is not None),
        "modelDevice": device,
        "python": platform.python_version(),
        "platform": platform.platform(),
        "captumAvailable": bool(IntegratedGradients is not None),
        "shapAvailable": bool(shap is not None),
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


@app.post("/extract_from_pdf")
def extract_from_pdf(req: PdfExtractRequest):
    started = time.time()
    if requests is None:
        return {"ok": False, "error": "requests missing", "latencyMs": int((time.time() - started) * 1000)}
    try:
        r = requests.get(req.url, timeout=15)
        r.raise_for_status()
        content = r.content
        text = ""
        pages_meta = {"count": None}
        method = "none"
        chosen_lang = (req.lang or "eng").strip()

        # Prefer text extraction unless force OCR
        if (req.use_ocr is not True) and pdfminer_extract_text is not None:
            method = "pdfminer"
            text = (pdfminer_extract_text(io.BytesIO(content)) or "").strip()

        # Auto-fallback to OCR if: force OCR, or text too short/empty
        should_try_ocr = (
            (req.use_ocr is True) or
            ((req.use_ocr is None) and (not text or len(text) < 200))
        )
        if should_try_ocr and convert_from_bytes is not None and pytesseract is not None:
            method = "ocr"
            images = convert_from_bytes(content)
            pages_meta["count"] = len(images) if images else 0
            ocr_pages: List[str] = []
            for img in images:
                try:
                    if isinstance(img, Image.Image):
                        ocr_pages.append(pytesseract.image_to_string(img, lang=chosen_lang) or "")
                except Exception:
                    ocr_pages.append("")
            text = "\n\n".join([p.strip() for p in ocr_pages if p]).strip()

        # If still empty
        if not text:
            method = method or "none"

        # Very light regex-based lab extraction similar to Node side
        def find(pattern):
            m = re.search(pattern, text, flags=re.IGNORECASE)
            return m.group(1) if m else None

        def find_float(pattern):
            v = find(pattern)
            if not v:
                return None
            try:
                return float(re.findall(r"-?\d+(?:\.\d+)?", v.replace(",", ""))[0])
            except Exception:
                return None

        meta = {
            "patientName": find(r"(?:patient|name)\s*[:\-]?\s*([A-Za-z ,.'-]{3,})"),
            "patientId": find(r"(?:mrn|patient\s*id|accession)\s*[:\-]?\s*([A-Za-z0-9\-]+)"),
            "date": find(r"(?:date|reported\s*on)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\-]\d{2}[\-]\d{2})"),
        }
        labs = []
        def push_lab(name, value, unit):
            if value is None:
                return
            labs.append({"name": name, "value": value, "unit": unit, "confidence": 0.6})

        push_lab("glucose", find_float(r"glucose\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l)?"), "mg/dL")
        push_lab("hemoglobin", find_float(r"(hemoglobin|hgb)\s*[:=\-]?\s*([\d.,]+)"), "g/dL")
        push_lab("creatinine", find_float(r"creatinine\s*[:=\-]?\s*([\d.,]+)"), "mg/dL")
        push_lab("sodium", find_float(r"sodium\s*[:=\-]?\s*([\d.,]+)"), "mmol/L")
        push_lab("potassium", find_float(r"potassium\s*[:=\-]?\s*([\d.,]+)"), "mmol/L")

        return {
            "ok": True,
            "ocr": {"text": text, "pages": [], "method": method, "pageCount": pages_meta.get("count"), "lang": chosen_lang},
            "extracted": {"meta": meta, "labs": labs, "diagnoses": [], "medications": []},
            "latencyMs": int((time.time() - started) * 1000),
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "latencyMs": int((time.time() - started) * 1000)}


@app.post("/extract_from_upload")
def extract_from_upload(req: UploadExtractRequest):
    started = time.time()
    try:
        content = base64.b64decode(req.data or "") if req and req.data else b""
        if not content:
            return {"ok": False, "error": "empty content", "latencyMs": int((time.time() - started) * 1000)}
        chosen_lang = (req.lang or "eng").strip()

        text = ""
        method = "none"
        pages_meta = {"count": None}

        if req.mime == "application/pdf":
            if pdfminer_extract_text is not None:
                method = "pdfminer"
                text = (pdfminer_extract_text(io.BytesIO(content)) or "").strip()
            should_try_ocr = (
                (req.use_ocr is True) or ((req.use_ocr is None) and (not text or len(text) < 200))
            )
            if should_try_ocr and convert_from_bytes is not None and pytesseract is not None:
                method = "ocr"
                images = convert_from_bytes(content)
                pages_meta["count"] = len(images) if images else 0
                ocr_pages: List[str] = []
                for img in images:
                    try:
                        if isinstance(img, Image.Image):
                            ocr_pages.append(pytesseract.image_to_string(img, lang=chosen_lang) or "")
                    except Exception:
                        ocr_pages.append("")
                text = "\n\n".join([p.strip() for p in ocr_pages if p]).strip()
        else:
            # Assume image
            if Image is not None and pytesseract is not None:
                try:
                    img = Image.open(io.BytesIO(content))
                    method = "ocr"
                    text = pytesseract.image_to_string(img, lang=chosen_lang) or ""
                except Exception:
                    text = ""

        def find(pattern):
            m = re.search(pattern, text, flags=re.IGNORECASE)
            return m.group(1) if m else None

        def find_float(pattern):
            v = find(pattern)
            if not v:
                return None
            try:
                return float(re.findall(r"-?\d+(?:\.\d+)?", v.replace(",", ""))[0])
            except Exception:
                return None

        meta = {
            "patientName": find(r"(?:patient|name)\s*[:\-]?\s*([A-Za-z ,.'-]{3,})"),
            "patientId": find(r"(?:mrn|patient\s*id|accession)\s*[:\-]?\s*([A-Za-z0-9\-]+)"),
            "date": find(r"(?:date|reported\s*on)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\-]\d{2}[\-]\d{2})"),
        }
        labs = []
        def push_lab(name, value, unit):
            if value is None:
                return
            labs.append({"name": name, "value": value, "unit": unit, "confidence": 0.6})

        push_lab("glucose", find_float(r"glucose\s*[:=\-]?\s*([\d.,]+)\s*(mg\/dl|mmol\/l)?"), "mg/dL")
        push_lab("hemoglobin", find_float(r"(hemoglobin|hgb)\s*[:=\-]?\s*([\d.,]+)"), "g/dL")
        push_lab("creatinine", find_float(r"creatinine\s*[:=\-]?\s*([\d.,]+)"), "mg/dL")
        push_lab("sodium", find_float(r"sodium\s*[:=\-]?\s*([\d.,]+)"), "mmol/L")
        push_lab("potassium", find_float(r"potassium\s*[:=\-]?\s*([\d.,]+)"), "mmol/L")

        return {
            "ok": True,
            "ocr": {"text": text, "pages": [], "method": method, "pageCount": pages_meta.get("count"), "lang": chosen_lang},
            "extracted": {"meta": meta, "labs": labs, "diagnoses": [], "medications": []},
            "latencyMs": int((time.time() - started) * 1000),
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "latencyMs": int((time.time() - started) * 1000)}


if __name__ == "__main__":
    # Allows: python backend/models/ai_service/main.py
    try:
        import uvicorn
        uvicorn.run("backend.models.ai_service.main:app", host="0.0.0.0", port=8000, reload=False)
    except Exception:
        # Fallback for relative path execution
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=8000)


