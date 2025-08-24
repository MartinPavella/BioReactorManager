import dataclasses
import json
from datetime import datetime

from pydantic import BaseModel

probe_file_name = "probe_readings.json"


@dataclasses.dataclass
class ProbeReading(BaseModel):
    timestamp: datetime
    value: float


def log_probe_reading(layer_id: int, reading: ProbeReading):
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


def get_all_readings(layer_id: int) -> list[str]:
    """ Return all probe readings for a given layer. """
    try:
        with open(probe_file_name, "r") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []  # No data found.

    # TODO Limit the returned data. E.g. to 4 days and at most 100 samples.
    return data.get(str(layer_id), [])
