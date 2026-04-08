import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/vision_bundle.mjs';

// ---- Three.js Setup ----
const numPoints = 8000;
let scene, camera, renderer, particles;
let geometry, material;
let clock = new THREE.Clock();

const states = {
    DEFAULT: new Float32Array(numPoints * 3),
    ONE: new Float32Array(numPoints * 3),
    TWO: new Float32Array(numPoints * 3),
    THREE: new Float32Array(numPoints * 3),
    HEART: new Float32Array(numPoints * 3),
    STAR: new Float32Array(numPoints * 3)
};

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
    
    // Create random colors (grayscale for later hue tinting)
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

            createTextTargets('(1)', states.ONE);
            createTextTargets('(2)', states.TWO);
            createTextTargets('(3)', states.THREE);
            
            // Create Heart Targets
            for (let i = 0; i < numPoints; i++) {
                const t = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random());
                const x = r * 16 * Math.pow(Math.sin(t), 3);
                const y = r * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                states.HEART[i * 3] = x * 0.4;
                states.HEART[i * 3 + 1] = y * 0.4 + 2; // slight Y offset
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

// ---- MediaPipe Setup ----
let handLandmarker;
let video;
let isVideoReady = false;

async function initMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
    });

    video = document.getElementById('webcam');
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            isVideoReady = true;
            document.getElementById('loading').style.display = 'none';
        });
    } else {
        document.getElementById('loading').innerText = '无法访问摄像头';
    }
}

// Gesture Recognition Logic
function processLandmarks(results) {
    if (!results.landmarks || results.landmarks.length === 0) {
        currentState = 'DEFAULT';
        targetScale = 1.0;
        interactionForce = 0;
        document.getElementById('gesture-state').innerText = '无';
        document.getElementById('scale-state').innerText = '1.0';
        return;
    }

    let totalOpenness = 0;
    let mainHandState = 'DEFAULT';
    let force = 0;
    let iPoint = new THREE.Vector3();
    let activeHue = targetHue;

    const vFov = 75 * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * 25; // 25 is camera z
    const width = height * (window.innerWidth / window.innerHeight);

    // Check two-hand heart gesture
    let isTwoHandHeart = false;
    if (results.landmarks.length === 2) {
        const h1 = results.landmarks[0];
        const h2 = results.landmarks[1];
        const distIndex = Math.hypot(h1[8].x - h2[8].x, h1[8].y - h2[8].y, h1[8].z - h2[8].z);
        const distThumb = Math.hypot(h1[4].x - h2[4].x, h1[4].y - h2[4].y, h1[4].z - h2[4].z);
        if (distIndex < 0.08 && distThumb < 0.15) {
            isTwoHandHeart = true;
            mainHandState = 'HEART';
        }
    }

    // Process all hands detected
    for (let i = 0; i < results.landmarks.length; i++) {
        const landmarks = results.landmarks[i];
        const wrist = landmarks[0];
        
        // Calculate openness
        const tips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
        let avgDist = 0;
        tips.forEach(tip => {
            avgDist += Math.hypot(tip.x - wrist.x, tip.y - wrist.y, tip.z - wrist.z);
        });
        avgDist /= tips.length;
        totalOpenness += avgDist;

        // Angle mapping to Hue (wrist to middle finger base)
        const middleBase = landmarks[9];
        const angle = Math.atan2(middleBase.y - wrist.y, middleBase.x - wrist.x);
        activeHue = (angle + Math.PI) / (Math.PI * 2);

        // Simple finger up detection
        const isIndexUp = landmarks[8].y < landmarks[6].y;
        const isMiddleUp = landmarks[12].y < landmarks[10].y;
        const isRingUp = landmarks[16].y < landmarks[14].y;
        const isPinkyUp = landmarks[20].y < landmarks[18].y;
        const isThumbOut = Math.hypot(landmarks[4].x - landmarks[5].x, landmarks[4].y - landmarks[5].y) > 0.08;

        if (!isTwoHandHeart && i === 0) {
            if (isIndexUp && isThumbOut && !isMiddleUp && !isRingUp && !isPinkyUp) {
                mainHandState = 'STAR'; // Gun gesture
            } else if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) {
                mainHandState = 'ONE';
                iPoint.set(-(landmarks[8].x - 0.5) * width, -(landmarks[8].y - 0.5) * height, 0);
                force = 0.8; // Attract to index tip
            } else if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) {
                mainHandState = 'TWO';
            } else if (isIndexUp && isMiddleUp && isRingUp && !isPinkyUp) {
                mainHandState = 'THREE';
            }
            
            // Repel logic when palm is wide open
            if (mainHandState === 'DEFAULT' && isIndexUp && isMiddleUp && isRingUp && isPinkyUp && avgDist > 0.3) {
                iPoint.set(-(landmarks[9].x - 0.5) * width, -(landmarks[9].y - 0.5) * height, 0);
                force = -1.5; // Repel from palm center
            }
        }
    }

    currentState = isTwoHandHeart ? 'HEART' : mainHandState;
    targetHue = activeHue;
    interactionPoint.copy(iPoint);
    interactionForce = force;
    
    // Update scale based on openness
    const avgOpenness = totalOpenness / results.landmarks.length;
    const mappedScale = THREE.MathUtils.mapLinear(avgOpenness, 0.1, 0.3, 0.5, 2.0);
    targetScale = THREE.MathUtils.clamp(mappedScale, 0.3, 3.0);
    
    const uiStateMap = {
        'DEFAULT': '无',
        'ONE': '数字 1 (引力)',
        'TWO': '数字 2',
        'THREE': '数字 3',
        'STAR': '星星 (魔法手枪)',
        'HEART': '爱心 (双手指尖相接)'
    };
    
    let stateText = uiStateMap[currentState] || currentState;
    if (interactionForce < 0) {
        stateText += ' + 掌心斥力';
    }
    
    document.getElementById('gesture-state').innerText = stateText;
    document.getElementById('scale-state').innerText = targetScale.toFixed(2);
}

// ---- Animation Loop ----
let lastVideoTime = -1;

function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Run MediaPipe prediction
    if (isVideoReady && handLandmarker) {
        const currentVideoTime = video.currentTime;
        if (currentVideoTime !== lastVideoTime) {
            const results = handLandmarker.detectForVideo(video, performance.now());
            processLandmarks(results);
            lastVideoTime = currentVideoTime;
        }
    }

    // Smooth scale interpolation
    currentScale += (targetScale - currentScale) * 0.1;

    // Smooth hue interpolation (shortest path on circle)
    let hueDiff = targetHue - currentHue;
    if (hueDiff > 0.5) hueDiff -= 1.0;
    if (hueDiff < -0.5) hueDiff += 1.0;
    currentHue += hueDiff * 0.05;
    if (currentHue < 0) currentHue += 1.0;
    if (currentHue > 1) currentHue -= 1.0;
    
    // Apply color tinting
    material.color.setHSL(currentHue, 0.8, 0.6);

    // Interpolate particles
    const positions = geometry.attributes.position.array;
    const targetArr = states[currentState];

    for (let i = 0; i < numPoints; i++) {
        const idxX = i * 3;
        const idxY = i * 3 + 1;
        const idxZ = i * 3 + 2;

        // Target position with scale
        let tx = targetArr[idxX] * currentScale;
        let ty = targetArr[idxY] * currentScale;
        let tz = targetArr[idxZ] * currentScale;

        // Apply physics force (Attract/Repel)
        if (interactionForce !== 0) {
            const dx = interactionPoint.x - positions[idxX];
            const dy = interactionPoint.y - positions[idxY];
            const dz = interactionPoint.z - positions[idxZ];
            const distSq = dx * dx + dy * dy + dz * dz;
            const dist = Math.sqrt(distSq);
            
            const radius = interactionForce > 0 ? 12 : 25; // Attract radius vs Repel radius
            if (dist < radius && dist > 0.1) {
                const f = interactionForce * (1 - dist / radius);
                tx += dx * f;
                ty += dy * f;
                tz += dz * f;
            }
        }

        // Add some noise based on state
        if (currentState === 'DEFAULT') {
            tx += Math.sin(time * 2 + randomOffsets[idxX]) * 0.5;
            ty += Math.cos(time * 2 + randomOffsets[idxY]) * 0.5;
            tz += Math.sin(time * 2 + randomOffsets[idxZ]) * 0.5;
        } else {
            // Less noise when forming text
            tx += Math.sin(time * 5 + randomOffsets[idxX]) * 0.1;
            ty += Math.cos(time * 5 + randomOffsets[idxY]) * 0.1;
            tz += Math.sin(time * 5 + randomOffsets[idxZ]) * 0.1;
        }

        // Interpolate current to target
        positions[idxX] += (tx - positions[idxX]) * 0.05;
        positions[idxY] += (ty - positions[idxY]) * 0.05;
        positions[idxZ] += (tz - positions[idxZ]) * 0.05;
    }

    geometry.attributes.position.needsUpdate = true;
    
    // Rotate particles slightly
    particles.rotation.y = Math.sin(time * 0.2) * 0.2;
    particles.rotation.x = Math.cos(time * 0.2) * 0.1;

    renderer.render(scene, camera);
}

// Start
async function init() {
    initThree();
    await loadFontsAndTargets();
    await initMediaPipe();
    animate();
}
init();
