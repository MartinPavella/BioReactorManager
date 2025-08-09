import time
from dataclasses import dataclass
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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


@dataclass
class Layer:
    id_: int
    name: str
    light_state: bool
    valve_state: bool


layers: list[Layer] = [Layer(i, f'layer_{5 - i}', False, False) for i in range(5)]  # Current state of the layers.
pump_state = False
pump_perctentage = 50
light_cycle_on = False
mixing_cycle_on = False


@app.get("/get-state")
def get_state():
    return [
        {"id_": l.id_, "name": l.name, "light_state": l.light_state, "valve_state": l.valve_state, } for l in layers
    ]


class HarvestMeta(BaseModel):
    duration: int


@app.post('/harvest-layer/{id_}')
def harvest_layer(id_: int, harvest_meta: HarvestMeta):
    mqtt_manager.harvest_layer(layer_id=id_, duration_seconds=harvest_meta.duration)
    return [f'Successfully harvested layer {id_}.']


@app.post('/blink-control-led')
def blink_control_led():
    mqtt_manager.blink_led()
    return []


@app.post('/switch-light/{id_}')
def switch_light(id_: int):
    new_light_state = not layers[id_].light_state
    layers[id_].light_state = new_light_state

    if new_light_state:
        mqtt_manager.light_on(id_)
    else:
        mqtt_manager.light_off(id_)

    return {"id_": id_, "new_light_state": new_light_state}


@app.post('/timer-lights')
def timer_lights():
    # TODO Extremely ugly temporary code! - hahah, si na seba moc prísny martin 

    global light_cycle_on
    if light_cycle_on:
        return  # Only 1 thread should handle this endpoint.
    light_cycle_on = True

    # The lights are on from 6:00 to 21:00.
    start_hour = 6
    end_hour = 21
    time_shift = -2  # The `datetime` for some reason shifts the time to a different time zone.

    while True:
        if (start_hour + time_shift) <= datetime.now().hour < (end_hour + time_shift):
            for id_ in range(5):
                mqtt_manager.light_on(id_)
        else:
            for id_ in range(5):
                mqtt_manager.light_off(id_)

        time.sleep(10)  # Check once every 10 seconds.


@app.post('/timer-mixing')
def timer_mixing():
    global mixing_cycle_on
    if mixing_cycle_on:
        return  # Only 1 thread should handle this endpoint.
    mixing_cycle_on = True

    layer_mixing_time_seconds = 7
    time_to_fill_pipe_to_layers = [
        0, 0, 0, 0, 3  # TODO Just 3 seconds for the final layer for now.
    ]
    layer_mixing_powers = [
        63, 66, 69, 72, 75  # TODO Measure precise values.
    ]

    mixing_period_minutes = 5
    last_updated_time = datetime.now()
    while True:
        if (datetime.now() - last_updated_time).total_seconds() / 60 >= mixing_period_minutes:
            for layer_id, (mixing_power, time_to_fill_pipe) in enumerate(
                    zip(layer_mixing_powers, time_to_fill_pipe_to_layers)
            ):
                mqtt_manager.open_valve(layer_id)
                mqtt_manager.start_pump(mixing_power)
                time.sleep(time_to_fill_pipe + layer_mixing_time_seconds)
                mqtt_manager.stop_pump()
                mqtt_manager.close_valve(layer_id)

            mqtt_manager.stop_pump()  # Make sure the pump is not running.

            last_updated_time = datetime.now()  # Record the mixing time.

        time.sleep(10)  # Check once every 10 seconds.


@app.post('/switch-valve/{id_}')
def switch_valve(id_: int):
    new_valve_state = not layers[id_].valve_state
    layers[id_].valve_state = new_valve_state

    if new_valve_state:
        mqtt_manager.open_valve(id_)
    else:
        mqtt_manager.close_valve(id_)

    return {"id_": id_, "new_valve_state": new_valve_state}


@app.post('/pump-power-change/{value_}')
def pump_power_change(value_: int):
    global pump_perctentage, pump_state
    pump_perctentage = value_

    if pump_state:
        mqtt_manager.start_pump(value_)

    return {"value": value_}


@app.post('/toggle-pump')
def toggle_pump():
    global pump_state
    pump_state = not pump_state
    if pump_state:
        mqtt_manager.start_pump(pump_perctentage)
    else:
        mqtt_manager.stop_pump()

    return {"new_pump_state": pump_state}


@app.post('/harvest-all')
def harvest_all():
    first_layer_harvest_time = 15
    layer_harvest_time = 12

    # First, close everything.
    mqtt_manager.stop_pump()
    global pump_state
    pump_state = False
    for layer in layers:
        mqtt_manager.close_valve(layer.id_)
        layer.valve_state = False

    mqtt_manager.open_valve(0)
    time.sleep(0.5)
    mqtt_manager.start_pump()
    time.sleep(first_layer_harvest_time)

    mqtt_manager.open_valve(1)
    time.sleep(0.5)
    mqtt_manager.close_valve(0)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(2)
    time.sleep(0.5)
    mqtt_manager.close_valve(1)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(3)
    time.sleep(0.5)
    mqtt_manager.close_valve(2)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(4)
    time.sleep(0.5)
    mqtt_manager.close_valve(3)
    time.sleep(layer_harvest_time)

    mqtt_manager.stop_pump()
    time.sleep(1)
    mqtt_manager.close_valve(4)

    return "Success"


# Data model for receiving button messages
class MessageRequest(BaseModel):
    message: str


# Handle button clicks
@app.post("/send-message/{button_id}")
def send_message(button_id: int, request: MessageRequest):
    return {"response": f"Received '{request.message}' from Button {button_id}"}


if __name__ == "__main__":
    import uvicorn

    print("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
    uvicorn.run(app, host="0.0.0.0", port=8000)
