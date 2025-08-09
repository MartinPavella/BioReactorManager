import logging

import numpy as np


def probe_file_name(layer_id: int) -> str:
    return f'probe_{layer_id}.csv'


def log_reading(layer_id: int, reading: int):
    logging.info(f'Recording PROBE {layer_id} = {reading}')
    with open(probe_file_name(layer_id), 'a') as f:
        f.write(str(reading) + ', ')

    # TODO TMP
    logging.info(f'All readings[{layer_id}]: {get_all_readings(layer_id)}')

def get_all_readings(layer_id: int) -> np.ndarray:
    with open(probe_file_name(layer_id), 'r') as f:
        readings = [reading.strip() for reading in f.read().split(',')]
        readings = [int(reading) for reading in readings if reading.isnumeric()]
        return np.asarray(readings)

