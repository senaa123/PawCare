# PawCare 🐾  
### AI-Powered Smart Cat Monitoring & Home Automation System

PawCare is a state-of-the-art, multi-tenant pet monitoring platform that integrates **Edge AI Computer Vision**, **ResNet18 Cat Face Identification**, **EfficientNet 60-Breed Classification**, real-time **WebSocket Telemetry**, and a sleek **Desktop Dashboard App**.

---

## 🌟 Key Architecture & System Components

PawCare is built with a decoupled, high-performance architecture split into three core modules:

```text
┌─────────────────────────┐      REST API & WebSockets       ┌─────────────────────────┐
│     Desktop Dashboard   │  ◄────────────────────────────►  │     FastAPI Backend     │
│   Electron + React +    │                                  │  SQLAlchemy + PostgreSQL│
│     Tailwind CSS        │  ◄──────┐                        │  APScheduler + EventBus │
└─────────────────────────┘         │                        └─────────────────────────┘
                                    │ Live MJPEG Feed                    ▲
                                    │ (http://localhost:8765)            │ Detections Ingest
                                    │                                    │ (HTTP POST)
                         ┌──────────┴──────────────┐                     │
                         │     Edge AI Node        │ ────────────────────┘
                         │   YOLOv8 + ResNet18     │
                         │   Behavior Tracking     │
                         └─────────────────────────┘
```

### 1. 🖥️ **Desktop Client (`/desktop`)**
- Built with **Electron**, **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.
- Features an ultra-modern UI with seamless window titlebar integration (`titleBarOverlay`), tabbed navigation, real-time WebSocket connection handling, interactive cat profile management, and live camera feed viewing.

### 2. ⚡ **FastAPI Backend Server (`/Backend`)**
- Built with **Python 3.10+**, **FastAPI**, **SQLAlchemy (Async)**, and **JWT Auth**.
- **Real-Time EventBus & WebSockets**: Broadcasts live detection events and automated alert notifications.
- **AI Vision Services**:
  - **Breed Classification**: Fine-grained EfficientNet-B2 ONNX model classifying across 60 cat breeds with JSON label mapping (`cat_breed_labels.json`).
  - **Face Enrollment**: ResNet18 feature extraction generating 512-dimensional normalized face embeddings for individual cat identification.
- **Automation Rules Engine**: Evaluates conditions (e.g. cat sitting/standing, un-enrolled cat present, excessive motion) and dispatches alert notifications or automated routines.

### 3. 🎥 **Edge AI Camera Node (`/edge_node`)**
- **YOLOv8 Behavior Model**: Performs single-pass cat detection, tracking (`track_id`), and behavior classification (`lying`, `sitting`, `standing`).
- **ResNet Face Matcher**: Downloads user cat embeddings on startup and matches live camera frame bounding boxes against registered cats using cosine similarity matching (CUDA/GPU accelerated).
- **MJPEG Streaming Engine**: Serves live annotated video frames with bounding boxes and track labels on `http://localhost:8765/video_feed`.

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.10+** (with CUDA enabled PyTorch optional for GPU acceleration)
- **Node.js 18+** & **npm**

---

### 1. Start the Backend API Server

```bash
cd Backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
> The API server will run at `http://localhost:8000` with interactive API docs at `http://localhost:8000/docs`.

---

### 2. Start the Desktop App

```bash
cd desktop
npm install
npm run dev
```
> Electron will launch the PawCare desktop app. Log in or create a user account to get started.

---

### 3. Start the Edge Camera AI Worker

From the desktop app's **Live Monitor** page:
- Click **"Start Built-in Camera"** (spawns the edge node worker automatically with GPU/CPU toggle and face recognition options).

Alternatively, launch manually from the command line:

```bash
cd edge_node
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

python main_camera.py --backend http://localhost:8000 --email your@email.com --password yourpassword --enable-face
```

---

## 🐱 AI Vision Capabilities

| Task | Architecture / Model | Input Resolution | Performance |
|---|---|---|---|
| **Cat Behavior & Detection** | YOLOv8 Custom Backbone | Dynamic Video Frame | ~30 FPS Real-time |
| **Cat Face Embeddings** | ResNet18 Backbone (`.pth`) | `224×224` | 512-D L2 Normalized |
| **Breed Classification** | EfficientNet-B2 ONNX (`.onnx`) | `260×260` | 60 Fine-grained Breeds |

---

## 📁 Repository Structure

```text
PawCare/
├── Backend/                    # FastAPI Backend REST & WebSockets
│   ├── app/
│   │   ├── ai/                 # Vision models (Breed & Face recognition)
│   │   ├── api/routes/         # Auth, Cats, Detections, Alerts, Analytics
│   │   ├── automation/         # EventBus & Rules Engine
│   │   └── database/           # SQLAlchemy models & migrations
│   └── requirements.txt
├── desktop/                    # Electron + React Client
│   ├── src/main/               # Electron Main Process & IPC
│   ├── src/renderer/           # React Pages, Components & Stores
│   └── package.json
├── edge_node/                  # Edge AI Worker Node
│   ├── ai/                     # YOLOv8 behavior & face matching
│   ├── main_camera.py          # Camera loop & MJPEG server
│   └── requirements.txt
├── README.md                   # System Documentation
└── .gitignore                  # Git Ignore Rules
```

---

## 🛡️ License
Licensed under the [MIT License](LICENSE).