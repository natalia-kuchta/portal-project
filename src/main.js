import * as THREE from 'three';
import { createBloomEffect } from './bloomEffect.js';

let scene, camera, renderer, portal, composer;
let clock = new THREE.Clock();
let animating = false;
let startTime = 0;
const animationDuration = 2;

let inCyberpunkWorld = false;
let fadePlane;
let bubblesGroup;

init();
animate();



function init() {

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
    const fadeGeometry = new THREE.PlaneGeometry(10, 10);
    fadePlane = new THREE.Mesh(fadeGeometry, fadeMaterial);
    fadePlane.position.z = 0.1;
    scene.add(fadePlane);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.id = 'threeCanvas';
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Shaders portal
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

    vec3 colorStart = vec3(0.1, 1.0, 0.7);  
    vec3 colorMid = vec3(0.5, 0.0, 0.3);    
    vec3 colorDark = vec3(0.0);             

    vec3 baseColor = mix(colorStart, colorMid, uProgress * 0.7);
    baseColor = mix(baseColor, colorDark, pow(uProgress, 2.0)); 

    float glow = 1.0 - smoothstep(0.2, 0.6, dist);

    gl_FragColor = vec4(baseColor * glow, 1.0 - uProgress * 0.3);
}
    `,
        transparent: true
    });

    const portalGeometry = new THREE.CircleGeometry(2, 128);
    portal = new THREE.Mesh(portalGeometry, portalMaterial);
    portal.position.z = -5
    scene.add(portal);

    composer = createBloomEffect(renderer, scene, camera);


    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([portal]);

        if (intersects.length > 0) {

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
                bubble.position.y += Math.sin(time + i) * 0.002;
            });
        }
    }


    if (animating) {
        const timeSinceClick = elapsed - startTime;
        const progress = Math.min(timeSinceClick / animationDuration, 3.0);
        portal.material.uniforms.uProgress.value = progress;

        fadePlane.material.opacity = Math.max(0, (progress - 0.7) / 0.3);


        camera.position.z = 5 - 4 * Math.pow(progress, 1.5);
        portal.scale.setScalar(1 + progress * 3);

        if (progress >= 1.0) {
            animating = false;
            loadCyberpunkWorld();
        }
    }

    if (inCyberpunkWorld) {
        renderer.render(scene, camera);
    } else {
        composer.render();
    }

    if (inCyberpunkWorld) {
        const particles = scene.getObjectByName('neonParticles');
        if (particles) {
            const time = clock.getElapsedTime();
            const positions = particles.geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const y = positions.getY(i);
                positions.setY(i, y + Math.sin(time + i) * 0.0015);
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

    function clearSceneObjects() {
        for (let i = scene.children.length - 1; i >= 0; i--) {
            const obj = scene.children[i];
            if (obj !== camera) scene.remove(obj);
        }
    }


    clearSceneObjects();

    scene.background = new THREE.Color('#66ccff');


    function addNeonBubbles() {
        const bubbleCount = 100;
         const bubbleGroup = new THREE.Group();
        bubbleGroup.name = 'neonBubbles';

        const geometry = new THREE.SphereGeometry(0.15, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color('#ff00cc'),
            emissive: new THREE.Color('#ff00cc'),
            emissiveIntensity: 4,
            transparent: true,
            opacity: 0.6,
            roughness: 0.2,
            metalness: 0.6,
            // transmission: 1.0,
            // thickness: 1.0,
            // clearcoat: 1.0,
            // clearcoatRoughness: 0
        });

        for (let i = 0; i < bubbleCount; i++) {
            const bubble = new THREE.Mesh(geometry, material.clone());
            bubble.position.set(
                0.2 * THREE.MathUtils.randFloatSpread(20),
                0.2 * THREE.MathUtils.randFloatSpread(15),
               0.1 * (THREE.MathUtils.randFloatSpread(20)-10)
            );
            bubble.scale.setScalar(THREE.MathUtils.randFloat(0.4, 1.5));
            bubbleGroup.add(bubble);
        }

        scene.add(bubbleGroup);
        bubblesGroup = bubbleGroup;

        // const light = new THREE.PointLight('#ff00cc', 2, 100);
        // light.position.set(0, 10, 10);
        // scene.add(light);
    }

    addNeonBubbles();


    camera.position.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    const loader = new THREE.TextureLoader();
    loader.load('/cyberpunk.png', function (texture) {
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;

        const aspect = window.innerWidth / window.innerHeight;
        const height = 2;
        const width = height * aspect;

        window.addEventListener('resize', () => {
            const aspect = window.innerWidth / window.innerHeight;
            const height = 2;
            const width = height * aspect;

            camera.aspect = aspect;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);

            if (mesh) {
                mesh.geometry.dispose();
                mesh.geometry = new THREE.PlaneGeometry(width, height);
            }
        });


        const material = new THREE.MeshBasicMaterial({ map: texture });
        const geometry = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geometry, material);


        mesh.position.z = -1;

        scene.add(mesh);
    });
}