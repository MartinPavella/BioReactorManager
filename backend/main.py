import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dataclasses import dataclass
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

@app.get("/get-state")
def get_state():
    return [
        {"id_": l.id_, "name": l.name, "light_state": l.light_state, "valve_state": l.valve_state} for l in layers
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

    return {"id_" : id_, "new_light_state": new_light_state}

@app.post('/switch-valve/{id_}')
def switch_valve(id_: int):
    new_valve_state = not layers[id_].valve_state
    layers[id_].valve_state = new_valve_state

    if new_valve_state:
        mqtt_manager.open_valve(id_)
    else:
        mqtt_manager.close_valve(id_)

    return {"id_" : id_, "new_valve_state": new_valve_state}



@app.post('/toggle-pump')
def toggle_pump():
    global pump_state
    pump_state = not pump_state
    if pump_state:
        mqtt_manager.start_pump()
    else:
        mqtt_manager.stop_pump()

    return {"new_pump_state": pump_state}


@app.post('/harvest-all')
def harvest_all():
    first_layer_harvest_time = 8
    layer_harvest_time = 5

    mqtt_manager.open_valve(0)
    mqtt_manager.start_pump()
    time.sleep(first_layer_harvest_time)

    mqtt_manager.open_valve(1)
    mqtt_manager.close_valve(0)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(2)
    mqtt_manager.close_valve(1)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(3)
    mqtt_manager.close_valve(2)
    time.sleep(layer_harvest_time)

    mqtt_manager.open_valve(4)
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
    uvicorn.run(app, host="0.0.0.0", port=8000)

