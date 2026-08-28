import { voxelsToTriangles, type Triangle } from './stl';
import type { Voxel } from './types';

/**
 * L-bracket reconstructed from a 2D top/front drawing (mm):
 * base 60×40×6, upright 6×40×40, Ø8 holes in the base, Ø10 hole in the upright.
 */
export const BRACKET_DRAWING = {
  baseX: 60,
  baseZ: 40,
  baseY: 6,
  uprightX: 6,
  uprightY: 40,
  holeR: 4,
  uprightHoleR: 5,
  holes: [
    { x: 22, z: 20 },
    { x: 44, z: 20 },
  ],
  uprightHole: { y: 28, z: 20 },
};

function inCircle(x: number, y: number, cx: number, cy: number, r: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function isSolidMm(x: number, y: number, z: number): boolean {
  const { baseX, baseZ, baseY, uprightX, uprightY, holeR, uprightHoleR, holes, uprightHole } =
    BRACKET_DRAWING;
  if (x < 0 || x > baseX || z < 0 || z > baseZ || y < 0 || y > uprightY) return false;
  const inBaseHole = holes.some((h) => inCircle(x, z, h.x, h.z, holeR));
  const inUprightHole =
    x <= uprightX && inCircle(y, z, uprightHole.y, uprightHole.z, uprightHoleR);
  const inBase = y <= baseY && !inBaseHole;
  const inUpright = x <= uprightX && !inUprightHole;
  return inBase || inUpright;
}

function occupancy(step: number, materialBase: Voxel['material'], materialUpright: Voxel['material']): Voxel[] {
  const voxels: Voxel[] = [];
  const { baseX, baseZ, baseY, uprightX, uprightY } = BRACKET_DRAWING;
  for (let x = 0; x < baseX; x += step) {
    for (let z = 0; z < baseZ; z += step) {
      for (let y = 0; y < uprightY; y += step) {
        if (!isSolidMm(x + step / 2, y + step / 2, z + step / 2)) continue;
        voxels.push({
          x: Math.round(x / step),
          y: Math.round(y / step),
          z: Math.round(z / step),
          material: x < uprightX && y > baseY ? materialUpright : materialBase,
        });
      }
    }
  }
  return voxels;
}

/** Preview voxels fitted to the Structure Lab world (±12, y≤16). */
export function cadBracketVoxels(): Voxel[] {
  const NX = 24;
  const NY = 16;
  const NZ = 16;
  const voxels: Voxel[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < NX; i++) {
    for (let k = 0; k < NZ; k++) {
      for (let j = 0; j < NY; j++) {
        const x = ((i + 0.5) / NX) * BRACKET_DRAWING.baseX;
        const y = ((j + 0.5) / NY) * BRACKET_DRAWING.uprightY;
        const z = ((k + 0.5) / NZ) * BRACKET_DRAWING.baseZ;
        if (!isSolidMm(x, y, z)) continue;
        const vx = i - 12;
        const vz = k - 8;
        const key = `${vx},${j},${vz}`;
        if (seen.has(key)) continue;
        seen.add(key);
        voxels.push({
          x: vx,
          y: j,
          z: vz,
          material: x <= BRACKET_DRAWING.uprightX && y > BRACKET_DRAWING.baseY ? 'wood' : 'stone',
        });
      }
    }
  }
  return voxels;
}

/** Printable CAD STL in millimetres (2 mm cells, face-culled). */
export function cadBracketTriangles(): Triangle[] {
  return voxelsToTriangles(occupancy(2, 'stone', 'wood'), 2);
}
