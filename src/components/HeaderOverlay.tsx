import React from 'react';
import { Volume2, VolumeX, Camera, RotateCw, Sparkles, Utensils, Eye } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface HeaderOverlayProps {
  isMuted: boolean;
  turntableActive: boolean;
  onToggleMute: () => void;
  onToggleTurntable: () => void;
  onTakeSnapshot: () => void;
  onLickEye: () => void;
  onFeedCricket: () => void;
  onTriggerChirp: () => void;
}

export const HeaderOverlay: React.FC<HeaderOverlayProps> = ({
  isMuted,
  turntableActive,
  onToggleMute,
  onToggleTurntable,
  onTakeSnapshot,
  onLickEye,
  onFeedCricket,
  onTriggerChirp,
}) => {
  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* EXANTE Apparel & Realistic Gecko Title */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-emerald-500/30 rounded-2xl px-4 py-2.5 backdrop-blur-md pointer-events-auto shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-xl font-bold text-slate-950 shadow-md">
          🦎
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-white tracking-wide uppercase font-mono">
              EXANTE Gecko Studio
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full px-2 py-0.5">
              Realistic 3D
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Real Lizard Anatomy • Official EXANTE Sweatshirt</p>
        </div>
      </div>

      {/* Fun & Useful Interactive Live Actions */}
      <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
        {/* Lick Eye Button (Iconic real gecko behavior) */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onLickEye();
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
          title="Geckos have no eyelids—click to lick eye!"
        >
          <Eye className="w-4 h-4 text-pink-400" />
          <span>Lick Eye 👅</span>
        </button>

        {/* Feed Cricket Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onFeedCricket();
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md"
          title="Feed a live cricket to the gecko"
        >
          <Utensils className="w-4 h-4 text-amber-400" />
          <span>Feed Cricket 🦗</span>
        </button>

        {/* Chirp Sound */}
        <button
          onClick={onTriggerChirp}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          <span>🗣️ Chirp</span>
        </button>

        {/* Turntable 360 Rotation Toggle */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onToggleTurntable();
          }}
          title="Toggle 360° Turntable Auto-Rotation"
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            turntableActive
              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <RotateCw className={`w-3.5 h-3.5 ${turntableActive ? 'animate-spin' : ''}`} />
          <span>360° Turntable</span>
        </button>

        {/* High-Res Snapshot Export */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onTakeSnapshot();
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-emerald-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Save Photo</span>
        </button>

        {/* Mute Toggle */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 transition-all cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>
    </header>
  );
};
