import * as THREE from 'three';
import { TimelineId } from './types';

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createEraFloorTexture(
  era: TimelineId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (era === 'past') {
    // Weathered Sunstone Sanctuary basalt slabs with moss seams
    ctx.fillStyle = '#332a21';
    ctx.fillRect(0, 0, size, size);

    const tile = 128;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const shade = 40 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${shade + 10}, ${shade + 4}, ${shade - 4})`;
        ctx.fillRect(x + 4, y + 4, tile - 8, tile - 8);

        // Subtle stone speckle
        for (let i = 0; i < 40; i++) {
          const sx = x + 6 + Math.random() * (tile - 12);
          const sy = y + 6 + Math.random() * (tile - 12);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,220,170,0.06)' : 'rgba(15,10,5,0.14)';
          ctx.fillRect(sx, sy, 3, 3);
        }

        // Moss patches along cracks
        if (Math.random() > 0.45) {
          ctx.fillStyle = 'rgba(84, 120, 58, 0.38)';
          ctx.fillRect(x, y, tile, 5);
          ctx.fillRect(x, y, 5, tile * 0.55);
        }
      }
    }
    // Carved gold inlay ring accent
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, size - 24, size - 24);
    return configureTexture(canvas, 14, 14, maxAnisotropy);
  }

  if (era === 'present') {
    // Sterile Bio-Lab composite deck with hazard trim & grid seams
    ctx.fillStyle = '#14242b';
    ctx.fillRect(0, 0, size, size);

    const tile = 128;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        ctx.fillStyle = '#1b313a';
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 12, y + 12, tile - 24, tile - 24);
      }
    }

    // Center emerald bio-line
    ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.fillRect(0, size / 2 - 3, size, 6);
    ctx.fillRect(size / 2 - 3, 0, 6, size);
    return configureTexture(canvas, 14, 14, maxAnisotropy);
  }

  // Future Cyber-Citadel obsidian circuit lattice
  ctx.fillStyle = '#090714';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(168, 85, 247, 0.24)';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Glowing cyan circuit traces
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(192, 128);
  ctx.lineTo(256, 192);
  ctx.lineTo(512, 192);
  ctx.stroke();

  ctx.fillStyle = 'rgba(232, 121, 249, 0.6)';
  ctx.fillRect(188, 124, 8, 8);
  ctx.fillRect(252, 188, 8, 8);

  return configureTexture(canvas, 14, 14, maxAnisotropy);
}

export function createEraBlockTexture(
  era: TimelineId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (era === 'past') {
    ctx.fillStyle = '#4a3d31';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 64) {
      const offset = (y / 64) % 2 === 0 ? 0 : 64;
      for (let x = -64; x < size; x += 128) {
        const v = 64 + Math.floor(Math.random() * 18);
        ctx.fillStyle = `rgb(${v + 12}, ${v + 4}, ${v - 5})`;
        ctx.fillRect(x + offset + 3, y + 3, 122, 58);
      }
    }
    ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.fillRect(0, size - 16, size, 6);
    return configureTexture(canvas, 2, 2, maxAnisotropy);
  }

  if (era === 'present') {
    ctx.fillStyle = '#253944';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#334e5c';
    ctx.fillRect(8, 8, size - 16, size - 16);
    // Hazard diagonal stripe bottom band
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, size - 32, size, 32);
    ctx.fillStyle = '#10b981';
    for (let x = -32; x < size + 32; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, size);
      ctx.lineTo(x + 16, size);
      ctx.lineTo(x + 32, size - 32);
      ctx.lineTo(x + 16, size - 32);
      ctx.closePath();
      ctx.fill();
    }
    return configureTexture(canvas, 1, 1, maxAnisotropy);
  }

  // Future obsidian tech plating
  ctx.fillStyle = '#120e24';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(232, 121, 249, 0.48)';
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(10, size / 2);
  ctx.lineTo(size - 10, size / 2);
  ctx.stroke();
  return configureTexture(canvas, 1, 1, maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
