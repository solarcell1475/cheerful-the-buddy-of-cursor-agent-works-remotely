import {
  inWorldBounds,
  parseVoxelKey,
  voxelKey,
  type MaterialId,
  type Voxel,
} from './types';

export interface VoxelWorldState {
  blocks: Record<string, MaterialId>;
  past: Record<string, MaterialId>[];
  future: Record<string, MaterialId>[];
}

export function emptyWorld(): VoxelWorldState {
  return { blocks: {}, past: [], future: [] };
}

export function worldFromVoxels(voxels: Voxel[]): VoxelWorldState {
  const blocks: Record<string, MaterialId> = {};
  for (const voxel of voxels) {
    if (!inWorldBounds(voxel.x, voxel.y, voxel.z)) continue;
    blocks[voxelKey(voxel.x, voxel.y, voxel.z)] = voxel.material;
  }
  return { blocks, past: [], future: [] };
}

export function voxelsFromWorld(state: VoxelWorldState): Voxel[] {
  return Object.entries(state.blocks).map(([key, material]) => {
    const { x, y, z } = parseVoxelKey(key);
    return { x, y, z, material };
  });
}

function snapshot(blocks: Record<string, MaterialId>): Record<string, MaterialId> {
  return { ...blocks };
}

function commit(
  state: VoxelWorldState,
  nextBlocks: Record<string, MaterialId>
): VoxelWorldState {
  return {
    blocks: nextBlocks,
    past: [...state.past, snapshot(state.blocks)].slice(-80),
    future: [],
  };
}

export function placeBlock(
  state: VoxelWorldState,
  x: number,
  y: number,
  z: number,
  material: MaterialId
): VoxelWorldState {
  if (!inWorldBounds(x, y, z)) return state;
  const key = voxelKey(x, y, z);
  if (state.blocks[key] === material) return state;
  return commit(state, { ...state.blocks, [key]: material });
}

export function eraseBlock(
  state: VoxelWorldState,
  x: number,
  y: number,
  z: number
): VoxelWorldState {
  const key = voxelKey(x, y, z);
  if (!(key in state.blocks)) return state;
  const next = { ...state.blocks };
  delete next[key];
  return commit(state, next);
}

export function undo(state: VoxelWorldState): VoxelWorldState {
  if (state.past.length === 0) return state;
  const previous = state.past[state.past.length - 1];
  return {
    blocks: previous,
    past: state.past.slice(0, -1),
    future: [snapshot(state.blocks), ...state.future].slice(0, 80),
  };
}

export function redo(state: VoxelWorldState): VoxelWorldState {
  if (state.future.length === 0) return state;
  const [next, ...rest] = state.future;
  return {
    blocks: next,
    past: [...state.past, snapshot(state.blocks)].slice(-80),
    future: rest,
  };
}

export function loadVoxels(state: VoxelWorldState, voxels: Voxel[]): VoxelWorldState {
  const loaded = worldFromVoxels(voxels);
  if (JSON.stringify(loaded.blocks) === JSON.stringify(state.blocks)) return state;
  return commit(state, loaded.blocks);
}

export function clearWorld(state: VoxelWorldState): VoxelWorldState {
  if (Object.keys(state.blocks).length === 0) return state;
  return commit(state, {});
}

export function blockCount(state: VoxelWorldState): number {
  return Object.keys(state.blocks).length;
}

export function exportWorld(state: VoxelWorldState): Voxel[] {
  return voxelsFromWorld(state).sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
}
