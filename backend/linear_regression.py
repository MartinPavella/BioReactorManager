import numpy as np


def ph_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    return (float(reading) / 4096.) * 2. + 6.  # Temporary code.


def conductivity_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    return (float(reading) / 4096.) * 4. + 3.  # Temporary code.


def probe_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    value = 1133.7643 - 0.2872 * float(reading)

    return float(np.clip(value, 0., 800.0))  # Clip to the expected range.
