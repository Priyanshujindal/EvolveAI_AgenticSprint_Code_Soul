## Captum in this codebase

**Role**: Optional model interpretability for PyTorch models.

**Where it's used**
- `backend/models/explainabilityUtils.py`: tries `from captum.attr import IntegratedGradients`; computes attributions for the top class when available; otherwise falls back to gradients×input.
- `backend/models/ai_service/main.py`: calls `compute_attributions(...)` from the analyze path and exposes results under `explainability`.

**Runtime behavior**
- If Captum is unavailable, attribution gracefully degrades to gradients×input or None.

**Install (see requirements)**
- Listed in `backend/models/requirements.txt` as `captum>=0.7.0`.


