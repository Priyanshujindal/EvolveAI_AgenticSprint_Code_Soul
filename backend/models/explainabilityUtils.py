# Placeholder for SHAP/Captum helpers
try:
    import torch
except Exception:
    torch = None

try:  # optional
    from captum.attr import IntegratedGradients
except Exception:
    IntegratedGradients = None


def summarize_attributions(attribs):
    return attribs or {}


def compute_attributions(model, x_tensor, target_index: int | None = None):
    """Compute simple feature attributions for the first sample in x_tensor.

    Attempts to use Captum Integrated Gradients when available; otherwise falls
    back to gradients * input. Returns a python list of floats (attributions)
    for the first item in the batch, or None if unsupported.
    """
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
            # gradient x input fallback
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

