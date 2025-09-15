## SHAP in this codebase

**Role**: Potential future explainability method (model-agnostic or model-specific) for feature attributions.

**Current usage**
- Declared in `backend/models/requirements.txt` as `shap>=0.45.0`.
- Not directly imported in current modules. The active explainability path uses Captum or gradients×input.

**Future integration ideas**
- Add SHAP KernelExplainer or DeepExplainer for per-sample explanations alongside Captum.
- Cache background datasets and restrict feature set (8 features) to keep latencies low.


