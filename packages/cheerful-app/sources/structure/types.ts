export type MaterialId =
  | 'stone'
  | 'wood'
  | 'glass'
  | 'grass'
  | 'gold'
  | 'blue'
  | 'purple'
  | 'white'
  | 'dark'
  | 'coral';

export type BuildTool = 'place' | 'erase';

export interface Voxel {
  x: number;
  y: number;
  z: number;
  material: MaterialId;
}

export interface Material {
  id: MaterialId;
  label: string;
  color: string;
  emissive?: string;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}

export const WORLD_MIN = -12;
export const WORLD_MAX = 12;
export const WORLD_MAX_Y = 16;

export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function parseVoxelKey(key: string): { x: number; y: number; z: number } {
  const [x, y, z] = key.split(',').map((n) => Number(n));
  return { x, y, z };
}

export function inWorldBounds(x: number, y: number, z: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    Number.isInteger(z) &&
    x >= WORLD_MIN &&
    x <= WORLD_MAX &&
    z >= WORLD_MIN &&
    z <= WORLD_MAX &&
    y >= 0 &&
    y <= WORLD_MAX_Y
  );
}
