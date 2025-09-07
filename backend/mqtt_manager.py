# mqtt_manager.py
import logging
import re
from datetime import datetime

import paho.mqtt.client as mqtt

import database_manager
from linear_regression import conductivity_reading_to_value, ph_reading_to_value, probe_reading_to_value

broker = "192.168.0.102"
port = 1883
QOS = 0
CLEAN_SESSION = True

logging.basicConfig(level=logging.INFO)


# --- Topic helpers ------------------------------------------------------------
def send_to_rack_esp_topic(rack: int = 0) -> str:
    return f"server_to_esp/rack{rack}"


def receive_from_rack_esp_topic(rack: int = 0) -> str:
    return f"esp_to_server/rack{rack}"


def send_to_pump_esp_topic() -> str:
    return "server_to_esp/pump"


def receive_from_pump_esp_topic() -> str:
    return "esp_to_server/pump"


# --- Callbacks ----------------------------------------------------------------
def on_subscribe(client, userdata, mid, granted_qos):
    logging.info(f"SUBSCRIBED mid={mid}, qos={granted_qos}")


def on_disconnect(client, userdata, rc=0):
    logging.info("DISCONNECTED. rc=%s", rc)


def on_connect(client, userdata, flags, rc):
    logging.info("CONNECTED flags=%s rc=%s", flags, rc)
    # Subscribe to all inbound topics from devices once connected
    # so reconnects re-subscribe automatically.
    client.subscribe("esp_to_server/#", qos=QOS)


PROBE_RE = re.compile(r"^PROBE\[(\d+)\]:(\d+)$")
PHCOND_RE = re.compile(r"^ph-cond:(\d+):(\d+)$")


def on_message(client, userdata, message):
    try:
        msg = message.payload.decode("utf-8").strip()
    except Exception:
        logging.warning("Received non-utf8 message on %s", message.topic)
        return

    logging.info("Received from %s: `%s`", message.topic, msg)

    # PROBE message: PROBE[<layer_id>]:<raw_value>
    if m := PROBE_RE.match(msg):
        layer_id = int(m.group(1))
        reading = int(m.group(2))

        # Transform the reading into the corresponding biomass value.
        value = probe_reading_to_value(reading)

        logging.info("Recording PROBE layer=%s value=%s", layer_id, value)

        reading = database_manager.PROBEReading(
            timestamp=datetime.now(),
            value=value,
        )
        database_manager.log_probe_reading(layer_id, reading)
        return

    # pH + Conductivity message: ph-cond:<raw_ph>:<raw_cond>
    if m := PHCOND_RE.match(msg):
        raw_ph = int(m.group(1))
        raw_cond = int(m.group(2))

        ph_value = ph_reading_to_value(raw_ph)
        conductivity_value = conductivity_reading_to_value(raw_cond)

        logging.info("Recording pH=%s conductivity=%s", ph_value, conductivity_value)

        # Crucial: keyword args for Pydantic model
        phc = database_manager.PHConductivityReading(
            timestamp=datetime.now(),
            ph=ph_value,
            conductivity=conductivity_value,
        )
        database_manager.log_ph_conductivity_reading(phc)
        return

    # Unknown payload
    logging.warning("Unrecognized message payload: %s", msg)


def on_publish(client, userdata, mid):
    logging.info("message published mid=%s", mid)


# --- Outbound command helpers --------------------------------------------------
def blink_led():
    cmd = "blink_led"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def open_valve(layer_id):
    cmd = f"open_valve_{layer_id}"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def close_valve(layer_id):
    cmd = f"close_valve_{layer_id}"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def light_on(layer_id):
    cmd = f"light_on_{layer_id}"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def light_off(layer_id):
    cmd = f"light_off_{layer_id}"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def all_lights_on():
    cmd = "all_lights_on"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def all_lights_off():
    cmd = "all_lights_off"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def all_valves_on():
    cmd = "all_valves_on"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def all_valves_off():
    cmd = "all_valves_off"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def start_pump(value):
    cmd = f"start_pump:{value}"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def stop_pump():
    cmd = "stop_pump"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def peristaltic_on(id_: int):
    cmd = f"peristaltic_on:{id_}"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def peristaltic_off(id_: int):
    cmd = f"peristaltic_off:{id_}"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def additive_mixing_on():
    cmd = "additive_mixing_on"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def additive_mixing_off():
    cmd = "additive_mixing_off"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def reservoir_mixing_on():
    cmd = "reservoir_mixing_on"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def reservoir_mixing_off():
    cmd = "reservoir_mixing_off"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def trigger_ph_cond_measurement():
    cmd = "trigger_ph_cond_measurement"
    logging.info(cmd)
    client.publish(send_to_pump_esp_topic(), cmd, qos=QOS)


def trigger_probe_measurement():
    cmd = "trigger_probe_measurement"
    logging.info(cmd)
    client.publish(send_to_rack_esp_topic(), cmd, qos=QOS)


def harvest_layer(layer_id: int, duration_seconds: int):
    # Stub kept for future orchestration
    pass


# --- Client setup -------------------------------------------------------------
client = mqtt.Client(
    client_id="ClientA",
    clean_session=CLEAN_SESSION,
)
client.on_connect = on_connect
client.on_message = on_message
client.on_subscribe = on_subscribe
client.on_disconnect = on_disconnect
client.on_publish = on_publish

client.connect(broker, port, keepalive=60)
# loop_start() will run the network loop in a thread and call our callbacks.
client.loop_start()

# Optional: if you still want explicit subscriptions outside on_connect,
# you can leave these; on reconnect the on_connect subscription will handle it.
client.subscribe(receive_from_rack_esp_topic(), qos=QOS)
client.subscribe(receive_from_pump_esp_topic(), qos=QOS)
