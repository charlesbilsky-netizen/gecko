import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GeckoMesh } from './GeckoMesh';
import { TerrariumEnvironment } from './TerrariumEnvironment';
import {
  ExanteSweatshirtConfig,
  RealisticGeckoConfig,
  StudioStage,
  CameraPreset,
  HologramConfig,
} from '../types/gecko';
import { HOLO_THEME_COLORS } from './GeckoMesh';
import { soundEngine } from '../utils/audio';

interface ThreeSceneProps {
  sweatshirtConfig: ExanteSweatshirtConfig;
  skinConfig: RealisticGeckoConfig;
  studioStage: StudioStage;
  cameraPreset: CameraPreset;
  turntableActive: boolean;
  hologramConfig?: HologramConfig;
  audioEnergy?: number;
  isSpeaking?: boolean;
  onGeckoClick?: () => void;
  onSceneReady?: (controls: {
    triggerEyeLick: () => void;
    triggerChirp: () => void;
    spawnBug: () => void;
    feedCricket: () => void;
    takeSnapshot: () => void;
  }) => void;
  onBugCaught?: () => void;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({
  sweatshirtConfig,
  skinConfig,
  studioStage,
  cameraPreset,
  turntableActive,
  hologramConfig,
  audioEnergy = 0,
  isSpeaking = false,
  onGeckoClick,
  onSceneReady,
  onBugCaught,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const geckoRef = useRef<GeckoMesh | null>(null);
  const envRef = useRef<TerrariumEnvironment | null>(null);

  const sweatshirtRef = useRef(sweatshirtConfig);
  sweatshirtRef.current = sweatshirtConfig;

  const skinRef = useRef(skinConfig);
  skinRef.current = skinConfig;

  const stageRef = useRef(studioStage);
  stageRef.current = studioStage;

  const cameraPresetRef = useRef(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  const turntableRef = useRef(turntableActive);
  turntableRef.current = turntableActive;

  const hologramConfigRef = useRef(hologramConfig);
  hologramConfigRef.current = hologramConfig;

  const audioEnergyRef = useRef(audioEnergy);
  audioEnergyRef.current = audioEnergy;

  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  const onGeckoClickRef = useRef(onGeckoClick);
  onGeckoClickRef.current = onGeckoClick;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch (e) {
        return true;
      }
    })();

    const width = mountRef.current.clientWidth || window.innerWidth;
    const height = mountRef.current.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
      alpha: true,
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(width, height);

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.3, 4.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0.55, 0);
    controlsRef.current = controls;

    // RoomEnvironment Studio Specular Reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Initialize Stage Environment & Realistic Gecko
    const env = new TerrariumEnvironment(scene);
    envRef.current = env;
    if (stageRef.current) {
      env.buildStage(stageRef.current);
    }
    if (hologramConfigRef.current) {
      env.setHoloThemeColor(HOLO_THEME_COLORS[hologramConfigRef.current.colorTheme] || 0x00D284);
    }

    const gecko = new GeckoMesh(sweatshirtRef.current, skinRef.current);
    if (hologramConfigRef.current) {
      gecko.setHologramConfig(hologramConfigRef.current);
    }
    geckoRef.current = gecko;
    scene.add(gecko.group);

    // Click / Pointer Raycasting to hunt bugs or lick eye
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !envRef.current || !geckoRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check insect target hits
      const bugMeshes = envRef.current.activeBugs.map(b => b.mesh);
      const bugIntersects = raycaster.intersectObjects(bugMeshes, true);

      if (bugIntersects.length > 0) {
        const hitPoint = bugIntersects[0].point;
        const targetBug = envRef.current.activeBugs.find(b => b.mesh.position.distanceTo(hitPoint) < 0.8);
        if (targetBug) {
          geckoRef.current.triggerBugCatch(targetBug.mesh.position, () => {
            envRef.current?.removeBug(targetBug.id);
            if (onBugCaught) onBugCaught();
            // Respawn bug after 3 seconds
            setTimeout(() => envRef.current?.spawnBug(), 3000);
          });
          return;
        }
      }

      // Check click on gecko model -> trigger eye lick or onGeckoClick!
      const geckoIntersects = raycaster.intersectObject(geckoRef.current.group, true);
      if (geckoIntersects.length > 0) {
        if (onGeckoClickRef.current) {
          onGeckoClickRef.current();
        } else {
          geckoRef.current.triggerEyeLick();
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Expose Live Scene Control Actions
    if (onSceneReady) {
      onSceneReady({
        triggerEyeLick: () => geckoRef.current?.triggerEyeLick(),
        triggerChirp: () => geckoRef.current?.triggerChirp(),
        spawnBug: () => envRef.current?.spawnBug(),
        feedCricket: () => {
          if (!envRef.current || !geckoRef.current) return;
          if (envRef.current.activeBugs.length === 0) {
            envRef.current.spawnBug();
          }
          const bug = envRef.current.activeBugs[0];
          if (bug) {
            geckoRef.current.triggerBugCatch(bug.mesh.position, () => {
              envRef.current?.removeBug(bug.id);
              if (onBugCaught) onBugCaught();
              setTimeout(() => envRef.current?.spawnBug(), 2500);
            });
          }
        },
        takeSnapshot: () => {
          if (!rendererRef.current) return;
          rendererRef.current.render(scene, camera);
          const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `exante-gecko-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        },
      });
    }

    // Animation & Render Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    function animate() {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Turntable 360° Studio Auto-Rotation
      if (turntableRef.current) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.8;
      } else {
        controls.autoRotate = false;
      }

      controls.update();

      // Camera Presets
      if (cameraPresetRef.current === 'hero_front') {
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (1.1 - camera.position.y) * 0.05;
        camera.position.z += (3.8 - camera.position.z) * 0.05;
        controls.target.set(0, 0.55, 0);
      } else if (cameraPresetRef.current === 'sweatshirt_chest') {
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (0.65 - camera.position.y) * 0.05;
        camera.position.z += (2.2 - camera.position.z) * 0.05;
        controls.target.set(0, 0.65, 0);
      } else if (cameraPresetRef.current === 'gecko_face') {
        camera.position.x += (0 - camera.position.x) * 0.05;
        camera.position.y += (0.95 - camera.position.y) * 0.05;
        camera.position.z += (1.8 - camera.position.z) * 0.05;
        controls.target.set(0, 0.85, 0.8);
      } else if (cameraPresetRef.current === 'three_quarter') {
        camera.position.x += (2.2 - camera.position.x) * 0.05;
        camera.position.y += (1.2 - camera.position.y) * 0.05;
        camera.position.z += (3.2 - camera.position.z) * 0.05;
        controls.target.set(0, 0.55, 0);
      }

      // Track closest active bug with gecko's alert gaze
      let targetBugPos: THREE.Vector3 | undefined = undefined;
      if (envRef.current && envRef.current.activeBugs.length > 0) {
        targetBugPos = envRef.current.activeBugs[0].position;
      }

      if (geckoRef.current) {
        geckoRef.current.setAudioEnergy(audioEnergyRef.current);
        geckoRef.current.setSpeaking(isSpeakingRef.current);
      }

      geckoRef.current?.update(delta, time, targetBugPos);
      envRef.current?.update(delta, time);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;

      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Sweatshirt
  useEffect(() => {
    if (geckoRef.current) {
      geckoRef.current.updateSweatshirt(sweatshirtConfig);
    }
  }, [sweatshirtConfig]);

  // Update Skin
  useEffect(() => {
    if (geckoRef.current) {
      geckoRef.current.updateSkin(skinConfig);
    }
  }, [skinConfig]);

  // Update Stage
  useEffect(() => {
    if (envRef.current) {
      envRef.current.buildStage(studioStage);
    }
  }, [studioStage]);

  // Update Hologram Config
  useEffect(() => {
    if (geckoRef.current && hologramConfig) {
      geckoRef.current.setHologramConfig(hologramConfig);
      if (envRef.current) {
        envRef.current.setHoloThemeColor(HOLO_THEME_COLORS[hologramConfig.colorTheme] || 0x00D284);
      }
    }
  }, [hologramConfig]);

  return <div ref={mountRef} className="w-full h-full relative overflow-hidden bg-transparent" />;
};

