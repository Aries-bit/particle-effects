# 3D Particle Gesture Interaction System 🌟

A highly interactive WebGL application that combines **Three.js** and **MediaPipe** to create a stunning 3D particle system controlled entirely by your hands and voice. 

![Project Preview](https://img.shields.io/badge/Status-Active-brightgreen) ![Tech Stack](https://img.shields.io/badge/Tech-Three.js%20%7C%20MediaPipe-blue)

👉 **[Live Demo / 点击直接体验](https://aries-bit.github.io/particle-effects/)**

---

## ✨ Features (功能特性)

This project features 8,000 dynamic particles that respond in real-time to your webcam input through two distinct modes:

### 🖐️ 1. Finger Mode (手势控制模式)
Use your hands to shape and manipulate the particles:
*   **0~4 Numbers (数字形)**: Show 0 to 4 fingers to make the particles form the corresponding numbers.
*   **Gravity Field (引力场)**: Extend only your index finger to attract the particles to your fingertip.
*   **Repulsion Field (斥力场)**: Push a fully open palm toward the camera to repel the particles.
*   **Magic Star (魔法星)**: Use the "Rock" sign (index + pinky) to create a 3D star.
*   **Heart (比心心)**: Bring the tips of both your index fingers and thumbs together to form a heart.
*   **The Taunt (嘲讽键)**: Flip the bird (middle finger only) for a special text surprise.
*   **Color Tinting (转腕变色)**: Rotate your wrist to seamlessly shift the color hue of the entire particle swarm.

### 🎭 2. Face Mask Mode (粒子面具模式)
The particles will snap to your face, creating a digital 3D mask that tracks your facial expressions:
*   **Jaw Open**: Opening your mouth will cause the mask particles to expand and increase in noise/jitter.
*   **Blinking**: Blinking your eyes will dynamically shift the color hue of the mask.

### 🎙️ Voice Control (语音无缝切换)
You don't need to touch the mouse or keyboard to switch modes. Just use your voice!
*   Say **"Mask"** (or "面具") to switch to Face Mask mode.
*   Say **"Finger"** (or "手指", "返回") to switch back to Gesture mode.
*   *(Note: A real-time transcript is displayed at the bottom of the screen to help you debug what the browser is hearing).*

---

## 🛠️ Technology Stack (技术栈)

*   **Three.js**: Used for rendering the 3D WebGL scene, particle geometries, and smooth interpolation math.
*   **MediaPipe Tasks Vision**: Powers the highly optimized, in-browser machine learning models for `HandLandmarker` and `FaceLandmarker`.
*   **Web Speech API**: Provides continuous, native voice recognition.
*   **Vanilla JS + HTML/CSS**: No heavy frontend frameworks required. Just pure, lightweight JavaScript.

---

## 🚀 How to Run Locally (本地运行)

Because this project uses ES Modules and accesses the webcam, it **must** be run through a local HTTP server. Simply opening the `index.html` file via `file://` protocol will result in CORS errors and denied camera permissions.

1.  Clone this repository:
    ```bash
    git clone https://github.com/Aries-bit/particle-effects.git
    cd particle-effects
    ```
2.  Start a local Python server (Python 3.x required):
    ```bash
    python -m http.server 8000
    ```
3.  Open your browser and navigate to:
    ```text
    http://localhost:8000/
    ```

*(Note: Ensure you allow the browser access to both your **Camera** and **Microphone** when prompted).*

---

## 📂 File Structure (目录结构)

```text
.
├── index.html        # Main entry point and UI overlay
├── main.js           # Core logic (Three.js rendering, MediaPipe tracking, Voice API)
└── models/           # Self-hosted MediaPipe ML models
    ├── face_landmarker.task
    └── hand_landmarker.task
```
*(The AI models are self-hosted within the `models/` directory to guarantee fast and reliable loading, avoiding CDN timeouts in certain regions).*

---

## 🤝 Credits & Acknowledgements

*   Built with [Three.js](https://threejs.org/)
*   Hand and Face tracking powered by Google's [MediaPipe](https://developers.google.com/mediapipe)

Enjoy playing with the particles! 🎮