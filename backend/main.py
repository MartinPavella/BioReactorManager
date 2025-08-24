import json
import logging
import threading
import time
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import mqtt_manager
import probe_manager

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve images from the static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

state_file_name = '.current_state.json'
config_file_name = '.cultivation_config.json'


class AutomaticCultivation:
    thread_access_mutex: threading.Lock = threading.Lock()
    automatic_cultivation_thread: threading.Thread | None = None

    @classmethod
    def get_current_thread(cls) -> threading.Thread:
        cls.thread_access_mutex.acquire()
        current_thread = cls.automatic_cultivation_thread
        cls.thread_access_mutex.release()

        return current_thread

    @classmethod
    def set_current_thread(cls, thread: threading.Thread | None):
        cls.thread_access_mutex.acquire()
        cls.automatic_cultivation_thread = thread
        cls.thread_access_mutex.release()


class State:
    file_access_mutex: threading.Lock = threading.Lock()

    @classmethod
    def get(cls) -> dict:
        """ Return the current state of the system as a dictionary. """
        cls.file_access_mutex.acquire()
        with open(state_file_name, 'r') as f:
            state = json.load(f)
        cls.file_access_mutex.release()

        return state

    @classmethod
    def set(cls, new_state: dict):
        """ Save a new state of the system. """
        data = json.dumps(new_state)

        cls.file_access_mutex.acquire()
        with open(state_file_name, 'w') as f:
            f.write(data)
        cls.file_access_mutex.release()


def _get_config() -> dict:
    """ Return the current static configuration of the system as a dictionary. """
    with open(config_file_name, 'r') as f:
        config = json.load(f)

    return config


def _set_config(new_config: dict):
    """ Save a new static configuration of the system. """
    data = json.dumps(new_config)
    with open(config_file_name, 'w') as f:
        f.write(data)


def _run_automatic_cultivation():
    """ Run the automatic cultivation in a separate thread, as long as `State.get()['automatic_cultivation']`
         is True.
     """
    # TODO The lights are on from 6:00 to 21:00.
    start_hour = 6
    end_hour = 21
    time_shift = -2  # The `datetime` for some reason shifts the time to a different time zone.

    continue_running = True
    while State.get()['automatic_cultivation_on'] and continue_running:
        if (start_hour + time_shift) <= datetime.now().hour < (end_hour + time_shift):
            logging.info(f"Automatic Cultivation: lights ON ({threading.current_thread().name}).")
            for id_ in range(5):
                mqtt_manager.light_on(id_)
        else:
            logging.info(f"Automatic Cultivation: lights OFF ({threading.current_thread().name}).")
            for id_ in range(5):
                mqtt_manager.light_off(id_)

        # Check whether this thread should be killed every second, and check if the lights should be switched on/off
        #  evert 10 seconds.
        for _ in range(10):
            if threading.current_thread() is not AutomaticCultivation.get_current_thread():
                # Exit the infinite loop.
                logging.info(f"Automatic Cultivation: Terminating condition ({threading.current_thread().name}).")
                continue_running = False
                break
            else:
                # Try again in a second.
                time.sleep(1)


@app.get("/get-state")
def get_state():
    return State.get()


@app.get("/get-probe-data/{id_}")
def get_probe_data(id_: int):
    return probe_manager.get_all_readings(id_)


class ConfigMeta(BaseModel):
    light_cycle_start: str
    light_cycle_end: str
    probe_reading_period_minutes: int
    medium_mixing_period_minutes: int
    medium_mixing_intensity: int
    medium_mixing_duration_seconds: int


@app.post('/set-config')
def set_config(config: ConfigMeta):
    _set_config(config.model_dump())


@app.get('/get-config')
def get_config():
    return _get_config()


class HarvestMeta(BaseModel):
    duration: int


@app.post('/harvest-layer/{id_}')
def harvest_layer(id_: int, harvest_meta: HarvestMeta):
    mqtt_manager.harvest_layer(layer_id=id_, duration_seconds=harvest_meta.duration)
    return [f'Successfully harvested layer {id_}.']


@app.post('/blink-control-led')
def blink_control_led():
    """ Blink the LED on all connected ESP MCUs, for connection debugging. """
    mqtt_manager.blink_led()
    return []


@app.post('/switch-light/{id_}')
def switch_light(id_: int):
    state = State.get()

    new_light_on = not state['layers'][id_]['light_on']
    state['layers'][id_]['light_on'] = new_light_on

    if new_light_on:
        mqtt_manager.light_on(id_)
    else:
        mqtt_manager.light_off(id_)

    State.set(state)

    return {"id_": id_, "new_light_on": new_light_on}


@app.post('/all-lights-on')
def all_lights_on():
    state = State.get()
    for id_, layer in enumerate(state['layers']):
        layer['light_on'] = True
        mqtt_manager.light_on(id_)  # TODO Replace by single MQTT call for all lights.

    State.set(state)


@app.post('/all-lights-off')
def all_lights_off():
    state = State.get()
    for id_, layer in enumerate(state['layers']):
        layer['light_on'] = False
        mqtt_manager.light_off(id_)  # TODO Replace by single MQTT call for all lights.

    State.set(state)


@app.post('/toggle-automatic-cultivation')
def toggle_automatic_cultivation():
    state = State.get()
    state['automatic_cultivation_on'] = not state['automatic_cultivation_on']
    State.set(state)

    if state['automatic_cultivation_on']:
        # Start the automatic cultivation in a separate thread. There is always just a single thread running the
        #  automatic cultivation.
        logging.info('Automatic cultivation started.')
        new_thread = threading.Thread(target=_run_automatic_cultivation)
        AutomaticCultivation.set_current_thread(new_thread)
        new_thread.start()

    else:
        # Terminate the running thread.
        logging.info('Automatic cultivation stopped.')
        AutomaticCultivation.set_current_thread(None)

    return {'new_automatic_cultivation_on': state['automatic_cultivation_on']}


@app.post('/timer-mixing')
def timer_mixing():
    # TODO Fuse with `toggle_automatic_cultivation()`.
    pass
    # global mixing_cycle_on
    # if mixing_cycle_on:
    #     return  # Only 1 thread should handle this endpoint.
    # mixing_cycle_on = True
    #
    # layer_mixing_time_seconds = 7
    # time_to_fill_pipe_to_layers = [
    #     0, 0, 0, 0, 3  # TODO Just 3 seconds for the final layer for now.
    # ]
    # layer_mixing_powers = [
    #     63, 66, 69, 72, 75  # TODO Measure precise values.
    # ]
    #
    # mixing_period_minutes = 5
    # last_updated_time = datetime.now()
    # while True:
    #     if (datetime.now() - last_updated_time).total_seconds() / 60 >= mixing_period_minutes:
    #         for layer_id, (mixing_power, time_to_fill_pipe) in enumerate(
    #                 zip(layer_mixing_powers, time_to_fill_pipe_to_layers)
    #         ):
    #             mqtt_manager.open_valve(layer_id)
    #             mqtt_manager.start_pump(mixing_power)
    #             time.sleep(time_to_fill_pipe + layer_mixing_time_seconds)
    #             mqtt_manager.stop_pump()
    #             mqtt_manager.close_valve(layer_id)
    #
    #         mqtt_manager.stop_pump()  # Make sure the pump is not running.
    #
    #         last_updated_time = datetime.now()  # Record the mixing time.
    #
    #     time.sleep(10)  # Check once every 10 seconds.


@app.post('/switch-valve/{id_}')
def switch_valve(id_: int):
    state = State.get()

    new_valve_on = not state['layers'][id_]['valve_on']
    state['layers'][id_]['valve_on'] = new_valve_on

    State.set(state)

    if new_valve_on:
        mqtt_manager.open_valve(id_)
    else:
        mqtt_manager.close_valve(id_)

    return {"id_": id_, "new_valve_on": new_valve_on}


@app.post('/pump-power-change/{value_}')
def pump_power_change(value_: int):
    state = State.get()

    state['pump_power'] = value_

    State.set(state)

    if state['pump_on']:
        mqtt_manager.start_pump(value_)

    return {"value": value_}


@app.post('/toggle-pump')
def toggle_pump():
    state = State.get()

    state['pump_on'] = not state['pump_on']

    State.set(state)

    if state['pump_on']:
        mqtt_manager.start_pump(state['pump_power'])
    else:
        mqtt_manager.stop_pump()

    return {"new_pump_on": state['pump_on']}


@app.post('/harvest-all')
def harvest_all():
    # TODO Rework!
    #  Take the `state` into account?
    # first_layer_harvest_time = 15
    # layer_harvest_time = 12
    #
    # # First, close everything.
    # mqtt_manager.stop_pump()
    # global pump_state
    # pump_state = False
    # for layer in layers:
    #     mqtt_manager.close_valve(layer.id_)
    #     layer.valve_state = False
    #
    # mqtt_manager.open_valve(0)
    # time.sleep(0.5)
    # mqtt_manager.start_pump()
    # time.sleep(first_layer_harvest_time)
    #
    # mqtt_manager.open_valve(1)
    # time.sleep(0.5)
    # mqtt_manager.close_valve(0)
    # time.sleep(layer_harvest_time)
    #
    # mqtt_manager.open_valve(2)
    # time.sleep(0.5)
    # mqtt_manager.close_valve(1)
    # time.sleep(layer_harvest_time)
    #
    # mqtt_manager.open_valve(3)
    # time.sleep(0.5)
    # mqtt_manager.close_valve(2)
    # time.sleep(layer_harvest_time)
    #
    # mqtt_manager.open_valve(4)
    # time.sleep(0.5)
    # mqtt_manager.close_valve(3)
    # time.sleep(layer_harvest_time)
    #
    # mqtt_manager.stop_pump()
    # time.sleep(1)
    # mqtt_manager.close_valve(4)

    return "Success"


# Data model for receiving button messages
class MessageRequest(BaseModel):
    message: str


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
