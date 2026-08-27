import type { MaterialId, Voxel } from './types';
import { WORLD_MAX, WORLD_MIN, WORLD_MAX_Y, inWorldBounds } from './types';

export type ImageTo3DMode = 'extrude' | 'heightmap';

export interface RasterImage {
  width: number;
  height: number;
  /** RGBA packed, length width*height*4 */
  data: ArrayLike<number>;
}

export interface ImageToVoxelsOptions {
  mode?: ImageTo3DMode;
  maxCells?: number;
  thickness?: number;
  material?: MaterialId;
  invert?: boolean;
}

function luminance(r: number, g: number, b: number, a: number): number {
  if (a < 16) return 1;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function sample(
  image: RasterImage,
  maxCells: number
): { w: number; h: number; lum: number[] } {
  const scale = Math.max(image.width, image.height) / maxCells;
  const w = Math.max(1, Math.round(image.width / scale));
  const h = Math.max(1, Math.round(image.height / scale));
  const lum: number[] = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(image.width - 1, Math.floor(((x + 0.5) / w) * image.width));
      const sy = Math.min(image.height - 1, Math.floor(((y + 0.5) / h) * image.height));
      const i = (sy * image.width + sx) * 4;
      lum[y * w + x] = luminance(
        image.data[i],
        image.data[i + 1],
        image.data[i + 2],
        image.data[i + 3]
      );
    }
  }
  return { w, h, lum };
}

function shouldInvert(lum: number[]): boolean {
  const avg = lum.reduce((s, v) => s + v, 0) / lum.length;
  return avg > 0.55;
}

export function imageToVoxels(image: RasterImage, options: ImageToVoxelsOptions = {}): Voxel[] {
  const maxCells = options.maxCells ?? 24;
  const thickness = Math.max(1, options.thickness ?? 3);
  const material = options.material ?? 'blue';
  const mode = options.mode ?? 'extrude';
  const { w, h, lum } = sample(image, maxCells);
  const invert =
    options.invert ?? (mode === 'heightmap' ? false : shouldInvert(lum));
  const ink = (v: number) => (invert ? 1 - v : v);

  const x0 = Math.ceil(-(w / 2));
  const z0 = Math.ceil(-(h / 2));
  const voxels: Voxel[] = [];
  const seen = new Set<string>();

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const density = ink(lum[py * w + px]);
      if (mode === 'extrude') {
        if (density < 0.45) continue;
        for (let y = 0; y < thickness; y++) {
          const x = x0 + px;
          const z = z0 + py;
          if (!inWorldBounds(x, y, z)) continue;
          const key = `${x},${y},${z}`;
          if (seen.has(key)) continue;
          seen.add(key);
          voxels.push({ x, y, z, material });
        }
      } else {
        const height = Math.round(density * Math.min(10, WORLD_MAX_Y));
        if (height <= 0) continue;
        for (let y = 0; y < height; y++) {
          const x = x0 + px;
          const z = z0 + py;
          if (!inWorldBounds(x, y, z)) continue;
          const key = `${x},${y},${z}`;
          if (seen.has(key)) continue;
          seen.add(key);
          voxels.push({ x, y, z, material: y === height - 1 ? 'gold' : material });
        }
      }
    }
  }
  return voxels.filter((v) => v.x >= WORLD_MIN && v.x <= WORLD_MAX && v.z >= WORLD_MIN && v.z <= WORLD_MAX);
}

/** Front-view 2D drawing of an L-bracket with two bolt holes (dark ink on light paper). */
export function sampleBracketDrawing(size = 48): RasterImage {
  const data = new Uint8ClampedArray(size * size * 4);
  const set = (x: number, y: number, v: number) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  };
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = 245;
    data[i * 4 + 3] = 255;
  }
  const fillRect = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v);
  };
  const hole = (cx: number, cy: number, r: number) => {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) set(x, y, 245);
      }
    }
  };
  // Top view: base plate
  fillRect(6, 18, 42, 42, 20);
  // Vertical flange shown as thicker bar on the left
  fillRect(6, 6, 14, 42, 20);
  hole(24, 30, 3);
  hole(36, 30, 3);
  hole(10, 12, 3);
  return { width: size, height: size, data };
}

/** Radial bump used as a 2D heightmap source. */
export function sampleHeightmapDrawing(size = 40): RasterImage {
  const data = new Uint8ClampedArray(size * size * 4);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const maxR = size * 0.48;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const ring = Math.abs(Math.sin((d / maxR) * Math.PI * 2));
      const v = d > maxR ? 255 : Math.round(255 * (1 - ring * 0.85) * (1 - d / maxR));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

/** Pixel-art buddy face (2D) to be extruded. */
export function sampleBuddyFaceDrawing(): RasterImage {
  const g = [
    '................',
    '...XXXXXXXXXX...',
    '..XXXXXXXXXXXX..',
    '.XX..XXXXXX..XX.',
    '.XX..XXXXXX..XX.',
    '.XXXXXXXXXXXXXX.',
    '.XXXX..XX..XXXX.',
    '.XXXXXXXXXXXXXX.',
    '..XXXXXXXXXXXX..',
    '...XXX....XXX...',
    '....XXXXXXXX....',
    '......XXXX......',
  ];
  const h = g.length;
  const w = g[0].length;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const on = g[y][x] === 'X';
      const i = (y * w + x) * 4;
      const v = on ? 16 : 240;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return { width: w, height: h, data };
}
