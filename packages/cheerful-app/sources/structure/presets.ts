import type { MaterialId, Voxel } from './types';

function fill(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  material: MaterialId
): Voxel[] {
  const voxels: Voxel[] = [];
  const xs = [Math.min(x0, x1), Math.max(x0, x1)];
  const ys = [Math.min(y0, y1), Math.max(y0, y1)];
  const zs = [Math.min(z0, z1), Math.max(z0, z1)];
  for (let x = xs[0]; x <= xs[1]; x++) {
    for (let y = ys[0]; y <= ys[1]; y++) {
      for (let z = zs[0]; z <= zs[1]; z++) {
        voxels.push({ x, y, z, material });
      }
    }
  }
  return voxels;
}

function walls(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  material: MaterialId
): Voxel[] {
  return fill(x0, y0, z0, x1, y1, z1, material).filter(
    (v) => v.x === x0 || v.x === x1 || v.z === z0 || v.z === z1
  );
}

function compile(voxels: Voxel[]): Voxel[] {
  const map = new Map<string, Voxel>();
  for (const voxel of voxels) {
    map.set(`${voxel.x},${voxel.y},${voxel.z}`, voxel);
  }
  return [...map.values()];
}

function cottage(): Voxel[] {
  const v: Voxel[] = [];
  v.push(...fill(-3, 0, -3, 3, 0, 3, 'wood'));
  v.push(...walls(-3, 1, -3, 3, 3, 3, 'stone'));
  // Door opening + dark frame
  const withoutDoor = v.filter((b) => !(b.x === 0 && b.z === -3 && (b.y === 1 || b.y === 2)));
  withoutDoor.push({ x: -1, y: 1, z: -3, material: 'dark' });
  withoutDoor.push({ x: 1, y: 1, z: -3, material: 'dark' });
  withoutDoor.push({ x: -1, y: 2, z: -3, material: 'dark' });
  withoutDoor.push({ x: 1, y: 2, z: -3, material: 'dark' });
  withoutDoor.push({ x: 0, y: 3, z: -3, material: 'dark' });
  // Windows
  const carved = withoutDoor.filter(
    (b) =>
      !(
        (b.x === -3 && b.y === 2 && b.z === 0) ||
        (b.x === 3 && b.y === 2 && b.z === 0) ||
        (b.x === -2 && b.y === 2 && b.z === 3) ||
        (b.x === 2 && b.y === 2 && b.z === 3)
      )
  );
  carved.push({ x: -3, y: 2, z: 0, material: 'glass' });
  carved.push({ x: 3, y: 2, z: 0, material: 'glass' });
  carved.push({ x: -2, y: 2, z: 3, material: 'glass' });
  carved.push({ x: 2, y: 2, z: 3, material: 'glass' });
  // Pitched roof
  for (let layer = 0; layer < 4; layer++) {
    const s = 4 - layer;
    carved.push(
      ...fill(-s, 4 + layer, -s, s, 4 + layer, s, layer === 3 ? 'coral' : 'wood')
    );
  }
  carved.push(...fill(2, 4, 2, 2, 8, 2, 'stone'));
  carved.push({ x: 2, y: 9, z: 2, material: 'coral' });
  return compile(carved);
}

function tower(): Voxel[] {
  const v: Voxel[] = [];
  v.push(...fill(-2, 0, -2, 2, 0, 2, 'dark'));
  v.push(...walls(-2, 1, -2, 2, 8, 2, 'stone'));
  const withoutDoor = v.filter((b) => !(b.x === 0 && b.z === -2 && (b.y === 1 || b.y === 2)));
  withoutDoor.push({ x: -1, y: 1, z: -2, material: 'dark' });
  withoutDoor.push({ x: 1, y: 1, z: -2, material: 'dark' });
  withoutDoor.push({ x: 0, y: 4, z: -2, material: 'glass' });
  withoutDoor.push({ x: -2, y: 5, z: 0, material: 'glass' });
  withoutDoor.push({ x: 2, y: 5, z: 0, material: 'glass' });
  withoutDoor.push({ x: 0, y: 6, z: 2, material: 'glass' });
  withoutDoor.push(...fill(-3, 9, -3, 3, 9, 3, 'stone'));
  const merlons: Array<[number, number]> = [
    [-3, -3],
    [-3, 3],
    [3, -3],
    [3, 3],
    [-3, 0],
    [3, 0],
    [0, -3],
    [0, 3],
  ];
  for (const [x, z] of merlons) {
    withoutDoor.push({ x, y: 10, z, material: 'stone' });
    withoutDoor.push({ x, y: 11, z, material: 'gold' });
  }
  withoutDoor.push({ x: 0, y: 10, z: 0, material: 'gold' });
  withoutDoor.push({ x: 0, y: 11, z: 0, material: 'coral' });
  return compile(withoutDoor);
}

function spiral(): Voxel[] {
  const v: Voxel[] = [];
  v.push(...fill(-1, 0, -1, 1, 0, 1, 'dark'));
  for (let i = 0; i < 28; i++) {
    const angle = i * 0.55;
    const radius = 3.2;
    const x = Math.round(Math.cos(angle) * radius);
    const z = Math.round(Math.sin(angle) * radius);
    const y = Math.floor(i / 2);
    v.push({ x, y, z, material: i % 2 === 0 ? 'blue' : 'purple' });
    v.push({ x: 0, y, z: 0, material: 'gold' });
  }
  v.push({ x: 0, y: 14, z: 0, material: 'coral' });
  return compile(v);
}

function buddy(): Voxel[] {
  const v: Voxel[] = [];
  v.push(...fill(-1, 0, 0, -1, 1, 0, 'dark'));
  v.push(...fill(1, 0, 0, 1, 1, 0, 'dark'));
  v.push(...fill(-2, 2, -1, 2, 5, 1, 'blue'));
  v.push({ x: 0, y: 4, z: 1, material: 'gold' });
  v.push(...fill(-3, 4, 0, -3, 5, 0, 'gold'));
  v.push(...fill(3, 4, 0, 3, 5, 0, 'gold'));
  v.push({ x: -3, y: 3, z: 0, material: 'white' });
  v.push({ x: 3, y: 3, z: 0, material: 'white' });
  v.push(...fill(-1, 6, -1, 1, 8, 1, 'white'));
  v.push({ x: -1, y: 7, z: 1, material: 'dark' });
  v.push({ x: 1, y: 7, z: 1, material: 'dark' });
  v.push({ x: 0, y: 6, z: 1, material: 'coral' });
  v.push({ x: 0, y: 9, z: 0, material: 'gold' });
  v.push({ x: 0, y: 10, z: 0, material: 'purple' });
  return compile(v);
}

function cheerfulStack(): Voxel[] {
  const v: Voxel[] = [];
  const platforms: { y: number; material: MaterialId; core: MaterialId }[] = [
    { y: 0, material: 'blue', core: 'white' },
    { y: 4, material: 'purple', core: 'glass' },
    { y: 8, material: 'wood', core: 'gold' },
    { y: 12, material: 'gold', core: 'coral' },
  ];
  for (const platform of platforms) {
    v.push(...fill(-2, platform.y, -2, 2, platform.y, 2, platform.material));
    v.push({ x: 0, y: platform.y, z: 0, material: platform.core });
  }
  for (let y = 1; y <= 11; y++) {
    if (y % 4 === 0) continue;
    v.push({ x: 0, y, z: 0, material: 'glass' });
  }
  v.push({ x: 0, y: 1, z: -2, material: 'white' });
  v.push({ x: -1, y: 1, z: -2, material: 'dark' });
  v.push({ x: 1, y: 1, z: -2, material: 'dark' });
  v.push({ x: -1, y: 5, z: 2, material: 'coral' });
  v.push({ x: 1, y: 5, z: 2, material: 'grass' });
  v.push({ x: 0, y: 9, z: 2, material: 'blue' });
  v.push({ x: 0, y: 13, z: 0, material: 'coral' });
  v.push({ x: 0, y: 14, z: 0, material: 'white' });
  return compile(v);
}

export interface StructurePreset {
  id: string;
  label: string;
  blurb: string;
  build: () => Voxel[];
}

export const STRUCTURE_PRESETS: StructurePreset[] = [
  {
    id: 'stack',
    label: 'Cheerful stack',
    blurb: 'Pad, server, CLI, and agent as a 3D tower',
    build: cheerfulStack,
  },
  {
    id: 'buddy',
    label: 'Buddy',
    blurb: 'A little robot mascot',
    build: buddy,
  },
  {
    id: 'cottage',
    label: 'Cottage',
    blurb: 'Stone house with a pitched roof',
    build: cottage,
  },
  {
    id: 'keep',
    label: 'Keep',
    blurb: 'A battlemented watchtower',
    build: tower,
  },
  {
    id: 'spiral',
    label: 'Spiral',
    blurb: 'Helix around a golden core',
    build: spiral,
  },
];
