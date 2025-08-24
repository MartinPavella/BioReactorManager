import json
import os
from datetime import datetime

from pydantic import BaseModel

ph_cond_file = "ph_conductivity_readings.json"


class PHCondSample(BaseModel):
    timestamp: datetime
    ph: float
    conductivity: float


# --- Utility functions ---
def _load_ph_cond_data():
    if os.path.exists(ph_cond_file):
        with open(ph_cond_file, "r") as f:
            return json.load(f)
    return []


def _save_ph_cond_data(data):
    with open(ph_cond_file, "w") as f:
        json.dump(data, f, indent=2, default=str)


def get_ph_conductivity_data():
    """Return all pH and conductivity readings."""
    return _load_ph_cond_data()


def add_ph_cond(sample: PHCondSample):
    """Append a new pH+conductivity reading."""
    data = _load_ph_cond_data()
    data.append(sample.model_dump())
    _save_ph_cond_data(data)
    return {"status": "ok", "count": len(data)}
