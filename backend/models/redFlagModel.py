# Placeholder for urgent condition detection

def detect_red_flags(payload):
    # naive example
    vitals = (payload or {}).get('vitals', {})
    temperature = vitals.get('temperature')
    flags = []
    if temperature and temperature >= 39.0:
        flags.append({ 'condition': 'Hyperpyrexia', 'triggered': True, 'rationale': ['temperature >= 39C'] })
    return flags


