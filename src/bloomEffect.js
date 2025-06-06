// bloomEffect.js
import * as THREE from 'three';
// import './styles.css';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export function createBloomEffect(renderer, scene, camera, options = {}) {
    const composer = new EffectComposer(renderer);

    // Dodaj render pass (podstawowy rendering sceny)
    composer.addPass(new RenderPass(scene, camera));

    // Parametry domyślne lub podane w options
    const strength = options.strength !== undefined ? options.strength : 3.0;  // mocniejszy bloom
    const radius = options.radius !== undefined ? options.radius : 0.7;
    const threshold = options.threshold !== undefined ? options.threshold : 0.1;  // mniejszy próg, by więcej się świeciło


    // Dodaj UnrealBloomPass z parametrami
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        strength,
        radius,
        threshold
    );

    composer.addPass(bloomPass);

    return composer;
}
