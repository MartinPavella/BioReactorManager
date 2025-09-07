import logging
import time
from datetime import datetime

import numpy as np
import paho.mqtt.client as mqtt

import probe_manager

broker = '192.168.0.102'
port = 1883
QOS = 1
CLEAN_SESSION = True
logging.basicConfig(level=logging.INFO)  # error logging


def send_to_rack_esp_topic(rack=0):
    return f'server_to_esp/rack{rack}'


def receive_from_rack_esp_topic(rack=0):
    return f'esp_to_server/rack{rack}'


def send_to_pump_esp_topic():
    return 'server_to_esp/pump'


def receive_from_pump_esp_topic():
    return 'esp_to_server/pump'


# use DEBUG,INFO,WARNING
def on_subscribe(client, userdata, mid, granted_qos):  # create function for callback
    logging.info(f'SUBSCRIBED from: {str(mid)}')
    time.sleep(1)


def on_disconnect(client, userdata, rc=0):
    logging.info('DISCONNECTED. Code: ' + str(rc))


def on_connect(client, userdata, flags, rc):
    logging.info('CONNECTED flags' + str(flags) + 'result code ' + str(rc))


def on_message(client, userdata, message):
    msg = str(message.payload.decode('utf-8'))
    logging.info('Recieved from ' + message.topic + f': `{msg}`')

    # Classify the message and react accordingly.
    if msg[:6] == 'PROBE[':
        # TODO The probe data should not be sent automatically. The server should request the data everytime.
        # Data submitted from PROBE reading. The format is: "PROBE[<layer_id>]:<read_value>"
        layer = int(msg[6])
        value = int(msg[9:])
        probe_manager.log_probe_reading(layer, probe_manager.ProbeReading(datetime.now(), value))


def on_publish(client, userdata, mid):
    logging.info('message published ' + str(mid))


def blink_led():
    command = 'blink_led'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def open_valve(layer_id):
    command = f'open_valve_{layer_id}'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def close_valve(layer_id):
    command = f'close_valve_{layer_id}'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def light_on(layer_id):
    command = f'light_on_{layer_id}'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def light_off(layer_id):
    command = f'light_off_{layer_id}'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def all_lights_on():
    command = 'all_lights_on'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def all_lights_off():
    command = 'all_lights_off'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def all_valves_on():
    command = 'all_valves_on'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def all_valves_off():
    command = 'all_valves_off'
    logging.info(command)
    client.publish(send_to_rack_esp_topic(), command)


def start_pump(value):
    command = f'start_pump:{value}'
    logging.info(command)
    client.publish(send_to_pump_esp_topic(), command)


def stop_pump():
    command = 'stop_pump'
    logging.info(command)
    client.publish(send_to_pump_esp_topic(), command)


def harvest_layer(layer_id: int, duration_seconds: int):
    logging.info(f'START harvesting layer {layer_id}.')
    open_valve(layer_id)
    start_pump()
    time.sleep(duration_seconds)  # Pumping.
    stop_pump()
    time.sleep(1)  # Prevent pressure spikes.
    close_valve(layer_id)
    logging.info(f'STOP harvesting layer {layer_id}.')


client = mqtt.Client('ClientA', False)  # create client object
client.connect(broker, port)  # establish connection
time.sleep(1)
client.loop_start()
client.subscribe(receive_from_rack_esp_topic())

# client.on_subscribe = on_subscribe   #assign function to callback
# client.on_disconnect = on_disconnect #assign function to callback
# client.on_connect = on_connect #assign function to callback
client.on_message = on_message

if __name__ == '__main__':
    # count = 1
    while True:  # runs forever break with CTRL+C
        print('publishing to `', send_to_rack_esp_topic() + '`')
        # msg = 'Sprava od A: ' + str(count)
        # count += 1

        rnd = np.random.random()
        msg = 'blink_led' if rnd < 0.5 else 'open_valve'
        # msg = 'step'
        client.publish(send_to_rack_esp_topic(), msg)

        time.sleep(np.random.randint(5, 8))

# client.disconnect()
# client.loop_stop()
