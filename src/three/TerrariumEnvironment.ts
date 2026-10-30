import * as THREE from 'three';
import { StudioStage } from '../types/gecko';
import { createContactShadowTexture } from '../utils/proceduralTextures';

export interface BugTarget {
  id: string;
  type: 'cricket' | 'fly';
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isAlive: boolean;
}

/**
 * 3D Studio Stage and Natural Habitat Environments with Interactive Insect Prey.
 */
export class TerrariumEnvironment {
  public scene: THREE.Scene;
  public stageType: StudioStage = 'mossy_branch';

  public stageGroup: THREE.Group;
  public bugGroup: THREE.Group;
  public keyLight: THREE.DirectionalLight;
  public fillLight: THREE.HemisphereLight;
  public rimLight: THREE.PointLight;

  private contactShadowMesh: THREE.Mesh;
  public activeBugs: BugTarget[] = [];

  // Hologram Pedestal Meshes
  public holoRing1: THREE.Mesh | null = null;
  public holoRing2: THREE.Mesh | null = null;
  public holoRing3: THREE.Mesh | null = null;
  public holoBeamMesh: THREE.Mesh | null = null;
  public holoEmitterLight: THREE.PointLight | null = null;
  public holoThemeHex: number = 0x00D284;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.stageGroup = new THREE.Group();
    this.bugGroup = new THREE.Group();
    this.scene.add(this.stageGroup);
    this.scene.add(this.bugGroup);

    // 1. Studio Lighting Rig (High CRI 3-point lighting)
    this.keyLight = new THREE.DirectionalLight(0xfff8ee, 2.8);
    this.keyLight.position.set(4, 7, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.3);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.PointLight(0x00D284, 2.5, 12); // Exante Emerald Rim
    this.rimLight.position.set(-4, 3, -4);
    this.scene.add(this.rimLight);

    // Bottom Emitter Light for Hologram
    this.holoEmitterLight = new THREE.PointLight(0x00D284, 3.0, 8);
    this.holoEmitterLight.position.set(0, 0.1, 0);
    this.scene.add(this.holoEmitterLight);

    // 2. Soft Contact Ground Shadow
    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const shadowGeo = new THREE.PlaneGeometry(5.5, 5.5);
    shadowGeo.rotateX(-Math.PI / 2);
    this.contactShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    this.contactShadowMesh.position.y = 0.01;
    this.scene.add(this.contactShadowMesh);

    this.buildStage('hologram_pedestal');
    this.spawnBug();
  }

  public setHoloThemeColor(hex: number) {
    this.holoThemeHex = hex;
    if (this.holoEmitterLight) {
      this.holoEmitterLight.color.setHex(hex);
    }
    if (this.rimLight && this.stageType === 'hologram_pedestal') {
      this.rimLight.color.setHex(hex);
    }
  }

  // Build Environment Stage
  public buildStage(stage: StudioStage) {
    this.stageType = stage;

    while (this.stageGroup.children.length > 0) {
      const child = this.stageGroup.children.pop();
      if (child) this.stageGroup.remove(child);
    }

    this.holoRing1 = null;
    this.holoRing2 = null;
    this.holoRing3 = null;
    this.holoBeamMesh = null;

    if (stage === 'hologram_pedestal') {
      this.scene.fog = new THREE.FogExp2(0x050c14, 0.035);

      // Cybernetic Pedestal Base
      const baseGeo = new THREE.CylinderGeometry(1.8, 2.1, 0.22, 32);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x090f1d,
        metalness: 0.9,
        roughness: 0.2,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = -0.11;
      baseMesh.receiveShadow = true;
      this.stageGroup.add(baseMesh);

      // Inner Optical Emitter Core
      const emitterGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.05, 32);
      const emitterMat = new THREE.MeshStandardMaterial({
        color: 0x040810,
        emissive: this.holoThemeHex,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.95,
      });
      const emitterCore = new THREE.Mesh(emitterGeo, emitterMat);
      emitterCore.position.y = 0.02;
      this.stageGroup.add(emitterCore);

      // Concentric Glowing Hologram Rings
      const ringMat1 = new THREE.MeshBasicMaterial({
        color: this.holoThemeHex,
        transparent: true,
        opacity: 0.85,
      });
      const ringGeo1 = new THREE.TorusGeometry(1.4, 0.025, 16, 64);
      ringGeo1.rotateX(Math.PI / 2);
      this.holoRing1 = new THREE.Mesh(ringGeo1, ringMat1);
      this.holoRing1.position.y = 0.06;
      this.stageGroup.add(this.holoRing1);

      const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0x06b6d4, // Cyan counter-accent
        transparent: true,
        opacity: 0.7,
      });
      const ringGeo2 = new THREE.TorusGeometry(1.7, 0.018, 16, 64);
      ringGeo2.rotateX(Math.PI / 2);
      this.holoRing2 = new THREE.Mesh(ringGeo2, ringMat2);
      this.holoRing2.position.y = 0.12;
      this.stageGroup.add(this.holoRing2);

      const ringMat3 = new THREE.MeshBasicMaterial({
        color: this.holoThemeHex,
        transparent: true,
        opacity: 0.6,
      });
      const ringGeo3 = new THREE.TorusGeometry(1.95, 0.014, 16, 64);
      ringGeo3.rotateX(Math.PI / 2);
      this.holoRing3 = new THREE.Mesh(ringGeo3, ringMat3);
      this.holoRing3.position.y = 0.18;
      this.stageGroup.add(this.holoRing3);

      // Conical Holographic Projection Beam
      const beamGeo = new THREE.CylinderGeometry(1.9, 0.9, 2.8, 32, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: this.holoThemeHex,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.holoBeamMesh = new THREE.Mesh(beamGeo, beamMat);
      this.holoBeamMesh.position.set(0, 1.4, 0);
      this.stageGroup.add(this.holoBeamMesh);

      // Floating Particle Halo Dots
      const particlesGeo = new THREE.BufferGeometry();
      const pCount = 90;
      const positions = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.0 + Math.random() * 0.9;
        const height = 0.1 + Math.random() * 2.2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: this.holoThemeHex,
        size: 0.045,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const pSystem = new THREE.Points(particlesGeo, pMat);
      this.stageGroup.add(pSystem);

      // Dark Matrix Floor Grid
      const grid = new THREE.GridHelper(12, 24, this.holoThemeHex, 0x1e293b);
      grid.position.y = -0.22;
      this.stageGroup.add(grid);

      this.keyLight.color.setHex(0x93c5fd);
      this.keyLight.intensity = 1.6;
      this.rimLight.color.setHex(this.holoThemeHex);
      this.rimLight.intensity = 3.6;
      if (this.holoEmitterLight) {
        this.holoEmitterLight.intensity = 3.5;
      }
    } else if (stage === 'mossy_branch') {
      this.scene.fog = new THREE.FogExp2(0x132219, 0.028);

      // Organic Curved Perch Branch where gecko rests
      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.5, 0.1, -0.6),
        new THREE.Vector3(-1.0, 0.45, 0.1),
        new THREE.Vector3(1.0, 0.45, 0.0),
        new THREE.Vector3(3.5, 0.8, -0.5),
      ]);
      const branchGeo = new THREE.TubeGeometry(branchCurve, 32, 0.52, 16, false);
      const branchMat = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 0.85,
        metalness: 0.05,
      });
      const branchMesh = new THREE.Mesh(branchGeo, branchMat);
      branchMesh.receiveShadow = true;
      branchMesh.castShadow = true;
      this.stageGroup.add(branchMesh);

      // Tropical Green Leaves in Background
      const leafGeo = new THREE.PlaneGeometry(1.2, 1.8);
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.35,
        side: THREE.DoubleSide,
      });
      for (let l = 0; l < 8; l++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        const angle = (l / 8) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 3.2, 0.8 + Math.random() * 1.2, Math.sin(angle) * 3.2);
        leaf.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
        this.stageGroup.add(leaf);
      }

      this.keyLight.color.setHex(0xfff8ee);
      this.rimLight.color.setHex(0x00D284);
      this.rimLight.intensity = 2.0;
      if (this.holoEmitterLight) this.holoEmitterLight.intensity = 0.5;
    } else if (stage === 'luxury_studio') {
      this.scene.fog = new THREE.FogExp2(0x09090b, 0.03);

      // High-End Plinth Stage
      const plinthGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.3, 32);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.25,
        metalness: 0.85,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = -0.15;
      plinth.receiveShadow = true;
      this.stageGroup.add(plinth);

      // EXANTE Emerald Glowing Base Ring
      const ringGeo = new THREE.TorusGeometry(2.82, 0.035, 16, 64);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00D284 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.01;
      this.stageGroup.add(ring);

      this.keyLight.color.setHex(0xffffff);
      this.rimLight.color.setHex(0x00D284);
      this.rimLight.intensity = 3.2;
      if (this.holoEmitterLight) this.holoEmitterLight.intensity = 1.0;

    } else if (stage === 'exante_trading_floor') {
      this.scene.fog = new THREE.FogExp2(0x0c131f, 0.025);

      const floorGeo = new THREE.CircleGeometry(4.5, 32);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.7,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.receiveShadow = true;
      this.stageGroup.add(floor);

      this.keyLight.color.setHex(0xe0f2fe);
      this.rimLight.color.setHex(0x38bdf8);
      this.rimLight.intensity = 2.5;
    } else {
      // Clean White eCommerce catalog stage
      this.scene.fog = new THREE.FogExp2(0xf8fafc, 0.015);

      const floorGeo = new THREE.CircleGeometry(5.0, 32);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.receiveShadow = true;
      this.stageGroup.add(floor);

      this.keyLight.color.setHex(0xffffff);
      this.rimLight.color.setHex(0x94a3b8);
      this.rimLight.intensity = 1.0;
    }
  }

  // Spawn Interactive Bug / Cricket
  public spawnBug() {
    // Clear old dead bugs
    this.activeBugs = this.activeBugs.filter(b => b.isAlive);
    if (this.activeBugs.length >= 3) return;

    const bugGroup = new THREE.Group();
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 3.5,
      0.65 + Math.random() * 0.8,
      1.2 + Math.random() * 1.5
    );
    bugGroup.position.copy(pos);

    // Realistic Cricket Model
    const bodyGeo = new THREE.CapsuleGeometry(0.06, 0.18, 8, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x29180d, roughness: 0.4 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bugGroup.add(bodyMesh);

    // Wings
    const wingGeo = new THREE.PlaneGeometry(0.12, 0.22);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, side: THREE.DoubleSide });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.set(0, 0.06, 0);
    wingMesh.rotation.x = Math.PI / 2.2;
    bugGroup.add(wingMesh);

    // Long antennae
    const antGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
    const antMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const lAnt = new THREE.Mesh(antGeo, antMat);
    lAnt.position.set(0.04, 0.06, 0.16);
    lAnt.rotation.x = Math.PI / 3;
    bugGroup.add(lAnt);

    const rAnt = new THREE.Mesh(antGeo, antMat);
    rAnt.position.set(-0.04, 0.06, 0.16);
    rAnt.rotation.x = Math.PI / 3;
    bugGroup.add(rAnt);

    this.bugGroup.add(bugGroup);

    this.activeBugs.push({
      id: 'bug_' + Math.random().toString(36).substring(2, 8),
      type: 'cricket',
      mesh: bugGroup,
      position: pos,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.015, 0, (Math.random() - 0.5) * 0.015),
      isAlive: true,
    });
  }

  // Remove Bug after Gecko catches it
  public removeBug(id: string) {
    const bugIdx = this.activeBugs.findIndex(b => b.id === id);
    if (bugIdx !== -1) {
      const bug = this.activeBugs[bugIdx];
      bug.isAlive = false;
      this.bugGroup.remove(bug.mesh);
      this.activeBugs.splice(bugIdx, 1);
    }
  }

  // Per-Frame Update
  public update(deltaTime: number, time: number) {
    this.activeBugs.forEach(bug => {
      if (!bug.isAlive) return;

      // Realistic bug crawling / wandering
      bug.position.x += bug.velocity.x + Math.sin(time * 4) * 0.004;
      bug.position.z += bug.velocity.z + Math.cos(time * 3) * 0.004;
      bug.position.y += Math.sin(time * 8) * 0.002;

      // Bound wander
      if (Math.abs(bug.position.x) > 2.5) bug.velocity.x *= -1;
      if (bug.position.z < 0.6 || bug.position.z > 3.2) bug.velocity.z *= -1;

      bug.mesh.position.copy(bug.position);
    });

    // Animate Hologram Rings & Volumetric Beam
    if (this.stageType === 'hologram_pedestal') {
      if (this.holoRing1) {
        this.holoRing1.rotation.z = time * 0.8;
        this.holoRing1.position.y = 0.06 + Math.sin(time * 2.5) * 0.015;
      }
      if (this.holoRing2) {
        this.holoRing2.rotation.z = -time * 0.6;
        this.holoRing2.position.y = 0.12 + Math.cos(time * 2.2) * 0.018;
      }
      if (this.holoRing3) {
        this.holoRing3.rotation.z = time * 0.4;
        this.holoRing3.position.y = 0.18 + Math.sin(time * 1.8) * 0.02;
      }
      if (this.holoBeamMesh) {
        const mat = this.holoBeamMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.12 + Math.sin(time * 4) * 0.035;
      }
    }
  }
}

