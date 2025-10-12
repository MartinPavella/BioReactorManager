# BioReactorManager

**Autonomous Duckweed Cultivator — Raspberry Pi Server**

This repository contains the **server and user interface software** for the autonomous duckweed cultivator developed by the [iGEM Brno 2025 team](https://2025.igem.wiki/brno-czech-republic/).  
It runs on a **Raspberry Pi** and serves as the central controller of the bioreactor system — managing MQTT communication with ESP32 nodes, processing sensor data, and providing a web-based GUI for local monitoring and control.

---

## Overview

The project consists of:
- 🌿 **ReactJS Frontend** — modern, responsive web interface for control and visualization.
- ⚙️ **FastAPI Backend** — lightweight Python REST API that handles logic, data flow, and MQTT communication.
- 🐳 **Docker-based Deployment** — easy and reproducible setup for Raspberry Pi, including all dependencies.

The system is designed to operate **fully offline**, allowing the cultivator to run autonomously in environments without internet access.

---

## System Architecture

| Component | Role | Technology |
|------------|------|------------|
| Frontend | Web-based GUI (control, visualization) | ReactJS + Vite + TailwindCSS |
| Backend | Control logic, data API, MQTT client | FastAPI (Python) |
| MQTT Broker | Message bus for ESP32 communication | Eclipse Mosquitto (Docker service) |
| Database *(optional)* | Persistent state and logging | SQLite or JSON (depending on setup) |
| Hardware Nodes | Lights, pumps, sensors | ESP32 (see [BioReactorNode](https://github.com/MartinPavella/BioReactorNode)) |

---

## Features

- 🧭 **Local web dashboard** — accessible via `http://bioreactor.local:5173`
- 🔌 **MQTT integration** with ESP32 nodes
- 🧪 **Real-time status monitoring** of sensors (PROBE, pH, EC)
- 💡 **Manual and automated control** of lights, valves, and pumps
- 🔒 **Offline-capable**: all components run locally on Raspberry Pi
- 🐳 **Single-command deployment** via Docker Compose

> 💡 To view the web GUI, your computer or phone **must be connected to the same Wi-Fi network** as the Raspberry Pi.

---

## Installation & Usage

### 1️⃣ Prerequisites

- **Raspberry Pi** (any model with Docker support)
- **Docker** and **Docker Compose** installed  
  You can install them with:
  ```bash
  sudo apt update
  sudo apt install docker.io docker-compose -y
  ```

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/MartinPavella/BioReactorManager.git
cd BioReactorManager
```

---

### 3️⃣ Build and Run

Build all containers (frontend, backend, and MQTT broker) and start the system:

```bash
docker compose up --build
```

Once running, the web interface is available locally at:

🔗 **http://bioreactor.local:5173**  

---

### 4️⃣ Access the Containers

To open a shell inside the backend container:
```bash
docker exec -it bioreactor_backend /bin/bash
```

To view logs:
```bash
docker compose logs -f
```

---

## 🛜 Network Configuration

For stable operation, the Raspberry Pi should have a **fixed local address** and act as the **DNS resolver** for your network.

### 1️⃣ Assign a Static IP via DHCP Reservation
In your router’s administration interface:
- Find the Raspberry Pi in the DHCP client list (it usually appears as `raspberrypi`).
- Reserve a **static IP address** for it (e.g., `192.168.0.100`).
- This ensures the Pi always has the same IP after reboot.

> ⚠️ If the Raspberry Pi’s IP changes, ESP32 devices and the web interface may lose connection to the MQTT broker.

### 2️⃣ Use the Raspberry Pi as a DNS Resolver
To make the domain `bioreactor.local` accessible from other devices on the same network:
- Set the **Raspberry Pi’s IP** as the **DNS server** in your router’s configuration.
- Alternatively, if you can’t change router DNS settings, add a manual entry to the `/etc/hosts` file on each device:
  ```
  192.168.0.100   bioreactor.local
  ```

This setup ensures that both ESP32 boards and any user device (laptop, phone, etc.) can access:
- The web interface: `http://bioreactor.local:5173`
- The MQTT broker: `mqtt://bioreactor.local:1883`

---

## Project Structure

```
BioReactorManager/
├── backend/                 # FastAPI backend
│   ├── main.py              # API entrypoint
│   ├── mqtt/                # MQTT connection logic
│   ├── routes/              # API endpoints
│   └── requirements.txt
│
├── frontend/                # React + Vite + Tailwind web app
│   ├── src/                 # Components and pages
│   ├── vite.config.js
│   └── package.json
│
├── docker-compose.yml       # Multi-service deployment
├── Dockerfile.backend       # FastAPI container
├── Dockerfile.frontend      # React build container
└── README.md
```

---

## Communication Overview

The backend connects to the same MQTT broker used by the ESP32 nodes:

| Direction | Topic | Description |
|------------|--------|-------------|
| ESP → Server | `esp_to_server/rack0`, `esp_to_server/pump` | Sensor data (PROBE, pH, EC) |
| Server → ESP | `server_to_esp/rack0`, `server_to_esp/pump` | Control commands (lights, valves, pumps) |

---

## Integration with ESP32 Firmware

This project is designed to work with the firmware from:  
👉 [BioReactorNode Repository](https://github.com/MartinPavella/BioReactorNode)

Together, they form a distributed, modular control system for the bioreactor.

---

## Development Notes

### Frontend (React)
To run locally (without Docker):
```bash
cd frontend
npm install
npm run dev
```

### Backend (FastAPI)
To run locally:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## Hardware & Documentation

Full documentation, circuit diagrams, and project overview are available on our iGEM wiki:  
🔗 [iGEM Brno 2025 Hardware Page](https://2025.igem.wiki/brno-czech-republic/hardware)

---

## License

This project is licensed under the [MIT License](LICENSE).  
You are free to use, modify, and distribute this code for any purpose with attribution.

---

## Authors

Developed by the **iGEM Brno 2025** software and hardware subteams.  
Primary author: **Martin Pavella**
