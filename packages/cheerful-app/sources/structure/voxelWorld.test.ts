import { describe, expect, it } from 'vitest';
import { STRUCTURE_PRESETS } from './presets';
import { inWorldBounds, voxelKey } from './types';
import {
  clearWorld,
  emptyWorld,
  eraseBlock,
  exportWorld,
  loadVoxels,
  placeBlock,
  redo,
  undo,
  voxelsFromWorld,
  worldFromVoxels,
} from './voxelWorld';

describe('voxelWorld', () => {
  it('places, replaces, and erases blocks', () => {
    let world = emptyWorld();
    world = placeBlock(world, 0, 0, 0, 'blue');
    world = placeBlock(world, 1, 0, 0, 'gold');
    expect(voxelsFromWorld(world)).toHaveLength(2);
    world = placeBlock(world, 0, 0, 0, 'coral');
    expect(world.blocks[voxelKey(0, 0, 0)]).toBe('coral');
    world = eraseBlock(world, 1, 0, 0);
    expect(world.blocks[voxelKey(1, 0, 0)]).toBeUndefined();
    expect(voxelsFromWorld(world)).toHaveLength(1);
  });

  it('rejects out-of-bounds placement', () => {
    const world = placeBlock(emptyWorld(), 99, 0, 0, 'stone');
    expect(Object.keys(world.blocks)).toHaveLength(0);
    expect(inWorldBounds(0, 0, 0)).toBe(true);
    expect(inWorldBounds(0, -1, 0)).toBe(false);
  });

  it('undoes and redoes edits', () => {
    let world = placeBlock(emptyWorld(), 0, 1, 0, 'wood');
    world = placeBlock(world, 0, 2, 0, 'wood');
    world = undo(world);
    expect(voxelsFromWorld(world)).toHaveLength(1);
    world = redo(world);
    expect(voxelsFromWorld(world)).toHaveLength(2);
    world = clearWorld(world);
    expect(voxelsFromWorld(world)).toHaveLength(0);
    world = undo(world);
    expect(voxelsFromWorld(world)).toHaveLength(2);
  });

  it('does not record a no-op as history', () => {
    let world = placeBlock(emptyWorld(), 2, 0, 2, 'glass');
    world = placeBlock(world, 2, 0, 2, 'glass');
    expect(world.past).toHaveLength(1);
    world = eraseBlock(world, 9, 9, 9);
    expect(world.past).toHaveLength(1);
  });

  it('loads a preset and exports sorted voxels', () => {
    const cottage = STRUCTURE_PRESETS.find((p) => p.id === 'cottage')!.build();
    const world = loadVoxels(emptyWorld(), cottage);
    const exported = exportWorld(world);
    expect(exported.length).toBeGreaterThan(40);
    for (let i = 1; i < exported.length; i++) {
      const prev = exported[i - 1];
      const cur = exported[i];
      const order = prev.y - cur.y || prev.z - cur.z || prev.x - cur.x;
      expect(order).toBeLessThanOrEqual(0);
    }
  });
});

describe('presets', () => {
  it('builds unique in-bounds voxels for every preset', () => {
    for (const preset of STRUCTURE_PRESETS) {
      const voxels = preset.build();
      const keys = voxels.map((v) => voxelKey(v.x, v.y, v.z));
      expect(new Set(keys).size).toBe(keys.length);
      expect(voxels.length).toBeGreaterThan(10);
      expect(voxels.every((v) => inWorldBounds(v.x, v.y, v.z))).toBe(true);
    }
  });

  it('leaves a door opening in the cottage facade', () => {
    const cottage = worldFromVoxels(
      STRUCTURE_PRESETS.find((p) => p.id === 'cottage')!.build()
    );
    expect(cottage.blocks[voxelKey(0, 1, -3)]).toBeUndefined();
    expect(cottage.blocks[voxelKey(0, 2, -3)]).toBeUndefined();
  });
});
