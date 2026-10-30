import * as THREE from 'three';
import {
  ExanteSweatshirtConfig,
  RealisticGeckoConfig,
  GeckoAction,
  HologramConfig,
  HologramColorTheme,
} from '../types/gecko';
import {
  createExanteLogoTexture,
  createSweatshirtFabricBumpMap,
  createRealisticGeckoSkinTexture,
  createReptileScaleBumpMap,
  createReptileEyeTexture,
} from '../utils/proceduralTextures';
import { soundEngine } from '../utils/audio';

export const HOLO_THEME_COLORS: Record<HologramColorTheme, number> = {
  emerald: 0x00D284,
  cyan: 0x06b6d4,
  matrix: 0x22c55e,
  violet: 0x8b5cf6,
  amber: 0xf59e0b,
};

/**
 * Realistic 3D Gecko Character wearing a tailored 3D EXANTE Sweatshirt / Hoodie.
 * Features realistic lizard anatomy, gular throat fluttering, eye-licking kinematics,
 * splayed lamellae toe pads, PBR fabric weave with official EXANTE branding, and bug hunting.
 */
export class GeckoMesh {
  public group: THREE.Group;

  // Realistic Gecko Anatomy Parts
  public headGroup: THREE.Group;
  private snoutMesh: THREE.Mesh;
  private gularThroatMesh: THREE.Mesh;
  private leftEyeGroup: THREE.Group;
  private rightEyeGroup: THREE.Group;
  private bodyMesh: THREE.Mesh;

  // 3D EXANTE Sweatshirt Parts
  private sweatshirtTorsoMesh: THREE.Mesh;
  private pocketMesh: THREE.Mesh;
  private hoodGroup: THREE.Group;
  private leftSleeveGroup: THREE.Group;
  private rightSleeveGroup: THREE.Group;
  private leftDrawstring: THREE.Mesh;
  private rightDrawstring: THREE.Mesh;

  // Limbs with Splayed Gecko Digits & Claws
  private leftFrontArm: THREE.Group;
  private rightFrontArm: THREE.Group;
  private leftHindLeg: THREE.Group;
  private rightHindLeg: THREE.Group;
  private tailSegments: THREE.Mesh[] = [];
  private tailGroup: THREE.Group;

  // Dynamic Tongue (Eye-Lick & Hunting)
  private tongueMesh: THREE.Mesh;
  private tongueCurve: THREE.CatmullRomCurve3;
  private isLickingEye: boolean = false;
  private isStrikingBug: boolean = false;
  private eyeLickProgress: number = 0;
  private bugStrikeProgress: number = 0;
  private bugStrikeTarget: THREE.Vector3 = new THREE.Vector3();
  private onBugCatchCb: (() => void) | null = null;

  // PBR Materials
  private sweatshirtMaterial: THREE.MeshStandardMaterial;
  private ribbedMaterial: THREE.MeshStandardMaterial;
  private geckoSkinMaterial: THREE.MeshStandardMaterial;
  private eyeCorneaMaterial: THREE.MeshPhysicalMaterial;
  private leftIrisMaterial: THREE.MeshStandardMaterial;
  private rightIrisMaterial: THREE.MeshStandardMaterial;
  private tongueMaterial: THREE.MeshStandardMaterial;

  // State & Animations
  private sweatshirtConfig: ExanteSweatshirtConfig;
  private skinConfig: RealisticGeckoConfig;
  private gularPhase: number = 0;
  private breathPhase: number = 0;
  private saccadeTimer: number = 0;
  private targetHeadYaw: number = 0;
  private targetHeadPitch: number = 0;
  public currentAction: GeckoAction = 'idle';

  // Hologram Shader FX & Audio Coupling
  public isHologram: boolean = true;
  public holoConfig: HologramConfig = {
    enabled: true,
    wireframe: false,
    colorTheme: 'emerald',
    glitchActive: false,
    scanlines: true,
    pulseIntensity: 1.0,
  };
  public audioEnergy: number = 0;
  public isSpeaking: boolean = false;


  constructor(sweatshirtConfig: ExanteSweatshirtConfig, skinConfig: RealisticGeckoConfig) {
    this.sweatshirtConfig = sweatshirtConfig;
    this.skinConfig = skinConfig;
    this.group = new THREE.Group();

    // 1. Generate Procedural Textures
    const logoTex = createExanteLogoTexture(sweatshirtConfig.logoStyle, sweatshirtConfig.color);
    const fabricBumpTex = createSweatshirtFabricBumpMap();
    const skinTex = createRealisticGeckoSkinTexture(skinConfig);
    const scaleBumpTex = createReptileScaleBumpMap();
    const eyeTex = createReptileEyeTexture(skinConfig.eyeIrisColor, skinConfig.pupilDilation);

    // 2. Setup High-Fidelity PBR Materials
    this.sweatshirtMaterial = new THREE.MeshStandardMaterial({
      map: logoTex,
      bumpMap: fabricBumpTex,
      bumpScale: 0.035,
      roughness: sweatshirtConfig.fabricRoughness,
      metalness: 0.02,
    });

    this.ribbedMaterial = new THREE.MeshStandardMaterial({
      color: sweatshirtConfig.color,
      bumpMap: fabricBumpTex,
      bumpScale: 0.06,
      roughness: 0.85,
    });

    this.geckoSkinMaterial = new THREE.MeshStandardMaterial({
      map: skinTex,
      bumpMap: scaleBumpTex,
      bumpScale: 0.038,
      roughness: 0.42,
      metalness: 0.04,
    });

    this.leftIrisMaterial = new THREE.MeshStandardMaterial({
      map: eyeTex,
      roughness: 0.15,
      metalness: 0.2,
    });
    this.rightIrisMaterial = this.leftIrisMaterial.clone();

    // Glossy clear cornea
    this.eyeCorneaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.96,
      opacity: 1,
      transparent: true,
      roughness: 0.02,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    this.tongueMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4d79,
      roughness: 0.1,
      metalness: 0.05,
    });

    // 3. Build Realistic Gecko Torso Base
    const innerTorsoGeo = new THREE.CapsuleGeometry(0.48, 1.55, 20, 32);
    innerTorsoGeo.rotateX(Math.PI / 2);
    this.bodyMesh = new THREE.Mesh(innerTorsoGeo, this.geckoSkinMaterial);
    this.bodyMesh.position.set(0, 0.62, 0);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // 4. Build 3D EXANTE Sweatshirt Torso
    const sweatshirtGeo = new THREE.CapsuleGeometry(0.53, 1.42, 24, 32);
    sweatshirtGeo.rotateX(Math.PI / 2);
    this.sweatshirtTorsoMesh = new THREE.Mesh(sweatshirtGeo, this.sweatshirtMaterial);
    this.sweatshirtTorsoMesh.position.set(0, 0.01, 0.03);
    this.sweatshirtTorsoMesh.castShadow = true;
    this.sweatshirtTorsoMesh.receiveShadow = true;
    this.bodyMesh.add(this.sweatshirtTorsoMesh);

    // Ribbed Waist Hem
    const hemGeo = new THREE.CylinderGeometry(0.535, 0.535, 0.16, 24);
    hemGeo.rotateX(Math.PI / 2);
    const hemMesh = new THREE.Mesh(hemGeo, this.ribbedMaterial);
    hemMesh.position.set(0, 0, -0.66);
    this.sweatshirtTorsoMesh.add(hemMesh);

    // Kangaroo Front Pouch Pocket
    const pocketGeo = new THREE.BoxGeometry(0.46, 0.16, 0.32);
    this.pocketMesh = new THREE.Mesh(pocketGeo, this.sweatshirtMaterial);
    this.pocketMesh.position.set(0, -0.42, 0.05);
    this.pocketMesh.castShadow = true;
    this.sweatshirtTorsoMesh.add(this.pocketMesh);

    // 5. Build Draped 3D Hood & Drawstrings
    this.hoodGroup = new THREE.Group();
    this.hoodGroup.position.set(0, 0.14, 0.58);

    const hoodGeo = new THREE.SphereGeometry(0.46, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const hoodMesh = new THREE.Mesh(hoodGeo, this.ribbedMaterial);
    hoodMesh.rotation.x = -Math.PI / 3.2;
    this.hoodGroup.add(hoodMesh);

    // Drawstrings with Silver Metal Aglets
    const drawstringMat = new THREE.MeshStandardMaterial({
      color: sweatshirtConfig.drawstringColor,
      roughness: 0.3,
    });
    const stringGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.36, 8);

    this.leftDrawstring = new THREE.Mesh(stringGeo, drawstringMat);
    this.leftDrawstring.position.set(0.16, -0.2, 0.1);
    this.leftDrawstring.rotation.z = -0.12;
    this.hoodGroup.add(this.leftDrawstring);

    this.rightDrawstring = new THREE.Mesh(stringGeo, drawstringMat);
    this.rightDrawstring.position.set(-0.16, -0.2, 0.1);
    this.rightDrawstring.rotation.z = 0.12;
    this.hoodGroup.add(this.rightDrawstring);

    const agletMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const agletGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8);

    const lAglet = new THREE.Mesh(agletGeo, agletMat);
    lAglet.position.set(0, -0.2, 0);
    this.leftDrawstring.add(lAglet);

    const rAglet = new THREE.Mesh(agletGeo, agletMat);
    rAglet.position.set(0, -0.2, 0);
    this.rightDrawstring.add(rAglet);

    this.bodyMesh.add(this.hoodGroup);

    // 6. Build Sculpted Realistic Gecko Head & Gular Throat
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.22, 1.05);

    // Triangular Gecko Skull
    const skullGeo = new THREE.SphereGeometry(0.48, 28, 28);
    skullGeo.scale(1.18, 0.68, 1.25);
    const skullMesh = new THREE.Mesh(skullGeo, this.geckoSkinMaterial);
    skullMesh.castShadow = true;
    this.headGroup.add(skullMesh);

    // Tapered Snout with Nares (Nostrils)
    const snoutShape = new THREE.Shape();
    snoutShape.moveTo(-0.32, 0);
    snoutShape.lineTo(0.32, 0);
    snoutShape.lineTo(0.16, 0.46);
    snoutShape.bezierCurveTo(0.08, 0.52, -0.08, 0.52, -0.16, 0.46);
    snoutShape.closePath();

    const extrudeSettings = { depth: 0.38, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.06, bevelThickness: 0.06 };
    const snoutGeo = new THREE.ExtrudeGeometry(snoutShape, extrudeSettings);
    snoutGeo.rotateX(Math.PI / 2);
    this.snoutMesh = new THREE.Mesh(snoutGeo, this.geckoSkinMaterial);
    this.snoutMesh.position.set(0, -0.04, 0.22);
    this.snoutMesh.castShadow = true;
    this.headGroup.add(this.snoutMesh);

    // Nostril Indentations
    const nostrilGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const nostrilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const leftNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
    leftNostril.position.set(0.09, 0.02, 0.64);
    this.headGroup.add(leftNostril);

    const rightNostril = new THREE.Mesh(nostrilGeo, nostrilMat);
    rightNostril.position.set(-0.09, 0.02, 0.64);
    this.headGroup.add(rightNostril);

    // Realistic Gular Throat (rapidly pumps/flutters with breathing)
    const gularGeo = new THREE.SphereGeometry(0.32, 16, 16);
    gularGeo.scale(0.9, 0.45, 1.1);
    this.gularThroatMesh = new THREE.Mesh(gularGeo, this.geckoSkinMaterial);
    this.gularThroatMesh.position.set(0, -0.18, 0.12);
    this.headGroup.add(this.gularThroatMesh);

    // Supraocular Eyebrow Crests & Bulbous Eyes
    this.leftEyeGroup = this.createRealisticEye(true);
    this.rightEyeGroup = this.createRealisticEye(false);
    this.leftEyeGroup.position.set(0.34, 0.18, 0.15);
    this.rightEyeGroup.position.set(-0.34, 0.18, 0.15);
    this.headGroup.add(this.leftEyeGroup);
    this.headGroup.add(this.rightEyeGroup);

    this.bodyMesh.add(this.headGroup);

    // 7. Build Dynamic Tongue for Eye-Licking & Catching Bugs
    this.tongueCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.1, 0.2),
      new THREE.Vector3(0, 0.2, 0.4),
    ]);
    const tongueGeo = new THREE.TubeGeometry(this.tongueCurve, 16, 0.045, 8, false);
    this.tongueMesh = new THREE.Mesh(tongueGeo, this.tongueMaterial);
    this.tongueMesh.visible = false;
    this.headGroup.add(this.tongueMesh);

    // 8. Build Sleeves & Gecko Forelimbs Emerging from Cuffs
    this.leftSleeveGroup = new THREE.Group();
    this.rightSleeveGroup = new THREE.Group();
    this.leftSleeveGroup.position.set(0.48, -0.08, 0.42);
    this.rightSleeveGroup.position.set(-0.48, -0.08, 0.42);

    const sleeveGeo = new THREE.CylinderGeometry(0.19, 0.15, 0.52, 16);
    sleeveGeo.rotateZ(Math.PI / 2);

    const lSleeve = new THREE.Mesh(sleeveGeo, this.sweatshirtMaterial);
    lSleeve.position.set(0.24, 0, 0);
    this.leftSleeveGroup.add(lSleeve);

    const rSleeve = new THREE.Mesh(sleeveGeo, this.sweatshirtMaterial);
    rSleeve.position.set(-0.24, 0, 0);
    this.rightSleeveGroup.add(rSleeve);

    // Ribbed Wrist Cuffs
    const cuffGeo = new THREE.CylinderGeometry(0.155, 0.155, 0.11, 16);
    cuffGeo.rotateZ(Math.PI / 2);

    const lCuff = new THREE.Mesh(cuffGeo, this.ribbedMaterial);
    lCuff.position.set(0.48, 0, 0);
    this.leftSleeveGroup.add(lCuff);

    const rCuff = new THREE.Mesh(cuffGeo, this.ribbedMaterial);
    rCuff.position.set(-0.48, 0, 0);
    this.rightSleeveGroup.add(rCuff);

    // Realistic Gecko Hands with Splayed Lamellae Pad Toes
    this.leftFrontArm = this.createGeckoFoot(true, false);
    this.rightFrontArm = this.createGeckoFoot(false, false);
    this.leftFrontArm.position.set(0.58, -0.06, 0);
    this.rightFrontArm.position.set(-0.58, -0.06, 0);

    this.leftSleeveGroup.add(this.leftFrontArm);
    this.rightSleeveGroup.add(this.rightFrontArm);

    this.bodyMesh.add(this.leftSleeveGroup);
    this.bodyMesh.add(this.rightSleeveGroup);

    // 9. Realistic Hind Limbs Emerging Below Sweatshirt
    this.leftHindLeg = this.createGeckoFoot(true, true);
    this.rightHindLeg = this.createGeckoFoot(false, true);
    this.leftHindLeg.position.set(0.46, -0.1, -0.52);
    this.rightHindLeg.position.set(-0.46, -0.1, -0.52);

    this.bodyMesh.add(this.leftHindLeg);
    this.bodyMesh.add(this.rightHindLeg);

    // 10. Flexible Ringed Tail Extending Out Back of Sweatshirt
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0, 0, -0.82);

    let parentJoint: THREE.Group = this.tailGroup;
    const numTailSegments = 10;
    for (let i = 0; i < numTailSegments; i++) {
      const progress = i / numTailSegments;
      const radius = (1 - progress * 0.75) * 0.34;
      const segGeo = new THREE.CylinderGeometry(radius * 0.88, radius, 0.26, 16);
      segGeo.rotateX(Math.PI / 2);

      const segMesh = new THREE.Mesh(segGeo, this.geckoSkinMaterial);
      segMesh.position.set(0, 0, -0.13);
      segMesh.castShadow = true;

      const jointGroup = new THREE.Group();
      jointGroup.add(segMesh);
      parentJoint.add(jointGroup);

      if (i < numTailSegments - 1) {
        jointGroup.position.set(0, 0, -0.24);
      }

      this.tailSegments.push(segMesh);
      parentJoint = jointGroup;
    }
    this.bodyMesh.add(this.tailGroup);
  }

  // Create Realistic Gecko Eye with Supraocular Eyelid Crest & Glassy Cornea
  private createRealisticEye(isLeft: boolean): THREE.Group {
    const eyeGroup = new THREE.Group();

    // Eye socket / eyelid crest
    const socketGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const socketMesh = new THREE.Mesh(socketGeo, this.geckoSkinMaterial);
    eyeGroup.add(socketMesh);

    // Iris Sphere
    const irisGeo = new THREE.SphereGeometry(0.2, 24, 24);
    const irisMesh = new THREE.Mesh(irisGeo, isLeft ? this.leftIrisMaterial : this.rightIrisMaterial);
    irisMesh.rotation.y = isLeft ? 0.3 : -0.3;
    eyeGroup.add(irisMesh);

    // Outer Glassy Cornea
    const corneaGeo = new THREE.SphereGeometry(0.215, 24, 24);
    const corneaMesh = new THREE.Mesh(corneaGeo, this.eyeCorneaMaterial);
    eyeGroup.add(corneaMesh);

    return eyeGroup;
  }

  // Assemble Realistic Gecko Foot with 5 Splayed Sticky Digits (Lamellae & Claws)
  private createGeckoFoot(isLeft: boolean, isHind: boolean): THREE.Group {
    const footGroup = new THREE.Group();
    const sideSign = isLeft ? 1 : -1;

    // Limb segment
    const limbGeo = new THREE.CylinderGeometry(0.11, 0.09, isHind ? 0.52 : 0.44, 12);
    limbGeo.rotateZ((Math.PI / 2.3) * sideSign);
    const limbMesh = new THREE.Mesh(limbGeo, this.geckoSkinMaterial);
    limbMesh.position.set(0.22 * sideSign, -0.05, 0);
    limbMesh.castShadow = true;
    footGroup.add(limbMesh);

    // Palm / Metatarsal
    const palmGroup = new THREE.Group();
    palmGroup.position.set(0.42 * sideSign, -0.18, 0.08);

    const palmGeo = new THREE.BoxGeometry(0.16, 0.04, 0.16);
    const palmMesh = new THREE.Mesh(palmGeo, this.geckoSkinMaterial);
    palmGroup.add(palmMesh);

    // 5 Splayed Gecko Digits with Expanded Subdigital Adhesive Pads (Scansors)
    for (let t = -2; t <= 2; t++) {
      const angle = (t * 24 * Math.PI) / 180;
      const digitGroup = new THREE.Group();
      digitGroup.position.set(Math.sin(angle) * 0.09, -0.01, Math.cos(angle) * 0.12 + 0.04);
      digitGroup.rotation.y = angle;

      // Digit base
      const toeGeo = new THREE.CapsuleGeometry(0.018, 0.15, 8, 8);
      const toeMesh = new THREE.Mesh(toeGeo, this.geckoSkinMaterial);
      digitGroup.add(toeMesh);

      // Expanded Adhesive Pad (Lamellae)
      const padGeo = new THREE.SphereGeometry(0.038, 8, 8);
      padGeo.scale(1.2, 0.35, 1.4);
      const padMesh = new THREE.Mesh(padGeo, this.geckoSkinMaterial);
      padMesh.position.set(0, -0.018, 0.07);
      digitGroup.add(padMesh);

      // Tiny Sharp Hooked Claw at Tip
      const clawGeo = new THREE.ConeGeometry(0.012, 0.04, 6);
      clawGeo.rotateX(Math.PI / 2.5);
      const clawMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
      const clawMesh = new THREE.Mesh(clawGeo, clawMat);
      clawMesh.position.set(0, 0.005, 0.12);
      digitGroup.add(clawMesh);

      palmGroup.add(digitGroup);
    }

    footGroup.add(palmGroup);
    return footGroup;
  }

  // Update Sweatshirt Config Dynamically
  public updateSweatshirt(config: ExanteSweatshirtConfig) {
    this.sweatshirtConfig = config;

    const logoTex = createExanteLogoTexture(config.logoStyle, config.color);
    this.sweatshirtMaterial.map = logoTex;
    this.sweatshirtMaterial.roughness = config.fabricRoughness;
    this.sweatshirtMaterial.needsUpdate = true;

    this.ribbedMaterial.color.set(config.color);

    // Toggle Hood visibility for crewneck vs hoodie
    this.hoodGroup.visible = config.cut === 'hoodie';
    this.pocketMesh.visible = config.showPocket;
  }

  // Update Gecko Skin / Species Dynamically
  public updateSkin(config: RealisticGeckoConfig) {
    this.skinConfig = config;
    const skinTex = createRealisticGeckoSkinTexture(config);
    this.geckoSkinMaterial.map = skinTex;
    this.geckoSkinMaterial.needsUpdate = true;

    const eyeTex = createReptileEyeTexture(config.eyeIrisColor, config.pupilDilation);
    this.leftIrisMaterial.map = eyeTex;
    this.leftIrisMaterial.needsUpdate = true;
    this.rightIrisMaterial.map = eyeTex;
    this.rightIrisMaterial.needsUpdate = true;
  }

  // Trigger Classic Gecko Eye-Licking Behavior!
  public triggerEyeLick(whichEye: 'left' | 'right' = 'left') {
    if (this.isLickingEye || this.isStrikingBug) return;
    this.isLickingEye = true;
    this.eyeLickProgress = 0;
    this.tongueMesh.visible = true;
    soundEngine.playWaterDrip();
  }

  // Trigger Bug Strike / Insect Hunt
  public triggerBugCatch(targetWorldPos: THREE.Vector3, onCatch?: () => void) {
    if (this.isStrikingBug || this.isLickingEye) return;
    this.isStrikingBug = true;
    this.bugStrikeProgress = 0;
    this.bugStrikeTarget.copy(targetWorldPos);
    this.onBugCatchCb = onCatch || null;
    this.tongueMesh.visible = true;
    soundEngine.playTongueStrike();
  }

  // Chirp vocalization
  public triggerChirp() {
    soundEngine.playGeckoChirp();
    // Quick head tilt and jaw open
    this.headGroup.rotation.z = 0.15;
    setTimeout(() => {
      this.headGroup.rotation.z = 0;
    }, 200);
  }

  // Apply Hologram Shader & Material Styling
  public setHologramConfig(config: HologramConfig) {
    this.holoConfig = config;
    this.isHologram = config.enabled;
    const colorHex = HOLO_THEME_COLORS[config.colorTheme] || 0x00D284;

    if (config.enabled) {
      this.sweatshirtMaterial.emissive = new THREE.Color(colorHex);
      this.sweatshirtMaterial.emissiveIntensity = 0.35 * config.pulseIntensity;
      this.sweatshirtMaterial.wireframe = config.wireframe;
      this.sweatshirtMaterial.roughness = 0.3;
      this.sweatshirtMaterial.metalness = 0.4;

      this.ribbedMaterial.emissive = new THREE.Color(colorHex);
      this.ribbedMaterial.emissiveIntensity = 0.4 * config.pulseIntensity;
      this.ribbedMaterial.wireframe = config.wireframe;

      this.geckoSkinMaterial.emissive = new THREE.Color(colorHex);
      this.geckoSkinMaterial.emissiveIntensity = 0.28 * config.pulseIntensity;
      this.geckoSkinMaterial.wireframe = config.wireframe;
      this.geckoSkinMaterial.roughness = 0.2;
      this.geckoSkinMaterial.metalness = 0.3;
    } else {
      this.sweatshirtMaterial.emissive = new THREE.Color(0x000000);
      this.sweatshirtMaterial.emissiveIntensity = 0;
      this.sweatshirtMaterial.wireframe = false;
      this.sweatshirtMaterial.roughness = this.sweatshirtConfig.fabricRoughness;
      this.sweatshirtMaterial.metalness = 0.02;

      this.ribbedMaterial.emissive = new THREE.Color(0x000000);
      this.ribbedMaterial.wireframe = false;

      this.geckoSkinMaterial.emissive = new THREE.Color(0x000000);
      this.geckoSkinMaterial.emissiveIntensity = 0;
      this.geckoSkinMaterial.wireframe = false;
      this.geckoSkinMaterial.roughness = 0.42;
      this.geckoSkinMaterial.metalness = 0.04;
    }
  }

  public setAudioEnergy(energy: number) {
    this.audioEnergy = energy;
  }

  public setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking;
  }

  // Animation & Physics Update
  public update(deltaTime: number, time: number, lookTarget?: THREE.Vector3) {
    // Hologram Glitch and Emissive Pulse
    if (this.isHologram) {
      const pulse = (0.35 + Math.sin(time * 5) * 0.12 + this.audioEnergy * 0.6) * this.holoConfig.pulseIntensity;
      this.sweatshirtMaterial.emissiveIntensity = pulse;
      this.geckoSkinMaterial.emissiveIntensity = pulse * 0.85;

      if (this.holoConfig.glitchActive && Math.random() < 0.06) {
        this.group.position.x = (Math.random() - 0.5) * 0.04;
        this.group.position.y = (Math.random() - 0.5) * 0.03;
      } else {
        this.group.position.x += (0 - this.group.position.x) * 0.2;
        this.group.position.y += (0 - this.group.position.y) * 0.2;
      }
    }

    // 1. Rapid Gular Throat Fluttering (~1.8 Hz lizard respiration, accelerates during speech or audio)
    const speechMultiplier = this.isSpeaking || this.audioEnergy > 0.08 ? 2.2 : 1.0;
    this.gularPhase += deltaTime * (this.skinConfig.gularFlutterSpeed * 10) * speechMultiplier;
    const gularAmp = this.isSpeaking ? 0.16 : 0.09;
    const gularPulse = 1 + Math.sin(this.gularPhase) * gularAmp;
    this.gularThroatMesh.scale.set(gularPulse, 1 + Math.sin(this.gularPhase + 0.5) * (gularAmp * 1.3), 1);


    // 2. Slow Ribcage Breathing
    this.breathPhase += deltaTime * 2.2;
    const breathScale = 1 + Math.sin(this.breathPhase) * 0.015;
    this.sweatshirtTorsoMesh.scale.set(breathScale, 1 + Math.sin(this.breathPhase) * 0.012, breathScale);

    // 3. Realistic Lizard Head Saccades & Look Tracking
    this.saccadeTimer += deltaTime;
    if (this.saccadeTimer > 2.5 + Math.random() * 2) {
      this.saccadeTimer = 0;
      // Quick discrete turn
      this.targetHeadYaw = (Math.random() - 0.5) * 0.35;
      this.targetHeadPitch = (Math.random() - 0.5) * 0.2;
    }

    if (lookTarget) {
      const localLook = lookTarget.clone();
      this.headGroup.worldToLocal(localLook);
      const yaw = Math.max(-0.6, Math.min(0.6, Math.atan2(localLook.x, localLook.z)));
      const pitch = Math.max(-0.35, Math.min(0.35, -Math.atan2(localLook.y, localLook.z)));
      this.headGroup.rotation.y += (yaw - this.headGroup.rotation.y) * 0.12;
      this.headGroup.rotation.x += (pitch - this.headGroup.rotation.x) * 0.12;
    } else {
      this.headGroup.rotation.y += (this.targetHeadYaw - this.headGroup.rotation.y) * 0.08;
      this.headGroup.rotation.x += (this.targetHeadPitch - this.headGroup.rotation.x) * 0.08;
    }

    // 4. Tail Natural Sinuous Swaying
    let currentTailGroup: THREE.Object3D = this.tailGroup;
    let segIdx = 0;
    while (currentTailGroup.children.length > 0) {
      const child = currentTailGroup.children[0];
      if (child instanceof THREE.Group) {
        const offset = segIdx * 0.32;
        child.rotation.y = Math.sin(time * 2.0 - offset) * 0.14;
        child.rotation.x = Math.cos(time * 1.6 - offset) * 0.06;
        currentTailGroup = child;
        segIdx++;
      } else {
        break;
      }
    }

    // 5. Eye-Licking Behavior Kinematics (Iconic Real Gecko Habit)
    if (this.isLickingEye) {
      this.eyeLickProgress += deltaTime * 2.4; // fast tongue sweep
      if (this.eyeLickProgress < 1.0) {
        const p = this.eyeLickProgress;
        // Tongue curls out of mouth, sweeps across left eyeball, and returns
        const tongueTipX = Math.sin(p * Math.PI) * 0.36;
        const tongueTipY = Math.sin(p * Math.PI) * 0.22;
        const tongueTipZ = 0.5 - Math.cos(p * Math.PI) * 0.25;

        this.tongueCurve.points = [
          new THREE.Vector3(0, -0.05, 0.4),
          new THREE.Vector3(tongueTipX * 0.5, tongueTipY * 0.8, tongueTipZ * 0.7),
          new THREE.Vector3(tongueTipX, tongueTipY, tongueTipZ),
        ];
        this.tongueMesh.geometry.dispose();
        this.tongueMesh.geometry = new THREE.TubeGeometry(this.tongueCurve, 16, 0.045, 8, false);
      } else {
        this.isLickingEye = false;
        this.tongueMesh.visible = false;
      }
    }

    // 6. Bug Strike Physics
    if (this.isStrikingBug) {
      this.bugStrikeProgress += deltaTime * 5.0; // lightning-fast tongue snap
      if (this.bugStrikeProgress < 0.5) {
        // Extending outward
        const localTarget = this.headGroup.worldToLocal(this.bugStrikeTarget.clone());
        this.tongueCurve.points = [
          new THREE.Vector3(0, -0.05, 0.4),
          localTarget.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 0.15, 0)),
          localTarget,
        ];
        this.tongueMesh.geometry.dispose();
        this.tongueMesh.geometry = new THREE.TubeGeometry(this.tongueCurve, 16, 0.045, 8, false);
      } else if (this.bugStrikeProgress < 1.0) {
        if (this.onBugCatchCb) {
          this.onBugCatchCb();
          this.onBugCatchCb = null;
          soundEngine.playCatchCrunch();
        }
        // Retracting back
        const factor = (1.0 - this.bugStrikeProgress) * 2;
        const localTarget = this.headGroup.worldToLocal(this.bugStrikeTarget.clone()).multiplyScalar(factor);
        this.tongueCurve.points = [
          new THREE.Vector3(0, -0.05, 0.4),
          new THREE.Vector3(0, 0, 0.3),
          localTarget,
        ];
        this.tongueMesh.geometry.dispose();
        this.tongueMesh.geometry = new THREE.TubeGeometry(this.tongueCurve, 16, 0.045, 8, false);
      } else {
        this.isStrikingBug = false;
        this.tongueMesh.visible = false;
      }
    }
  }
}
