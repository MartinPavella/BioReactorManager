

def ph_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    return (float(reading) / 4096.) * 2. + 6.  # Temporary code.

def conductivity_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    return (float(reading) / 4096.) * 4. + 3.  # Temporary code.


def probe_reading_to_value(reading: int) -> float:
    # TODO Implement linear regression.
    return (float(reading) / 4096.) * 200. + 400.  # Temporary code.