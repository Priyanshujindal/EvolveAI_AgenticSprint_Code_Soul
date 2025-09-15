# Placeholder for SHAP/Captum helpers
try:
    import torch
except Exception:
    torch = None

try:  # optional
    from captum.attr import IntegratedGradients
except Exception:
    IntegratedGradients = None

try:  # optional
    import shap
except Exception:
    shap = None


def summarize_attributions(attribs):
    return attribs or {}


def _captum_or_gradient_input(model, x_tensor, target_index: int | None = None):
    if torch is None or x_tensor is None or not hasattr(model, "forward"):
        return None
    model.eval()
    x = x_tensor.detach().clone()
    x.requires_grad_(True)
    try:
        if IntegratedGradients is not None:
            ig = IntegratedGradients(model)
            attributions = ig.attribute(x, target=target_index, n_steps=32)
        else:
            logits = model(x)
            if target_index is None:
                target_index = int(torch.argmax(logits[0]).item())
            selected = logits[:, target_index]
            selected.backward(torch.ones_like(selected))
            attributions = x.grad * x
        first = attributions[0].detach().cpu().tolist()
        return first
    except Exception:
        return None


def _shap_kernel_explainer(model, x_tensor, target_index: int | None = None):
    """Compute SHAP values using KernelExplainer on the first item.

    Note: This is a lightweight integration suitable for small feature count.
    Returns a list of attributions for the selected class or None if unsupported.
    """
    if shap is None or torch is None or x_tensor is None or not hasattr(model, "forward"):
        return None
    try:
        model.eval()

        # Move small tensors to cpu/numpy for SHAP KernelExplainer
        x_cpu = x_tensor.detach().cpu()
        x0 = x_cpu[0:1]

        def f_np(inputs_np):
            with torch.no_grad():
                t = torch.tensor(inputs_np, dtype=x_cpu.dtype)
                # align device with model if needed
                device = getattr(model, "device", None)
                if device is not None and hasattr(torch, "device"):
                    t = t.to(device)
                probs = model.predict_proba(t)
                if probs is None:
                    return None
                p = probs.detach().cpu().numpy()
                return p

        # Background data: use the same sample as baseline for stability in demo
        background = x0.numpy()
        explainer = shap.KernelExplainer(f_np, background)
        p = f_np(x0.numpy())
        if p is None:
            return None
        if target_index is None:
            target_index = int(p[0].argmax())
        shap_values = explainer.shap_values(x0.numpy(), nsamples=50)

        # shap returns list per class for multiclass; select class index
        if isinstance(shap_values, list) and len(shap_values) > target_index:
            vals = shap_values[target_index][0].tolist()
        else:
            # binary or single-output case
            vals = shap_values[0].tolist() if hasattr(shap_values, "tolist") else None
        return vals
    except Exception:
        return None


def compute_attributions(model, x_tensor, target_index: int | None = None, method: str | None = None):
    """Compute feature attributions for the first sample in x_tensor.

    method: one of {"auto", "captum", "shap", "none"}. Defaults to "auto".
    In auto mode, prefer Captum, then SHAP, then gradients×input.
    Returns a list of floats or None.
    """
    chosen = (method or "auto").lower()
    if chosen == "none":
        return None

    if chosen == "captum":
        return _captum_or_gradient_input(model, x_tensor, target_index)
    if chosen == "shap":
        return _shap_kernel_explainer(model, x_tensor, target_index)

    # auto: captum → shap → grad×input
    attrs = _captum_or_gradient_input(model, x_tensor, target_index)
    if attrs is not None:
        return attrs
    attrs = _shap_kernel_explainer(model, x_tensor, target_index)
    if attrs is not None:
        return attrs
    return _captum_or_gradient_input(model, x_tensor, target_index)

