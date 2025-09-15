## PyTorch in this codebase

**Role**: Core tensor and neural network runtime for the demo triage model.

**Where it's used**
- `backend/models/diagnosisModel.py`: defines `DiagnosisModel` via `nn.Module`, inference with `F.softmax`, device handling (CPU/CUDA), and `featurize_payload_to_tensor(...)`.
- `backend/models/ai_service/main.py`: lazy global model, moves tensors to model device, serves `/health` and `/analyze`.

**Runtime behavior**
- Selects `cuda` when available; otherwise falls back to `cpu`.
- If PyTorch is not installed, code returns safe stub predictions to keep the app runnable.

**Install (see requirements)**
- Listed in `backend/models/requirements.txt` as `torch>=2.2.0`. For CUDA, install a matching CUDA build from PyTorch.


