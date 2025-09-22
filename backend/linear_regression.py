import json

# Load the constants of the linear regression on boot.
constants_file = 'linear_regression_constants.json'
with open(constants_file) as json_file:
    constants = json.load(json_file)


def ph_reading_to_value(reading: int) -> float:
    if reading == 0:
        return 0.0
    b_0, b_1 = constants['ph']
    return b_0 + b_1 * float(reading)


def conductivity_reading_to_value(reading: int) -> float:
    if reading == 0:
        return 0.0
    b_0, b_1 = constants['ec']
    return b_0 + b_1 * float(reading)


def probe_reading_to_value(reading: int, layer: int) -> float:
    if reading == 0:
        return 0.0
    b_0, b_1 = constants['probe'][layer]
    return b_0 + b_1 * float(reading)
