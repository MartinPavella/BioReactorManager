import json
import logging
import os
from datetime import datetime

from pydantic import BaseModel

probe_file_name = "probe_readings.json"
ph_conductivity_file_name = "ph_conductivity_readings.json"


class PROBEReading(BaseModel):
    timestamp: datetime
    value: float


class PHConductivityReading(BaseModel):
    timestamp: datetime
    ph: float
    conductivity: float


def log_probe_reading(layer_id: int, reading: PROBEReading):
    """ Store a new probe reading for a given layer. """
    try:
        with open(probe_file_name, "r") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}

    layer_key = str(layer_id)
    if layer_key not in data:
        data[layer_key] = []
    data[layer_key].append(reading.model_dump())

    with open(probe_file_name, "w") as f:
        json.dump(data, f)

    return {"status": "ok", "layer_id": layer_id, "reading": reading}


def get_all_probe_readings(layer_id: int) -> list[str]:
    """ Return all probe readings for a given layer. """
    try:
        with open(probe_file_name, "r") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []  # No data found.

    # TODO Limit the returned data. E.g. to 4 days and at most 100 samples.
    return data.get(str(layer_id), [])


def _load_ph_cond_data():
    if os.path.exists(ph_conductivity_file_name):
        with open(ph_conductivity_file_name, "r") as f:
            return json.load(f)
    return []


def _save_ph_cond_data(data):
    with open(ph_conductivity_file_name, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_ph_conductivity_readings():
    """Return all pH and conductivity readings."""
    return _load_ph_cond_data()


def log_ph_conductivity_reading(sample: PHConductivityReading):
    """Append a new pH+conductivity reading."""
    logging.info(f"Storing pH-conductivity reading: {sample.model_dump()}")
    data = _load_ph_cond_data()
    data.append(sample.model_dump())
    _save_ph_cond_data(data)
    return {"status": "ok", "count": len(data)}
