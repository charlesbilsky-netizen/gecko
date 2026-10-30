import React, { useState } from 'react';
import {
  ExanteSweatshirtConfig,
  RealisticGeckoConfig,
  StudioStage,
  CameraPreset,
  ExanteLogoStyle,
  SweatshirtCut,
  GeckoSpecies,
} from '../types/gecko';
import {
  Shirt,
  Sparkles,
  Sun,
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
  Utensils,
  Layers,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

export const EXANTE_SWEATSHIRT_COLORS = [
  { name: 'EXANTE Navy', hex: '#0F172A' },
  { name: 'Emerald Tech', hex: '#00D284' },
  { name: 'Heather Charcoal', hex: '#334155' },
  { name: 'Deep Burgundy', hex: '#4c0519' },
  { name: 'Crisp White', hex: '#F8FAFC' },
  { name: 'Jet Black', hex: '#0a0a0c' },
];

export const REALISTIC_SPECIES_PRESETS: {
  species: GeckoSpecies;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bellyColor: string;
  eyeIrisColor: string;
}[] = [
  {
    species: 'day_gecko',
    name: 'Madagascar Day Gecko',
    description: 'Emerald turquoise body with vibrant scarlet dorsal speckles.',
    primaryColor: '#10b981',
    secondaryColor: '#ef4444',
    bellyColor: '#d1fae5',
    eyeIrisColor: '#f59e0b',
  },
  {
    species: 'leopard_gecko',
    name: 'Desert Leopard Gecko',
    description: 'Warm sandy cream skin with characteristic dark rosettes.',
    primaryColor: '#f59e0b',
    secondaryColor: '#451a03',
    bellyColor: '#fef3c7',
    eyeIrisColor: '#854d0e',
  },
  {
    species: 'tokay_gecko',
    name: 'Asian Tokay Gecko',
    description: 'Slate blue body covered with bright coral orange spots.',
    primaryColor: '#0284c7',
    secondaryColor: '#f97316',
    bellyColor: '#e0f2fe',
    eyeIrisColor: '#ca8a04',
  },
  {
    species: 'crested_gecko',
    name: 'New Caledonian Crested',
    description: 'Olive khaki skin with fringed eyebrow crests and yellow highlights.',
    primaryColor: '#65a30d',
    secondaryColor: '#ca8a04',
    bellyColor: '#ecfccb',
    eyeIrisColor: '#a16207',
  },
];

interface ControlDockProps {
  sweatshirtConfig: ExanteSweatshirtConfig;
  skinConfig: RealisticGeckoConfig;
  studioStage: StudioStage;
  cameraPreset: CameraPreset;
  onUpdateSweatshirt: (config: ExanteSweatshirtConfig) => void;
  onUpdateSkin: (config: RealisticGeckoConfig) => void;
  onSelectStudioStage: (stage: StudioStage) => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onLickEye: () => void;
  onFeedCricket: () => void;
  onTriggerChirp: () => void;
}

type TabType = 'sweatshirt' | 'gecko' | 'stage' | 'interact';

export const ControlDock: React.FC<ControlDockProps> = ({
  sweatshirtConfig,
  skinConfig,
  studioStage,
  cameraPreset,
  onUpdateSweatshirt,
  onUpdateSkin,
  onSelectStudioStage,
  onSelectCameraPreset,
  onLickEye,
  onFeedCricket,
  onTriggerChirp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('sweatshirt');

  const handleTabClick = (tab: TabType) => {
    soundEngine.playClick();
    setActiveTab(tab);
    if (isCollapsed) setIsCollapsed(false);
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[940px] flex flex-col items-center pointer-events-auto">
      {/* Collapse / Expand Toggle Button */}
      <button
        onClick={() => {
          soundEngine.playClick();
          setIsCollapsed(!isCollapsed);
        }}
        className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-300 text-xs font-mono font-medium rounded-t-xl border-t border-x border-emerald-500/30 backdrop-blur-md shadow-lg transition-all cursor-pointer"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Show Studio Customizer</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Control Dock */}
      <div
        className={`w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-2xl transition-all duration-300 ${
          isCollapsed ? 'translate-y-[120%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => handleTabClick('sweatshirt')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sweatshirt'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shirt className="w-4 h-4" />
              <span>EXANTE Sweatshirt</span>
            </button>

            <button
              onClick={() => handleTabClick('gecko')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'gecko'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Real Gecko Biology</span>
            </button>

            <button
              onClick={() => handleTabClick('stage')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'stage'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Stage & Camera</span>
            </button>

            <button
              onClick={() => handleTabClick('interact')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'interact'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Live Biology Actions</span>
            </button>
          </div>
        </div>

        {/* Tab 1: EXANTE Sweatshirt Customizer */}
        {activeTab === 'sweatshirt' && (
          <div className="space-y-4">
            {/* Colorways */}
            <div>
              <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Official EXANTE Sweatshirt Colors
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {EXANTE_SWEATSHIRT_COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateSweatshirt({ ...sweatshirtConfig, color: c.hex, colorName: c.name });
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      sweatshirtConfig.color === c.hex
                        ? 'bg-slate-800 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full border border-slate-700 shrink-0 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Style & Cut Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">EXANTE Logo Print</label>
                <select
                  value={sweatshirtConfig.logoStyle}
                  onChange={e =>
                    onUpdateSweatshirt({ ...sweatshirtConfig, logoStyle: e.target.value as ExanteLogoStyle })
                  }
                  className="w-full bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="classic_white">Official White & Emerald Chevron</option>
                  <option value="emerald_tech">Emerald Tech Badge</option>
                  <option value="minimal_x">Modern Monogram X</option>
                  <option value="gold_embroidery">Gold Thread Embroidery</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Apparel Cut</label>
                <select
                  value={sweatshirtConfig.cut}
                  onChange={e =>
                    onUpdateSweatshirt({ ...sweatshirtConfig, cut: e.target.value as SweatshirtCut })
                  }
                  className="w-full bg-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="hoodie">Hoodie (Draped Hood & Strings)</option>
                  <option value="crewneck">Crewneck Sweatshirt</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-300 font-medium">Kangaroo Pouch Pocket</span>
                <input
                  type="checkbox"
                  checked={sweatshirtConfig.showPocket}
                  onChange={e => onUpdateSweatshirt({ ...sweatshirtConfig, showPocket: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Real Gecko Biology */}
        {activeTab === 'gecko' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Realistic Lizard Species Morphs
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {REALISTIC_SPECIES_PRESETS.map(preset => (
                  <button
                    key={preset.species}
                    onClick={() => {
                      soundEngine.playClick();
                      onUpdateSkin({
                        ...skinConfig,
                        species: preset.species,
                        speciesName: preset.name,
                        primaryColor: preset.primaryColor,
                        secondaryColor: preset.secondaryColor,
                        bellyColor: preset.bellyColor,
                        eyeIrisColor: preset.eyeIrisColor,
                      });
                    }}
                    className={`flex flex-col items-start p-3 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                      skinConfig.species === preset.species
                        ? 'bg-slate-800 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 w-full">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-700 shrink-0"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <span className="font-bold truncate">{preset.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Biological Sliders (Gular Flutter, Pupil Dilation) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Gular Throat Respiration</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {skinConfig.gularFlutterSpeed.toFixed(1)}x Flutter
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={skinConfig.gularFlutterSpeed}
                  onChange={e =>
                    onUpdateSkin({ ...skinConfig, gularFlutterSpeed: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Reptile Slit Pupil Dilation</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {Math.round(skinConfig.pupilDilation * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={skinConfig.pupilDilation}
                  onChange={e =>
                    onUpdateSkin({ ...skinConfig, pupilDilation: parseFloat(e.target.value) })
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Stage & Camera */}
        {activeTab === 'stage' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Environment Stage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectStudioStage('mossy_branch');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    studioStage === 'mossy_branch'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>🌿 Mossy Branch</div>
                  <div className="text-[10px] text-slate-500 font-normal">Natural reptile perch</div>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectStudioStage('luxury_studio');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    studioStage === 'luxury_studio'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>🏛️ Luxury Plinth</div>
                  <div className="text-[10px] text-slate-500 font-normal">Emerald rim studio</div>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectStudioStage('exante_trading_floor');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    studioStage === 'exante_trading_floor'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>📈 EXANTE Floor</div>
                  <div className="text-[10px] text-slate-500 font-normal">Fintech slate stage</div>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectStudioStage('clean_white');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    studioStage === 'clean_white'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div>⚪ White Catalog</div>
                  <div className="text-[10px] text-slate-500 font-normal">High-key product shot</div>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Camera Inspection Angles
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCameraPreset('hero_front');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    cameraPreset === 'hero_front'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Hero Front
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCameraPreset('sweatshirt_chest');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    cameraPreset === 'sweatshirt_chest'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Logo Macro
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCameraPreset('gecko_face');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    cameraPreset === 'gecko_face'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  Lizard Eyes Macro
                </button>

                <button
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCameraPreset('three_quarter');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    cameraPreset === 'three_quarter'
                      ? 'bg-slate-800 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  3/4 Angle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Live Biology Actions */}
        {activeTab === 'interact' && (
          <div className="space-y-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Classic Gecko Eyeball-Licking</h4>
                <p className="text-[11px] text-slate-400">
                  Because geckos have transparent scales instead of movable eyelids, they use their long tongue to clean their eyes!
                </p>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onLickEye();
                }}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                👅 Lick Eye Now
              </button>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Feed Live Cricket</h4>
                <p className="text-[11px] text-slate-400">
                  Gecko will focus its eyes, cock its head, and snap out its sticky tongue with realistic crunch sound!
                </p>
              </div>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onFeedCricket();
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                🦗 Feed Cricket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
