# PawCare Edge Node

The edge node runs next to the camera and microphone. It owns heavy AI
inference, then sends compact JSON events to the FastAPI backend.

Run the current camera worker from the repo root:

```powershell
python edge_node/main_camera.py --email you@example.com --password yourpass --show
```

Run with the Roboflow behavior model enabled:

```powershell
$env:ROBOFLOW_API_KEY="your-key"
python edge_node/main_camera.py --email you@example.com --password yourpass --show --enable-behavior
```

Current event shape:

```json
{
  "label": "cat",
  "confidence": 0.95,
  "bbox": [120, 80, 420, 360],
  "track_id": "1",
  "cat_id": "optional-cat-uuid",
  "behavior": "optional-behavior",
  "sound": "optional-sound",
  "emotion": "optional-emotion"
}
```

Keep model files in `Backend/app/ai/models` for now so existing backend code
still works. When the edge pipeline is complete, move the detector/audio model
files into `edge_node/ai/models` and remove server-side camera inference.

Model responsibility:

- YOLO/cat detector: finds cats in the frame.
- Face recognition model: maps a detected cat to a registered `cat_id`.
- Roboflow behavior model: classifies current movement/posture.
- Routine anomaly detector: runs in the backend against stored activity history
  after the cat has 2-3 days of baseline data.
