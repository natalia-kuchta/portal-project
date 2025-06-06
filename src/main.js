// import * as THREE from 'three';
// import { createBloomEffect } from './bloomEffect.js';
// // import './styles.css';
//
// const scene = new THREE.Scene();
// scene.fog = new THREE.FogExp2(0x0a1f0a, 0.05); // tajemnicza mgła
// scene.background = new THREE.Color(0x001122); // pasujące tło
// scene.background = new THREE.Color(0x000000); // ciemne tło
//
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
// camera.position.z = 5;
//
// const renderer = new THREE.WebGLRenderer({ antialias: true });
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);
//
// const geometry = new THREE.SphereGeometry(1, 32, 32);
// const material = new THREE.MeshStandardMaterial({
//     color: 0x00ff77,
//     emissive:  0x00ff77,
//     emissiveIntensity: 2.5,
//     roughness: 0.2,
//     metalness: 0.5,
// });
// const sphere = new THREE.Mesh(geometry, material);
// scene.add(sphere);
// // Cząsteczki
// const particlesCount = 500;
// const particlesGeometry = new THREE.BufferGeometry();
// const positions = [];
//
// for (let i = 0; i < particlesCount; i++) {
//     const x = (Math.random() - 0.5) * 10;
//     const y = (Math.random() - 0.5) * 10;
//     const z = (Math.random() - 0.5) * 10;
//     positions.push(x, y, z);
// }
//
// particlesGeometry.setAttribute(
//     'position',
//     new THREE.Float32BufferAttribute(positions, 3)
// );
//
// const particlesMaterial = new THREE.PointsMaterial({
//     color: 0x88ccff,
//     size: 0.05,
//     transparent: true,
//     opacity: 0.8,
// });
//
// const particles = new THREE.Points(particlesGeometry, particlesMaterial);
// scene.add(particles);
//
//
// const composer = createBloomEffect(renderer, scene, camera);
//
// let clicked = false;
// let clickStartTime = 0;
//
// window.addEventListener('click', () => {
//     clicked = true;
//     clickStartTime = Date.now();
// });
//
// const originalColor = new THREE.Color(0x00ff77);
// const clickedColor = new THREE.Color(0x00ffcc);
//
// let transitionProgress = 0; // od 0 do 1
// let transitioning = false;
//
// window.addEventListener('click', () => {
//     transitioning = true;
//     transitionProgress = 0;
// });
//
// function animate() {
//     requestAnimationFrame(animate);
//
//     sphere.rotation.y += 0.01;
//     particles.rotation.y += 0.002;
//     particles.rotation.x += 0.001;
//
//     sphere.rotation.x += 0.005;
//     sphere.rotation.z += 0.002;
//
//     if (transitioning) {
//         transitionProgress += 0.02; // szybkość animacji
//
//         // lerp kolorów od oryginału do klikniętego i z powrotem (ping-pong)
//         const t = Math.sin(transitionProgress * Math.PI);
//
//         sphere.material.color.lerpColors(originalColor, clickedColor, t);
//         sphere.material.emissive.lerpColors(originalColor, clickedColor, t);
//
//         // pulsacja emisji jasności (od 2.5 do 5)
//         sphere.material.emissiveIntensity = 2.5 + 2.5 * t;
//
//         if (transitionProgress >= 1) {
//             transitioning = false;
//             // na koniec przywróć oryginalne kolory i intensywność
//             sphere.material.color.copy(originalColor);
//             sphere.material.emissive.copy(originalColor);
//             sphere.material.emissiveIntensity = 2.5;
//         }
//     }
//
//     composer.render();
// }
// animate();
//
// window.addEventListener('resize', () => {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
//     composer.setSize(window.innerWidth, window.innerHeight);
// });

import * as THREE from 'three';
import { createBloomEffect } from './bloomEffect.js';

let scene, camera, renderer, portal, composer;
let clock = new THREE.Clock();
let animating = false;
let startTime = 0;
const animationDuration = 2; // sekundy

let inCyberpunkWorld = false;
let fadePlane;
let bubblesGroup;

init();
animate();



function init() {
    // 🌌 Scena + kamera
    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x000000);
    // scene.fog = new THREE.FogExp2(0x0a1f0a, 0.08);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;
    const fadeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0
    });
    const fadeGeometry = new THREE.PlaneGeometry(10, 10); // większy niż ekran
    fadePlane = new THREE.Mesh(fadeGeometry, fadeMaterial);
    fadePlane.position.z = 0.1; // przed portalem
    scene.add(fadePlane);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.id = 'threeCanvas';
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 🌀 Shaderowy portal (okrągły z zasysaniem i wirowaniem)
    const portalMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uProgress: { value: 0.0 }
        },
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform float uTime;
uniform float uProgress;
varying vec2 vUv;

void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Efekt zasysania i rotacji
    angle += uTime * 3.5 * (1.0 - uProgress);
    float suck = mix(1.0 / (1.0 + dist * 8.0), 0.0, uProgress);

    uv = vec2(cos(angle), sin(angle)) * dist * suck;
    uv += 0.5;

    // Dynamiczna zmiana kolorów
    vec3 colorStart = vec3(0.1, 1.0, 0.7);  // startowy neonowy
    vec3 colorMid = vec3(0.5, 0.0, 0.3);    // różowo-fioletowy
    vec3 colorDark = vec3(0.0);             // czarny

    vec3 baseColor = mix(colorStart, colorMid, uProgress * 0.7);
    baseColor = mix(baseColor, colorDark, pow(uProgress, 2.0)); // stopniowe przyciemnianie

    float glow = 1.0 - smoothstep(0.2, 0.6, dist);

    gl_FragColor = vec4(baseColor * glow, 1.0 - uProgress * 0.3);
}
    `,
        transparent: true
    });

    const portalGeometry = new THREE.CircleGeometry(2, 128); // okrąg, gładki
    portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.position.z = -5 // ustaw pionowo
    scene.add(portal);

    composer = createBloomEffect(renderer, scene, camera);

    // 🖱 Kliknięcie w portal
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([portal]);

        if (intersects.length > 0) {
            console.log("🌀 Portal kliknięty!");
            triggerTransition();
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    if (bubblesGroup) {
        bubblesGroup.children.forEach((bubble, i) => {
            const time = clock.getElapsedTime();
            const scale = 1 + Math.sin(time * 2 + i) * 0.1;
            bubble.scale.setScalar(scale);
            bubble.position.y += Math.sin(time * 0.5 + i) * 0.002;
            bubble.position.x += Math.cos(time * 0.3 + i) * 0.001;
            bubble.position.z += Math.sin(time * 0.4 + i) * 0.001;
        });
    }



    portal.material.uniforms.uTime.value = elapsed;
    if (inCyberpunkWorld) {
        const bubbles = scene.getObjectByName('neonBubbles');
        if (bubbles) {
            const time = clock.getElapsedTime();
            bubbles.children.forEach((bubble, i) => {
                const scale = 0.8 + Math.sin(time * 2 + i) * 0.1;
                bubble.scale.setScalar(scale);
                bubble.position.y += Math.sin(time + i) * 0.002; // lekki dryf w górę
            });
        }
    }


    if (animating) {
        const timeSinceClick = elapsed - startTime;
        const progress = Math.min(timeSinceClick / animationDuration, 3.0);
        portal.material.uniforms.uProgress.value = progress;

        fadePlane.material.opacity = Math.max(0, (progress - 0.7) / 0.3);

        // Dodatkowo: kamera zasysana!
        camera.position.z = 5 - 4 * Math.pow(progress, 1.5);
        portal.scale.setScalar(1 + progress * 3); // rośnie z czasem

        if (progress >= 1.0) {
            animating = false;
            loadCyberpunkWorld();
        }
    }

    if (inCyberpunkWorld) {
        renderer.render(scene, camera); // zamiast efektów bloom
    } else {
        composer.render(); // efekt bloom tylko w świecie portalu
    }

    if (inCyberpunkWorld) {
        const particles = scene.getObjectByName('neonParticles');
        if (particles) {
            const time = clock.getElapsedTime();
            const positions = particles.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                positions.setY(i, y + Math.sin(time + i) * 0.0015); // dryf
            }
            positions.needsUpdate = true;
        }
    }

    // composer.render();
}


function triggerTransition() {
    if (!animating) {
        animating = true;
        startTime = clock.getElapsedTime();
    }
}

function loadCyberpunkWorld() {
    inCyberpunkWorld = true;
    clearSceneObjects();


    function addNeonBubbles() {
        const bubbleCount = 200;
         const bubbleGroup = new THREE.Group();
        bubbleGroup.name = 'neonBubbles';

        const geometry = new THREE.SphereGeometry(0.15, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#ff66cc'), // neon pink
            transparent: true,
            opacity: 0.4,
            roughness: 0.1,
            metalness: 0.9,
            transmission: 1.0,
            thickness: 1.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0
        });

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = new THREE.Mesh(geometry, material.clone());
            bubble.position.set(
                THREE.MathUtils.randFloatSpread(20), // szerzej po X
                THREE.MathUtils.randFloatSpread(15), // wyżej po Y
                THREE.MathUtils.randFloatSpread(20)  // głębiej po Z
            );
            bubble.scale.setScalar(THREE.MathUtils.randFloat(0.4, 1.5));
            bubbleGroup.add(bubble);
        }

        scene.add(bubbleGroup);
    }

    addNeonBubbles();


    function clearSceneObjects() {
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
        // composer = null; // opcjonalnie, jeśli chcesz wyczyścić
    }



    // 📸 Ustaw kamerę prosto
    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    const loader = new THREE.TextureLoader();
    loader.load('/cyberpunk.png', function (texture) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // dla ostrości
        texture.needsUpdate = true;

        const aspect = window.innerWidth / window.innerHeight;
        const height = 2; // dowolna wysokość (np. 2 jednostki w przestrzeni świata)
        const width = height * aspect;

        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            const height = 2;
            const width = height * aspect;

            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            if (mesh) {
                mesh.geometry.dispose(); // czyścimy starą geometrię
                mesh.geometry = new THREE.PlaneGeometry(width, height);
            }
        });

        // Stwórz materiał z obrazkiem
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const geometry = new THREE.PlaneGeometry(width, height); // fullscreen quad
        const mesh = new THREE.Mesh(geometry, material);

        // umieść przed kamerą (Z < kamera Z)
        mesh.position.z = -1;

        scene.add(mesh);
    });
}