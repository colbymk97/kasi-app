// Generates the bell sound (WAV) and PWA icons (PNG) without external tools.
// Run with: node scripts/gen-assets.mjs

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(here, '..', 'public');

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

// ----- Bell WAV -----
function generateBellWav() {
  const sampleRate = 22050;
  const durationSec = 3.0;
  const totalSamples = Math.floor(sampleRate * durationSec);

  // Singing-bowl-like: fundamental + a few inharmonic partials, exponential decay.
  const partials = [
    { freq: 440, amp: 1.0, decay: 1.6 },
    { freq: 880, amp: 0.5, decay: 1.2 },
    { freq: 1318, amp: 0.25, decay: 0.9 },
    { freq: 1760, amp: 0.12, decay: 0.6 },
    { freq: 660, amp: 0.35, decay: 1.4 },
  ];

  const data = Buffer.alloc(totalSamples * 2); // 16-bit mono
  const attack = 0.01; // 10ms attack to avoid click
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let s = 0;
    for (const p of partials) {
      s += p.amp * Math.sin(2 * Math.PI * p.freq * t) * Math.exp(-t / p.decay);
    }
    const env = t < attack ? t / attack : 1;
    s *= env;
    s *= 0.35; // overall gain
    // soft clip
    if (s > 1) s = 1;
    if (s < -1) s = -1;
    const int16 = Math.round(s * 32767);
    data.writeInt16LE(int16, i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // channels
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  const out = Buffer.concat([header, data]);
  const soundsDir = resolve(publicDir, 'sounds');
  ensureDir(soundsDir);
  writeFileSync(resolve(soundsDir, 'bell.wav'), out);
  console.log('Wrote public/sounds/bell.wav', out.length, 'bytes');
}

// ----- PNG encoding (hand-rolled, since we can't depend on a PNG lib) -----
function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
const CRC_TABLE = crc32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeOrbIcon(size, { padding = 0.18, color = [88, 158, 230] } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = (size / 2) * (1 - padding);
  const r2 = radius * radius;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      // background is black opaque
      rgba[idx] = 0;
      rgba[idx + 1] = 0;
      rgba[idx + 2] = 0;
      rgba[idx + 3] = 255;
      if (d2 <= r2) {
        // soft edge over ~1.5px
        const d = Math.sqrt(d2);
        const edge = radius - d;
        const alpha = Math.min(1, Math.max(0, edge / 1.5));
        // radial gradient: brighter in center
        const t = Math.min(1, d / radius);
        const center = [color[0] + 30, color[1] + 30, color[2] + 30].map((c) =>
          Math.min(255, c)
        );
        const edgeCol = color;
        const mix = (a, b) => Math.round(a * (1 - t) + b * t);
        const r = mix(center[0], edgeCol[0]);
        const g = mix(center[1], edgeCol[1]);
        const b = mix(center[2], edgeCol[2]);
        // composite over black with alpha
        rgba[idx] = Math.round(r * alpha);
        rgba[idx + 1] = Math.round(g * alpha);
        rgba[idx + 2] = Math.round(b * alpha);
        rgba[idx + 3] = 255;
      }
    }
  }
  return encodePng(size, size, rgba);
}

function generateIcons() {
  const iconsDir = resolve(publicDir, 'icons');
  ensureDir(iconsDir);

  const blue = [88, 158, 230];

  const icon192 = makeOrbIcon(192, { padding: 0.14, color: blue });
  writeFileSync(resolve(iconsDir, 'icon-192.png'), icon192);

  const icon512 = makeOrbIcon(512, { padding: 0.14, color: blue });
  writeFileSync(resolve(iconsDir, 'icon-512.png'), icon512);

  // Maskable: smaller orb so it fits inside the safe zone (~80% diameter).
  const iconMask = makeOrbIcon(512, { padding: 0.28, color: blue });
  writeFileSync(resolve(iconsDir, 'icon-maskable-512.png'), iconMask);

  const apple = makeOrbIcon(180, { padding: 0.16, color: blue });
  writeFileSync(resolve(iconsDir, 'apple-touch-icon.png'), apple);

  // SVG favicon
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#000"/>
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#7ab0e8"/>
      <stop offset="100%" stop-color="#3a6ea5"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="22" fill="url(#g)"/>
</svg>
`;
  writeFileSync(resolve(iconsDir, 'icon.svg'), svg);
  console.log('Wrote PWA icons to public/icons/');
}

generateBellWav();
generateIcons();
