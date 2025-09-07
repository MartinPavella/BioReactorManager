

def ph_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    eps = 1.e-5
    return (float(reading) + eps / 4096) * 2 + 6  # Temporary code.

def conductivity_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    eps = 1.e-5
    return (float(reading) + eps / 4096) * 4 + 3  # Temporary code.
