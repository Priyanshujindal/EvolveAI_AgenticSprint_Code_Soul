# Placeholder PyTorch model definition
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except Exception:  # keep repo runnable without python deps
    torch = None
    nn = None
    F = None

try:
    import scipy
    import numpy as _np
except Exception:
    scipy = None
    _np = None


class DiagnosisModel(nn.Module if nn else object):
    """A minimal feed-forward model for triaging 3 conditions from 8 numeric inputs.

    The model shape is intentionally small for demo purposes. It exposes a
    predict helper that returns softmax probabilities.
    """

    def __init__(self, input_dim: int = 8, num_classes: int = 3, device: str | None = None):
        if nn:
            super().__init__()
            hidden_dim = 16
            self.net = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, num_classes),
            )

        # runtime attributes even if torch is missing (for safer access)
        self._has_torch = torch is not None and nn is not None and F is not None
        self.input_dim = input_dim
        self.num_classes = num_classes
        self.device = device or ("cuda" if self._has_torch and torch.cuda.is_available() else "cpu")

        if self._has_torch and nn:
            self.to(self.device)

    def forward(self, x):
        if self._has_torch:
            return self.net(x)
        return None

    def predict_proba(self, x_tensor):
        """Return softmax probabilities for a batch of inputs.

        x_tensor must be a torch.Tensor of shape (N, input_dim).
        """
        if not self._has_torch:
            return None
        self.eval()
        with torch.no_grad():
            logits = self.forward(x_tensor)
            probs = F.softmax(logits, dim=-1)
        return probs


def _winsorize(values, lower_pct: float = 0.01, upper_pct: float = 0.99):
    if _np is None or scipy is None:
        return values
    try:
        lo = _np.quantile(values, lower_pct)
        hi = _np.quantile(values, upper_pct)
        return [max(lo, min(v, hi)) for v in values]
    except Exception:
        return values


def featurize_payload_to_tensor(payload, use_scipy_winsorize: bool = False) -> "torch.Tensor | None":
    """Map request payload into a fixed-size numeric tensor of shape (1, 8).

    This is a simple, deterministic featurization over common vitals/labs.
    It is only for demo purposes; real systems will use trained pipelines.
    """
    if torch is None:
        return None

    vitals = (payload or {}).get("vitals", {})
    labs = (payload or {}).get("labs", {})

    # Eight demo features (fill missing as 0.0)
    raw = [
        float(vitals.get("heartRate", 0.0)),
        float(vitals.get("systolicBP", 0.0)),
        float(vitals.get("diastolicBP", 0.0)),
        float(vitals.get("respiratoryRate", 0.0)),
        float(vitals.get("temperature", 0.0)),
        float(labs.get("wbc", 0.0)),
        float(labs.get("crp", 0.0)),
        float(labs.get("glucose", 0.0)),
    ]

    # Optional SciPy-backed winsorization to reduce outlier impact in demo
    if use_scipy_winsorize:
        raw = _winsorize(raw)

    # Simple normalization with rough means/stds (demo only)
    means = [75.0, 120.0, 80.0, 16.0, 36.8, 7.0, 5.0, 95.0]
    stds = [12.0, 15.0, 10.0, 3.0, 0.5, 2.0, 3.0, 15.0]
    norm = [(raw[i] - means[i]) / (stds[i] if stds[i] != 0 else 1.0) for i in range(8)]

    x = torch.tensor([norm], dtype=torch.float32)
    return x

