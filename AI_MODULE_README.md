# AI Module - Eco-Passenger Flow Optimization System

Complete AI pipeline for real-time face detection and eco-metrics calculation.

## 📁 Files Created

1. **`face_detector.py`** - MediaPipe-based face detection module
2. **`utils.py`** - Eco-metrics calculation utilities
3. **`test_ai_module.py`** - Test script with live webcam demo

## 🚀 Quick Start

### Installation

```bash
pip install opencv-python mediapipe numpy
```

### Run the Test

```bash
# Full test with webcam
python test_ai_module.py

# Test utilities only (no webcam)
python test_ai_module.py --test-utils
```

### Controls During Test
- Press **`q`** to quit
- Press **`s`** to save screenshot

## 📚 Module Usage

### Face Detection

```python
from face_detector import FaceDetector
import cv2

# Initialize detector
detector = FaceDetector(min_detection_confidence=0.5)

# Use with webcam
cap = cv2.VideoCapture(0)
ret, frame = cap.read()

# Detect faces
annotated_frame, detections = detector.detect(frame)

# Get face count
num_faces = detector.get_face_count()

# Cleanup
detector.release()
cap.release()
```

### Eco-Metrics Calculation

```python
from utils import get_eco_metrics_summary, estimate_crowd_density

# Get complete metrics
metrics = get_eco_metrics_summary(num_faces=5, distance_m=1000)

print(f"CO2 Saved: {metrics['co2_saved_readable']}")
print(f"Density: {metrics['density_label']}")
print(f"Energy Saved: {metrics['energy_saved']} units")

# Get crowd density only
density_label, density_index = estimate_crowd_density(num_faces=5)
```

## 🎯 Features

### FaceDetector Class
- **Real-time detection** at 30 FPS
- **Low CPU usage** (no GPU required)
- **Annotated output** with bounding boxes
- **Detection data** with confidence scores
- **Context manager support** for automatic cleanup

### Utility Functions
- `calc_co2_saved_by_walking(distance_m)` - Calculate CO2 savings
- `human_readable_co2(kg)` - Format CO2 values
- `estimate_walk_time(distance_m)` - Calculate walking time
- `estimate_calories_burned(distance_m)` - Calculate calories
- `estimate_crowd_density(num_faces)` - Classify crowd density
- `estimate_energy_saved(density_index)` - Calculate energy savings
- `get_eco_metrics_summary(num_faces, distance_m)` - Get all metrics at once

## 📊 Output Format

### Detection Output
```python
detections = [
    {
        'x': 120,
        'y': 80,
        'width': 150,
        'height': 180,
        'confidence': 0.95
    },
    # ... more detections
]
```

### Metrics Output
```python
metrics = {
    'num_faces': 5,
    'density_label': 'Medium',
    'density_index': 0.5,
    'co2_saved_kg': 0.171,
    'co2_saved_readable': '171 g',
    'walk_time': '11 min',
    'calories': 50,
    'energy_saved': 50.0,
    'distance_km': 1.0
}
```

## ⚙️ Performance Specs

- **Target FPS**: 30 FPS
- **Resolution**: 640x480 (configurable)
- **CPU Usage**: Low (optimized for real-time)
- **GPU Dependency**: None
- **Model**: MediaPipe Face Detection (short-range)

## 🔗 Integration with Streamlit

These modules are ready for Streamlit integration:

```python
import streamlit as st
from face_detector import FaceDetector
from utils import get_eco_metrics_summary

# Initialize in session state
if 'detector' not in st.session_state:
    st.session_state.detector = FaceDetector()

# Use with st.camera_input or cv2 VideoCapture
# All functions return clean values for direct display
```

## 📝 Notes

- Face detection only (no recognition/identification)
- All eco-metrics use realistic environmental constants
- Optimized for indoor webcam scenarios (2m range)
- Thread-safe and can be used in multi-threaded applications

## 🐛 Troubleshooting

**Webcam not opening:**
- Check camera permissions
- Ensure no other app is using the webcam
- Try changing camera index: `cv2.VideoCapture(1)`

**Low FPS:**
- Reduce frame resolution
- Close other applications
- Lower `min_detection_confidence` parameter

**Import errors:**
- Ensure all dependencies are installed: `pip install opencv-python mediapipe numpy`

