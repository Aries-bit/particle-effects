import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { FilesetResolver, HandLandmarker, FaceLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

// ---- Three.js Setup ----
const numPoints = 8000;
let scene, camera, renderer, particles;
let geometry, material;
let clock = new THREE.Clock();

const states = {
    DEFAULT: new Float32Array(numPoints * 3),
    ZERO: new Float32Array(numPoints * 3),
    ONE: new Float32Array(numPoints * 3),
    TWO: new Float32Array(numPoints * 3),
    THREE: new Float32Array(numPoints * 3),
    FOUR: new Float32Array(numPoints * 3),
    HEART: new Float32Array(numPoints * 3),
    STAR: new Float32Array(numPoints * 3),
    FACE: new Float32Array(numPoints * 3) // For Face Mask
};

let currentMode = 'FINGER'; // 'FINGER' or 'MASK'
let currentState = 'DEFAULT';
let currentScale = 1.0;
let targetScale = 1.0;

let currentHue = 0.5;
let targetHue = 0.5;
let interactionPoint = new THREE.Vector3(0, 0, 0);
let interactionForce = 0; // >0 attract, <0 repel

let currentPositions = new Float32Array(numPoints * 3);
let randomOffsets = new Float32Array(numPoints * 3);

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 25;

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create default random sphere
    for (let i = 0; i < numPoints; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = 10 * Math.cbrt(Math.random());

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        states.DEFAULT[i * 3] = x;
        states.DEFAULT[i * 3 + 1] = y;
        states.DEFAULT[i * 3 + 2] = z;

        currentPositions[i * 3] = x;
        currentPositions[i * 3 + 1] = y;
        currentPositions[i * 3 + 2] = z;

        randomOffsets[i * 3] = (Math.random() - 0.5) * 2;
        randomOffsets[i * 3 + 1] = (Math.random() - 0.5) * 2;
        randomOffsets[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));
    
    const colors = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
        const color = new THREE.Color();
        color.setHSL(0, 0, 0.4 + Math.random() * 0.6); // Grayscale
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function loadFontsAndTargets() {
    return new Promise((resolve) => {
        const loader = new FontLoader();
        loader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json', function (font) {
            
            function createTextTargets(text, targetArray) {
                const textGeo = new TextGeometry(text, {
                    font: font,
                    size: 8,
                    height: 2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.5,
                    bevelSize: 0.3,
                    bevelSegments: 3
                });
                
                textGeo.computeBoundingBox();
                const centerOffset = -0.5 * (textGeo.boundingBox.max.x - textGeo.boundingBox.min.x);
                const centerYOffset = -0.5 * (textGeo.boundingBox.max.y - textGeo.boundingBox.min.y);
                textGeo.translate(centerOffset, centerYOffset, 0);

                const mesh = new THREE.Mesh(textGeo, new THREE.MeshBasicMaterial());
                const sampler = new MeshSurfaceSampler(mesh).build();
                
                const tempPosition = new THREE.Vector3();
                for (let i = 0; i < numPoints; i++) {
                    sampler.sample(tempPosition);
                    targetArray[i * 3] = tempPosition.x;
                    targetArray[i * 3 + 1] = tempPosition.y;
                    targetArray[i * 3 + 2] = tempPosition.z;
                }
            }

            createTextTargets('0', states.ZERO);
            createTextTargets('1', states.ONE);
            createTextTargets('2', states.TWO);
            createTextTargets('3', states.THREE);
            createTextTargets('4', states.FOUR);
            
            // Create Heart Targets
            for (let i = 0; i < numPoints; i++) {
                const t = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random());
                const x = r * 16 * Math.pow(Math.sin(t), 3);
                const y = r * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                states.HEART[i * 3] = x * 0.4;
                states.HEART[i * 3 + 1] = y * 0.4 + 2;
                states.HEART[i * 3 + 2] = (Math.random() - 0.5) * 2;
            }

            // Create Star Targets
            for (let i = 0; i < numPoints; i++) {
                const branch = Math.floor(Math.random() * 5);
                const theta = (branch / 5) * Math.PI * 2 - Math.PI / 2;
                const dist = Math.random() * 10;
                const spread = (1 - dist / 10) * (Math.random() - 0.5) * 4;
                states.STAR[i * 3] = Math.cos(theta) * dist - Math.sin(theta) * spread;
                states.STAR[i * 3 + 1] = Math.sin(theta) * dist + Math.cos(theta) * spread;
                states.STAR[i * 3 + 2] = (Math.random() - 0.5) * 2;
            }
            
            resolve();
        });
    });
}

// ---- AI & MediaPipe Setup ----
let handLandmarker;
let faceLandmarker;
let video;
let isVideoReady = false;

async function initMediaPipe() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        // Hand model
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "./models/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 2
        });

        // Face model
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "./models/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });

        video = document.getElementById('webcam');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.addEventListener('loadeddata', () => {
                isVideoReady = true;
                const loadingEl = document.getElementById('loading');
                if (loadingEl) loadingEl.style.display = 'none';
            });
        } else {
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.innerText = '无法访问摄像头';
        }
    } catch (error) {
        console.error("Error loading MediaPipe models:", error);
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerText = '模型加载失败，请检查网络（部分CDN在国内可能不稳定）';
            loadingEl.style.color = '#ff3366';
        }
    }
}

// ---- Voice Recognition ----
function initSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const debugEl = document.getElementById('speech-debug');
    const voiceStatusEl = document.getElementById('voice-status');
    
    if (!SpeechRecognition) {
        if (debugEl) debugEl.innerText = "抱歉，此浏览器不支持语音识别";
        if (voiceStatusEl) voiceStatusEl.innerText = "不支持识别";
        return;
    }

    const recognition = new SpeechRecognition();
    // 使用中文能更好地在当前系统环境下被触发，即使说英文词，浏览器也会尝试去拼写出来
    recognition.lang = 'zh-CN'; 
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        if (debugEl) debugEl.innerText = "🎤 麦克风已就绪，请说话...";
        if (voiceStatusEl) voiceStatusEl.innerText = "正在聆听...";
    };

    recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        if (debugEl) debugEl.innerText = "❌ 语音识别出错: " + event.error;
        if (voiceStatusEl) voiceStatusEl.innerText = "识别错误";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Combine text and show it exactly as heard
        const rawText = (finalTranscript || interimTranscript).trim();
        const text = rawText.toLowerCase();
        
        // Ensure UI updates immediately with what the browser actually hears
        if (rawText.length > 0) {
            if (debugEl) debugEl.innerText = `[原声抓取]: "${rawText}"`;
            if (voiceStatusEl) voiceStatusEl.innerText = `听见: ${rawText.substring(0, 10)}`;
        }

        // Keywords for MASK mode
        const maskKeywords = ['mask', 'make', 'mac', 'marc', '面具', '马克', '码可'];
        // Keywords for FINGER mode
        const fingerKeywords = ['finger', 'hand', 'fine', 'thing', '手指', '手势', '返回'];

        // Find the index of the latest occurrence of each keyword to know which was spoken last
        let lastMaskIndex = -1;
        maskKeywords.forEach(k => {
            const idx = text.lastIndexOf(k);
            if (idx > lastMaskIndex) lastMaskIndex = idx;
        });

        let lastFingerIndex = -1;
        fingerKeywords.forEach(k => {
            const idx = text.lastIndexOf(k);
            if (idx > lastFingerIndex) lastFingerIndex = idx;
        });

        // Switch to whichever command was spoken LAST
        if (lastMaskIndex > -1 || lastFingerIndex > -1) {
            if (lastMaskIndex > lastFingerIndex) {
                if (currentMode !== 'MASK') {
                    switchMode('MASK');
                    if (debugEl) debugEl.innerText = "✅ 命中关键词！已切换到: MASK 模式";
                }
            } else {
                if (currentMode !== 'FINGER') {
                    switchMode('FINGER');
                    if (debugEl) debugEl.innerText = "✅ 命中关键词！已切换到: FINGER 模式";
                }
            }
        }
    };

    // If it stops, restart immediately
    recognition.onend = () => {
        try {
            recognition.start();
        } catch (e) {
            console.log("Restarting recognition...");
        }
    };

    try {
        recognition.start();
    } catch (e) {
        console.error("Failed to start speech recognition:", e);
    }
}

function switchMode(mode) {
    currentMode = mode;
    const modeEl = document.getElementById('current-mode');
    if (mode === 'MASK') {
        modeEl.innerText = 'MASK (面具模式)';
        modeEl.style.color = '#ff3366';
        currentState = 'FACE';
    } else {
        modeEl.innerText = 'FINGER (手势模式)';
        modeEl.style.color = '#ffcc00';
        currentState = 'DEFAULT';
    }
}

// Face Mask Logic
function processFaceLandmarks(results) {
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) return;

    const landmarks = results.faceLandmarks[0];
    const vFov = 75 * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * 25;
    const width = height * (window.innerWidth / window.innerHeight);

    // Sample face mesh (478 points available, we map them to 8000 particles)
    for (let i = 0; i < numPoints; i++) {
        const lmIdx = i % landmarks.length;
        const lm = landmarks[lmIdx];
        
        // Map to world coordinates
        const x = -(lm.x - 0.5) * width;
        const y = -(lm.y - 0.5) * height;
        const z = -lm.z * width; // Z depth

        states.FACE[i * 3] = x;
        states.FACE[i * 3 + 1] = y;
        states.FACE[i * 3 + 2] = z;
    }

    // Dynamic response (using blendshapes)
    if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        const shapes = results.faceBlendshapes[0].categories;
        const jawOpen = shapes.find(s => s.categoryName === 'jawOpen')?.score || 0;
        const eyeBlinkL = shapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score || 0;
        const eyeBlinkR = shapes.find(s => s.categoryName === 'eyeBlinkRight')?.score || 0;

        // Increase scale or noise when jaw is open
        targetScale = 1.0 + jawOpen * 0.5;
        targetHue = 0.5 + (eyeBlinkL + eyeBlinkR) * 0.2;
    }
}

// Hand Gesture Logic
function processHandLandmarks(results) {
    if (!results.landmarks || results.landmarks.length === 0) {
        currentState = 'DEFAULT';
        targetScale = 1.0;
        interactionForce = 0;
        document.getElementById('hand-status').innerText = '无';
        return;
    }

    let totalOpenness = 0;
    let mainHandState = 'DEFAULT';
    let force = 0;
    let iPoint = new THREE.Vector3();
    let activeHue = targetHue;

    const vFov = 75 * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * 25;
    const width = height * (window.innerWidth / window.innerHeight);

    let isTwoHandHeart = false;
    if (results.landmarks.length === 2) {
        const h1 = results.landmarks[0];
        const h2 = results.landmarks[1];
        if (Math.hypot(h1[8].x - h2[8].x, h1[8].y - h2[8].y) < 0.08) {
            isTwoHandHeart = true;
            mainHandState = 'HEART';
        }
    }

    for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const wrist = landmarks[0];
        const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        let avgDist = 0;
        tips.forEach(tip => avgDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y));
        avgDist /= tips.length;
        totalOpenness += avgDist;

        const middleBase = landmarks[9];
        const angle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x);
        activeHue = (angle + Math.PI) / (Math.PI * 2);

        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;
        const isPinkyUp = landmarks[20].y < landmarks[18].y;
        const isThumbOut = Math.hypot(landmarks[4].x - landmarks[5].x, landmarks[4].y - landmarks[5].y) > 0.08;

        if (!isTwoHandHeart && i === 0) {
            // Star gesture: Index and Pinky up (Rock/Spider-man sign)
            if (isIndexUp && !isMiddleUp && !isRingUp && isPinkyUp) {
                mainHandState = 'STAR'; 
            } else if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
                mainHandState = 'ZERO'; // Fist
            } else if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp && !isThumbOut) {
                mainHandState = 'ONE';
                iPoint.set(-(landmarks[8].x - 0.5) * width, -(landmarks[8].y - 0.5) * height, 0);
                force = 0.8;
            } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
                mainHandState = 'TWO';
            } else if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
                mainHandState = 'THREE';
            } else if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp && !isThumbOut) {
                mainHandState = 'FOUR';
            }
            
            if (mainHandState === 'DEFAULT' && isIndexUp && isMiddleUp && isRingUp && isPinkyUp && isThumbOut && avgDist > 0.3) {
                iPoint.set(-(landmarks[9].x - 0.5) * width, -(landmarks[9].y - 0.5) * height, 0);
                force = -1.5;
            }
        }
    }

    currentState = isTwoHandHeart ? 'HEART' : mainHandState;
    targetHue = activeHue;
    interactionPoint.copy(iPoint);
    interactionForce = force;
    
    const avgOpenness = totalOpenness / results.landmarks.length;
    targetScale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(avgOpenness, 0.1, 0.3, 0.5, 2.0), 0.3, 3.0);
    
    const uiStateMap = {
        'DEFAULT': '无',
        'ZERO': '数字 0 (握拳)',
        'ONE': '数字 1 (引力)',
        'TWO': '数字 2',
        'THREE': '数字 3',
        'FOUR': '数字 4',
        'STAR': '星星 (食指和小指)',
        'HEART': '爱心 (双手指尖相接)'
    };
    
    let stateText = uiStateMap[currentState] || currentState;
    if (interactionForce < 0) {
        stateText += ' + 掌心斥力';
    }
    
    document.getElementById('hand-status').innerText = stateText;
}

// ---- Animation Loop ----
let lastVideoTime = -1;

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    if (isVideoReady) {
        const currentVideoTime = video.currentTime;
        if (currentVideoTime !== lastVideoTime) {
            if (currentMode === 'MASK' && faceLandmarker) {
                const results = faceLandmarker.detectForVideo(video, performance.now());
                processFaceLandmarks(results);
            } else if (currentMode === 'FINGER' && handLandmarker) {
                const results = handLandmarker.detectForVideo(video, performance.now());
                processHandLandmarks(results);
            }
            lastVideoTime = currentVideoTime;
        }
    }

    currentScale += (targetScale - currentScale) * 0.1;
    let hueDiff = targetHue - currentHue;
    if (hueDiff > 0.5) hueDiff -= 1.0;
    if (hueDiff < -0.5) hueDiff += 1.0;
    currentHue += hueDiff * 0.05;
    material.color.setHSL(currentHue, 0.8, 0.6);

    const positions = geometry.attributes.position.array;
    const targetArr = states[currentState];

    for (let i = 0; i < numPoints; i++) {
        const idxX = i * 3;
        const idxY = i * 3 + 1;
        const idxZ = i * 3 + 2;

        let tx = targetArr[idxX] * currentScale;
        let ty = targetArr[idxY] * currentScale;
        let tz = targetArr[idxZ] * (currentMode === 'MASK' ? 1.0 : currentScale);

        if (interactionForce !== 0 && currentMode === 'FINGER') {
            const dx = interactionPoint.x - positions[idxX];
            const dy = interactionPoint.y - positions[idxY];
            const dz = interactionPoint.z - positions[idxZ];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const radius = interactionForce > 0 ? 12 : 25;
            if (dist < radius && dist > 0.1) {
                const f = interactionForce * (1 - dist / radius);
                tx += dx * f; ty += dy * f; tz += dz * f;
            }
        }

        const noise = (currentState === 'DEFAULT' || currentState === 'FACE') ? 0.5 : 0.1;
        tx += Math.sin(time * 2 + randomOffsets[idxX]) * noise;
        ty += Math.cos(time * 2 + randomOffsets[idxY]) * noise;
        tz += Math.sin(time * 2 + randomOffsets[idxZ]) * noise;

        positions[idxX] += (tx - positions[idxX]) * 0.1;
        positions[idxY] += (ty - positions[idxY]) * 0.1;
        positions[idxZ] += (tz - positions[idxZ]) * 0.1;
    }

    geometry.attributes.position.needsUpdate = true;
    particles.rotation.y = Math.sin(time * 0.1) * 0.1;
    renderer.render(scene, camera);
}

// Start
async function init() {
    initThree();
    await loadFontsAndTargets();
    await initMediaPipe();
    initSpeech();
    animate();
}
init();
