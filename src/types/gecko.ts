export type ExanteLogoStyle = 'classic_white' | 'emerald_tech' | 'minimal_x' | 'gold_embroidery';

export type SweatshirtCut = 'hoodie' | 'crewneck' | 'zip_up';

export type FabricType = 'fleece' | 'cotton' | 'terry';

export interface ExanteSweatshirtConfig {
  color: string; // Hex color
  colorName: string;
  logoStyle: ExanteLogoStyle;
  cut: SweatshirtCut;
  drawstringColor: string;
  fabricType: FabricType;
  showPocket: boolean;
  fabricRoughness: number;
}

export type GeckoSpecies = 'day_gecko' | 'leopard_gecko' | 'crested_gecko' | 'tokay_gecko';

export interface RealisticGeckoConfig {
  species: GeckoSpecies;
  speciesName: string;
  primaryColor: string;
  secondaryColor: string;
  bellyColor: string;
  eyeIrisColor: string;
  pupilDilation: number; // 0.1 to 1.0
  scaleDetail: number; // bump intensity
  gularFlutterSpeed: number; // rapid throat breathing
}

export type StudioStage = 'hologram_pedestal' | 'luxury_studio' | 'mossy_branch' | 'exante_trading_floor' | 'clean_white';

export type GeckoAction = 'idle' | 'lick_eye' | 'catch_bug' | 'wave_hand' | 'head_tilt';

export type CameraPreset = 'hero_front' | 'sweatshirt_chest' | 'gecko_face' | 'three_quarter' | 'orbit_free';

export type VisualRenderMode = 'hologram_3d' | 'realistic_3d' | 'photo_locked';

export type HologramColorTheme = 'emerald' | 'cyan' | 'matrix' | 'violet' | 'amber';

export interface HologramConfig {
  enabled: boolean;
  wireframe: boolean;
  colorTheme: HologramColorTheme;
  glitchActive: boolean;
  scanlines: boolean;
  pulseIntensity: number;
}
