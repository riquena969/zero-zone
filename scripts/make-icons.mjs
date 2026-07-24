// Gera os ícones PWA (PNG) sem nenhuma dependência: buffer RGBA desenhado à
// mão + codificação PNG mínima (IHDR/IDAT/IEND com zlib do Node).
// Uso: node scripts/make-icons.mjs

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // scanlines com filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIcon(size) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    // alpha-blend por cima do que já tem
    const na = a / 255;
    px[i] = Math.round(r * na + px[i] * (1 - na));
    px[i + 1] = Math.round(g * na + px[i + 1] * (1 - na));
    px[i + 2] = Math.round(b * na + px[i + 2] * (1 - na));
    px[i + 3] = Math.max(px[i + 3], a);
  };

  const c = size / 2;
  // fundo azul-noite com cantos arredondados (raio 18%)
  const rad = size * 0.18;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, Math.max(rad - x, x - (size - 1 - rad)));
      const dy = Math.max(0, Math.max(rad - y, y - (size - 1 - rad)));
      if (Math.hypot(dx, dy) > rad) continue; // fora do canto arredondado
      set(x, y, 5, 10, 18);
    }
  }
  // barra magenta horizontal (a parede)
  const barH = Math.max(2, Math.round(size * 0.055));
  for (let y = Math.round(c - barH / 2); y < c + barH / 2; y++) {
    for (let x = Math.round(size * 0.1); x < size * 0.9; x++) set(x, y, 255, 47, 214);
  }
  // orbe ciano com glow (anéis concêntricos com alpha decrescente)
  const orbR = size * 0.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d < orbR * 0.62) set(x, y, 234, 252, 255);
      else if (d < orbR * 0.8) set(x, y, 0, 229, 255);
      else if (d < orbR * 1.15) set(x, y, 0, 229, 255, Math.round(120 * (1 - (d - orbR * 0.8) / (orbR * 0.35))));
      else if (d < orbR * 1.9) set(x, y, 0, 229, 255, Math.round(45 * (1 - (d - orbR * 1.15) / (orbR * 0.75))));
    }
  }
  return encodePNG(size, px);
}

mkdirSync('icons', { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`icons/icon-${size}.png`, makeIcon(size));
  console.log(`icons/icon-${size}.png OK`);
}
