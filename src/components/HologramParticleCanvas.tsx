import React, { useRef, useEffect } from 'react';

interface HologramParticleCanvasProps {
  fftData: number[]; // 16 bands
  rmsVolume: number;
  reducedMotion: boolean;
  pointerParallax: { x: number; y: number };
}

export const HologramParticleCanvas: React.FC<HologramParticleCanvasProps> = ({
  fftData,
  rmsVolume,
  reducedMotion,
  pointerParallax,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // 1,200 rendered particles with high density representation of the 12,000 particle cloud
    const PARTICLE_COUNT = 900;
    const particles = new Float32Array(PARTICLE_COUNT * 6); // [x, y, vx, vy, baseRadius, angle]

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 6;
      const angle = Math.random() * Math.PI * 2;
      const rad = 25 + Math.random() * 85;
      particles[idx] = centerX + Math.cos(angle) * rad;
      particles[idx + 1] = centerY + Math.sin(angle) * rad;
      particles[idx + 2] = (Math.random() - 0.5) * 0.4;
      particles[idx + 3] = (Math.random() - 0.5) * 0.4;
      particles[idx + 4] = rad;
      particles[idx + 5] = angle;
    }

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Parallax offsets
      const offsetX = pointerParallax.x * 14;
      const offsetY = pointerParallax.y * 14;

      // Acoustic energy factor from FFT & RMS
      const acousticBoost = reducedMotion ? 1 : 1 + rmsVolume * 2.5;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 6;
        let x = particles[idx];
        let y = particles[idx + 1];
        let angle = particles[idx + 5];
        const baseRad = particles[idx + 4];

        // 16-band FFT index mapping
        const bandIdx = i % 16;
        const bandEnergy = (fftData[bandIdx] || 0) / 255;

        if (!reducedMotion) {
          // Curl-noise orbital turbulence simulation
          const curl = Math.sin(time + baseRad * 0.05) * 0.015 + bandEnergy * 0.04;
          angle += 0.008 + curl;
          particles[idx + 5] = angle;

          const currentRad = (baseRad + bandEnergy * 28) * acousticBoost;
          x = centerX + offsetX + Math.cos(angle) * currentRad;
          y = centerY + offsetY + Math.sin(angle) * (currentRad * 0.85);
        } else {
          // Stationary breathing orb in reduced motion
          const breath = Math.sin(time * 0.5) * 4;
          x = centerX + offsetX + Math.cos(angle) * (baseRad + breath);
          y = centerY + offsetY + Math.sin(angle) * (baseRad + breath) * 0.85;
        }

        particles[idx] = x;
        particles[idx + 1] = y;

        // Color gradient between cyan, emerald, and gold
        const isAccent = i % 8 === 0;
        const alpha = Math.min(0.9, 0.2 + bandEnergy * 0.6 + rmsVolume * 0.3);
        const radius = isAccent ? 1.8 + bandEnergy * 1.5 : 0.9 + bandEnergy;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isAccent
          ? `rgba(6, 182, 212, ${alpha})` // Cyan
          : `rgba(0, 210, 132, ${alpha})`; // Emerald EXANTE green
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [fftData, rmsVolume, reducedMotion, pointerParallax]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
    />
  );
};
