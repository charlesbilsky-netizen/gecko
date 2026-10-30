import * as THREE from 'three';
import { ExanteLogoStyle, RealisticGeckoConfig } from '../types/gecko';

/**
 * Procedural texture synthesizers for:
 * 1. Authentic EXANTE apparel chest print with vector-sharp typography
 * 2. High-resolution granular reptile scale albedo & bump maps
 * 3. Photorealistic cotton/fleece fabric weave
 * 4. Realistic reptile eye iris with metallic flecks and slit pupil
 */

// 1. EXANTE Printed Chest Logo Texture
export function createExanteLogoTexture(
  style: ExanteLogoStyle,
  sweatshirtColor: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base sweatshirt color fill
  ctx.fillStyle = sweatshirtColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height * 0.45; // Centered on sweatshirt chest

  // Draw Subtle Kangaroo Pocket Seam lower down
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - 240, cy + 180, 480, 220, [30, 30, 10, 10]);
  ctx.stroke();

  // Stitching highlights
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  if (style === 'classic_white') {
    // Official EXANTE Geometric Logo Mark (Chevron/Arrow geometric icon)
    ctx.fillStyle = '#ffffff';

    // Left chevron / geometric shape
    ctx.beginPath();
    ctx.moveTo(cx - 180, cy - 80);
    ctx.lineTo(cx - 130, cy - 80);
    ctx.lineTo(cx - 90, cy);
    ctx.lineTo(cx - 130, cy + 80);
    ctx.lineTo(cx - 180, cy + 80);
    ctx.lineTo(cx - 140, cy);
    ctx.closePath();
    ctx.fill();

    // Right chevron / geometric accent
    ctx.fillStyle = '#00D284'; // Exante Emerald Tech Accent
    ctx.beginPath();
    ctx.moveTo(cx - 120, cy - 80);
    ctx.lineTo(cx - 70, cy - 80);
    ctx.lineTo(cx - 30, cy);
    ctx.lineTo(cx - 70, cy + 80);
    ctx.lineTo(cx - 120, cy + 80);
    ctx.lineTo(cx - 80, cy);
    ctx.closePath();
    ctx.fill();

    // Bold Clean EXANTE Typography
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 100px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '4px';
    ctx.fillText('EXANTE', cx + 10, cy - 8);

    // Subtitle Tagline
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 24px -apple-system, sans-serif';
    ctx.letterSpacing = '6px';
    ctx.fillText('INVESTMENT PLATFORM', cx + 14, cy + 54);
  } else if (style === 'emerald_tech') {
    // Glowing Emerald Tech Modern Badge
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 260);
    grad.addColorStop(0, 'rgba(0, 210, 132, 0.25)');
    grad.addColorStop(1, 'rgba(0, 210, 132, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Large Center Emblem
    ctx.fillStyle = '#00D284';
    ctx.beginPath();
    ctx.moveTo(cx - 60, cy - 90);
    ctx.lineTo(cx, cy - 140);
    ctx.lineTo(cx + 60, cy - 90);
    ctx.lineTo(cx, cy - 40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 115px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText('EXANTE', cx, cy + 25);

    ctx.fillStyle = '#00D284';
    ctx.font = '700 28px monospace';
    ctx.letterSpacing = '4px';
    ctx.fillText('● GLOBAL MULTI-ASSET BROKER ●', cx, cy + 95);
  } else if (style === 'minimal_x') {
    // High-Fashion Minimalist Monogram
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.beginPath();
    // Modern stylized geometric 'X'
    ctx.moveTo(cx - 70, cy - 70);
    ctx.lineTo(cx + 70, cy + 70);
    ctx.moveTo(cx + 70, cy - 70);
    ctx.lineTo(cx - 70, cy + 70);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '12px';
    ctx.fillText('EXANTE', cx, cy + 120);
  } else if (style === 'gold_embroidery') {
    // Luxury Gold Thread Embroidery
    ctx.fillStyle = '#eab308';
    ctx.font = '900 110px -apple-system, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText('EXANTE', cx, cy - 10);

    ctx.fillStyle = '#fde047';
    ctx.font = '700 24px -apple-system, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('PRIME BROKERAGE', cx, cy + 60);

    // Embroidery stitch texture line
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - 240, cy - 80, 480, 180);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Realistic Reptile Granular Scale Texture
export function createRealisticGeckoSkinTexture(config: RealisticGeckoConfig): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base reptile color
  ctx.fillStyle = config.primaryColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Dorsal color gradient / markings
  if (config.species === 'day_gecko') {
    // Bright turquoise/emerald with crimson dorsal speckles and stripes
    ctx.fillStyle = config.secondaryColor; // Vibrant crimson
    for (let i = 0; i < 90; i++) {
      const x = canvas.width * 0.35 + Math.random() * (canvas.width * 0.3);
      const y = Math.random() * canvas.height;
      const r = 8 + Math.random() * 20;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (config.species === 'leopard_gecko') {
    // Cream/yellow base with brown/black rosettes
    ctx.fillStyle = config.secondaryColor;
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 10 + Math.random() * 16;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Hollow center rosette
      ctx.fillStyle = config.primaryColor;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = config.secondaryColor;
    }
  } else if (config.species === 'tokay_gecko') {
    // Powder blue with bright coral/orange dots
    ctx.fillStyle = config.secondaryColor;
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 5 + Math.random() * 12;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw micro-granular tuberculate reptile scales
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  const scaleSize = 10;
  for (let y = 0; y < canvas.height; y += scaleSize) {
    const rowOffset = (Math.floor(y / scaleSize) % 2) * (scaleSize / 2);
    for (let x = 0; x < canvas.width; x += scaleSize) {
      ctx.beginPath();
      ctx.arc(x + rowOffset, y, scaleSize * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      if ((x + y) % 3 === 0) ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 3. High-Detail Reptile Scale Bump Map (Voronoi-like micro-scale domes)
export function createReptileScaleBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scaleSize = 12;
  for (let y = 0; y < canvas.height; y += scaleSize) {
    const rowOffset = (Math.floor(y / scaleSize) % 2) * (scaleSize / 2);
    for (let x = 0; x < canvas.width; x += scaleSize) {
      const cx = x + rowOffset;
      const cy = y;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scaleSize * 0.48);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#909090');
      grad.addColorStop(1, '#505050');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, scaleSize * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 4. Photorealistic Sweatshirt Cotton/Fleece Fabric Bump Map
export function createSweatshirtFabricBumpMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Micro interlocking knit weave
  ctx.fillStyle = '#a0a0a0';
  for (let x = 0; x < canvas.width; x += 4) {
    for (let y = 0; y < canvas.height; y += 4) {
      if ((x + y) % 6 === 0) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }

  // Subtle fabric wrinkle folds
  ctx.strokeStyle = 'rgba(60, 60, 60, 0.4)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(80, 200);
  ctx.bezierCurveTo(200, 240, 320, 180, 440, 220);
  ctx.moveTo(60, 360);
  ctx.bezierCurveTo(180, 390, 340, 340, 460, 370);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

// 5. Realistic Reptile Eye Texture with Radial Striations & Vertical Slit Pupil
export function createReptileEyeTexture(irisColor: string, pupilDilation: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = canvas.width * 0.46;

  // Dark sclera / outer ring
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Iris Base with Radial Gradient
  const irisGrad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  irisGrad.addColorStop(0, '#fef08a'); // golden inner
  irisGrad.addColorStop(0.5, irisColor);
  irisGrad.addColorStop(0.9, '#362208'); // dark limbal boundary
  irisGrad.addColorStop(1, '#000000');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Radiating Fine Striations
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const inner = radius * 0.2 + Math.random() * (radius * 0.1);
    const outer = radius * 0.95;
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 255, 200, 0.4)' : 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  // Realistic Gecko Vertical Slit Pupil with Characteristic Scalloped Pinholes
  const pw = Math.max(8, radius * 0.14 * pupilDilation);
  const ph = radius * 0.85;

  ctx.fillStyle = '#050505';
  ctx.beginPath();
  ctx.ellipse(cx, cy, pw, ph, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scalloped pinhole notches (day/crested gecko pupil traits)
  for (let offset of [-ph * 0.5, -ph * 0.2, ph * 0.2, ph * 0.5]) {
    ctx.beginPath();
    ctx.arc(cx, cy + offset, pw * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 6. Soft Studio Contact Shadow
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx * 0.88);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return new THREE.CanvasTexture(canvas);
}
