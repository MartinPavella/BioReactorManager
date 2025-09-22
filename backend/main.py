import json
import logging
import threading
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import database_manager
import mqtt_manager

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


# noinspection DuplicatedCode
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


# noinspection DuplicatedCode
class Config:
    file_access_mutex: threading.Lock = threading.Lock()

    @classmethod
    def get(cls) -> dict:
        """ Return the current static configuration of the system as a dictionary. """
        cls.file_access_mutex.acquire()
        with open(config_file_name, 'r') as f:
            config = json.load(f)
        cls.file_access_mutex.release()

        return config

    @classmethod
    def set(cls, new_config: dict):
        """ Save a new static configuration of the system. """
        data = json.dumps(new_config)

        cls.file_access_mutex.acquire()
        with open(config_file_name, 'w') as f:
            f.write(data)
        cls.file_access_mutex.release()


class ConfigMeta(BaseModel):
    cultivation_cycle_start: str  # Uses the format "HH:MM".
    cultivation_cycle_end: str  # Uses the format "HH:MM".
    probe_reading_period_minutes: int
    medium_reading_period_minutes: int
    layer_mixing_period_minutes: int
    layer_mixing_intensity: int
    layer_mixing_duration_seconds: int
    reservoir_mixing_period_minutes: int
    reservoir_mixing_duration_seconds: int
    additive_names: list[str]


@app.post('/set-config')
def set_config(config: ConfigMeta):
    Config.set(config.model_dump())


@app.get('/get-config')
def get_config():
    return Config.get()


def _run_automatic_cultivation():
    """ Run the automatic cultivation in a separate thread, as long as `State.get()['automatic_cultivation']`
         is True.
     """
    time_zone = "Europe/Prague"

    last_actions = {
        "reservoir_mixing": datetime.now(),
        "layer_mixing": datetime.now(),
        "probe_reading": datetime.now(),
        "medium_reading": datetime.now(),
    }

    def check_timed_events():
        if datetime.now() - last_actions['probe_reading'] > timedelta(
                minutes=Config.get()['probe_reading_period_minutes']):
            # Make biomass measurement.
            mqtt_manager.trigger_probe_measurement()
            last_actions['probe_reading'] = datetime.now()

        if datetime.now() - last_actions['medium_reading'] > timedelta(
                minutes=Config.get()['medium_reading_period_minutes']):
            # Make pH and conductivity measurement.
            mqtt_manager.trigger_ph_cond_measurement()
            last_actions['medium_reading'] = datetime.now()

        if datetime.now() - last_actions['reservoir_mixing'] > timedelta(
                minutes=Config.get()['reservoir_mixing_period_minutes']):
            # Mix the reservoir.
            mqtt_manager.reservoir_mixing_on()
            time.sleep(Config.get()['reservoir_mixing_duration_seconds'])
            mqtt_manager.reservoir_mixing_off()
            last_actions['reservoir_mixing'] = datetime.now()

        if datetime.now() - last_actions['layer_mixing'] > timedelta(
                minutes=Config.get()['layer_mixing_period_minutes']):
            # Mix the layers.

            # Compute the pump power for each layer.
            pump_powers = []
            current_power = Config.get()['layer_mixing_intensity']
            for _ in range(5):
                pump_powers.append(int(current_power))
                current_power *= 0.97  # Drop by 3% for every lower level.

            for layer_id in reversed(range(5)):  # Start from the bottom to now have to wait for the water to rise up.
                mqtt_manager.start_pump(pump_powers[layer_id])
                mqtt_manager.open_valve(layer_id)
                time.sleep(Config.get()['layer_mixing_duration_seconds'])
                mqtt_manager.close_valve(layer_id)
            mqtt_manager.stop_pump()

    continue_running = True
    while State.get()['automatic_cultivation_on'] and continue_running:
        # Decode the start and end time from the config. They use the format "HH:MM".
        start_time = datetime.strptime(Config.get()['cultivation_cycle_start'], '%H:%M').time()
        end_time = datetime.strptime(Config.get()['cultivation_cycle_end'], '%H:%M').time()

        now = datetime.now(ZoneInfo(time_zone)).time()

        if start_time < now < end_time:
            # The lights should be ON.
            logging.info(f"Automatic Cultivation: lights ON ({threading.current_thread().name}).")

            mqtt_manager.all_lights_on()

            # Record that the lights are on in the `State`.
            state = State.get()
            for layer in state['layers']:
                layer['light_on'] = True
            State.set(state)

        else:
            # The lights should be OFF.
            logging.info(f"Automatic Cultivation: lights OFF ({threading.current_thread().name}).")

            mqtt_manager.all_lights_off()

            # Record that the lights are off in the `State`.
            state = State.get()
            for layer in state['layers']:
                layer['light_on'] = False
            State.set(state)

        # Check whether this thread should be killed every second, and check if the lights should be switched on/off
        #  evert 10 seconds.
        for _ in range(10):
            if threading.current_thread() is not AutomaticCultivation.get_current_thread():
                # Exit the infinite loop.
                logging.info(f"Automatic Cultivation: Terminating condition ({threading.current_thread().name}).")
                continue_running = False
                break

            else:
                # Check if there are any timed events which should be handled.
                check_timed_events()

                time.sleep(1)


@app.get("/get-state")
def get_state():
    return State.get()


@app.get("/get-probe-data/{id_}")
def get_probe_data(id_: int):
    return database_manager.get_all_probe_readings(id_)


@app.get("/get-current-biomass-value/{id_}")
def get_current_probe_reading(id_: int):
    return {"value": mqtt_manager.get_current_biomass_value(id_)}


@app.get("/get-current-probe-reading/{id_}")
def get_current_probe_reading(id_: int):
    return {"value": mqtt_manager.get_current_probe_reading(id_)}


@app.get("/get-current-ec-value")
def get_current_ec_reading():
    return {"value": mqtt_manager.get_current_ec_value()}


@app.get("/get-current-ec-reading")
def get_current_ec_reading():
    return {"value": mqtt_manager.get_current_ec_reading()}


@app.get("/get-current-ph-value")
def get_current_ph_reading():
    return {"value": mqtt_manager.get_current_ph_value()}


@app.get("/get-current-ph-reading")
def get_current_ph_reading():
    return {"value": mqtt_manager.get_current_ph_reading()}


@app.get("/request-current-probe-measurements")
def request_current_probe_measurements():
    mqtt_manager.request_current_probe_readings()


@app.get("/request-current-ph-ec-measurements")
def request_current_ph_ec_measurements():
    mqtt_manager.request_current_ph_ec_readings()


@app.get("/get-ph-conductivity-data")
def get_ph_conductivity_data():
    return database_manager.get_ph_conductivity_readings()


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
    mqtt_manager.all_lights_on()

    state = State.get()
    for id_, layer in enumerate(state['layers']):
        layer['light_on'] = True
    State.set(state)


@app.post('/all-lights-off')
def all_lights_off():
    mqtt_manager.all_lights_off()

    state = State.get()
    for id_, layer in enumerate(state['layers']):
        layer['light_on'] = False
    State.set(state)


@app.post('/turn-everything-off')
def turn_everything_off():
    # Automatic cultivation off.
    AutomaticCultivation.set_current_thread(None)
    state = State.get()
    state['automatic_cultivation_on'] = False

    # Turn all pumps off.
    mqtt_manager.stop_pump()
    for peristaltic_state in state['peristaltics']:
        mqtt_manager.peristaltic_off(peristaltic_state['id_'])
    mqtt_manager.reservoir_mixing_off()
    mqtt_manager.additive_mixing_off()

    state['pump_on'] = False
    for peristaltic_state in state['peristaltics']:
        peristaltic_state['on'] = False
    state['reservoir_mixing_on'] = False
    state['additive_mixing_on'] = False

    # Turn off all lights and valves.
    mqtt_manager.all_lights_off()
    mqtt_manager.all_valves_off()
    for id_, layer in enumerate(state['layers']):
        layer['valve_on'] = False
        layer['light_on'] = False

    State.set(state)

    return state


@app.post('/toggle-peristaltic/{id_}')
def toggle_peristaltic(id_: int):
    state = State.get()

    new_peristaltic_on = not state['peristaltics'][id_]['on']
    state['peristaltics'][id_]['on'] = new_peristaltic_on

    if new_peristaltic_on:
        mqtt_manager.peristaltic_on(id_)
    else:
        mqtt_manager.peristaltic_off(id_)

    State.set(state)

    return {"id_": id_, "new_peristaltic_on": new_peristaltic_on}


@app.post('/toggle-additive-mixing')
def toggle_additive_mixing():
    state = State.get()

    new_additive_mixing_on = not state['additive_mixing_on']
    state['additive_mixing_on'] = new_additive_mixing_on

    if new_additive_mixing_on:
        mqtt_manager.additive_mixing_on()
    else:
        mqtt_manager.additive_mixing_off()

    State.set(state)

    return {"new_additive_mixing_on": new_additive_mixing_on}


@app.post('/toggle-reservoir-mixing')
def toggle_reservoir_mixing():
    state = State.get()

    new_reservoir_mixing_on = not state['reservoir_mixing_on']
    state['reservoir_mixing_on'] = new_reservoir_mixing_on

    if new_reservoir_mixing_on:
        mqtt_manager.reservoir_mixing_on()
    else:
        mqtt_manager.reservoir_mixing_off()

    State.set(state)

    return {"new_reservoir_mixing_on": new_reservoir_mixing_on}


@app.post('/trigger-measurement/{type_}')
def toggle_reservoir_mixing(type_: str):
    type_to_function = {
        "ph-cond": mqtt_manager.trigger_ph_cond_measurement,
        "probe": mqtt_manager.trigger_probe_measurement,
    }

    if type_ in type_to_function:
        type_to_function[type_]()

    else:
        raise TypeError(f"Unknown measurement type: {type_}")


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
