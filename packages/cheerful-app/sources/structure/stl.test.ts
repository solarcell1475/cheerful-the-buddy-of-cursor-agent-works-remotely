import { describe, expect, it } from 'vitest';
import { cadBracketTriangles, cadBracketVoxels } from './cadBracket';
import {
  imageToVoxels,
  sampleBracketDrawing,
  sampleBuddyFaceDrawing,
  sampleHeightmapDrawing,
} from './imageToVoxels';
import { parseAsciiStlTriangleCount, trianglesToAsciiStl, voxelsToTriangles } from './stl';
import { inWorldBounds } from './types';

describe('stl export', () => {
  it('emits two triangles per exposed cube face', () => {
    const tris = voxelsToTriangles([{ x: 0, y: 0, z: 0, material: 'stone' }]);
    expect(tris).toHaveLength(12);
    const stl = trianglesToAsciiStl(tris, 'cube');
    expect(stl.startsWith('solid cube')).toBe(true);
    expect(stl.trim().endsWith('endsolid cube')).toBe(true);
    expect(parseAsciiStlTriangleCount(stl)).toBe(12);
  });

  it('culls shared faces between neighbors', () => {
    const tris = voxelsToTriangles([
      { x: 0, y: 0, z: 0, material: 'stone' },
      { x: 1, y: 0, z: 0, material: 'stone' },
    ]);
    expect(tris).toHaveLength(20);
  });
});

describe('2D image to 3D voxels', () => {
  it('extrudes dark ink from a light 2D drawing', () => {
    const voxels = imageToVoxels(sampleBracketDrawing(), { mode: 'extrude', thickness: 3 });
    expect(voxels.length).toBeGreaterThan(20);
    expect(voxels.every((v) => inWorldBounds(v.x, v.y, v.z))).toBe(true);
    expect(voxels.some((v) => v.y === 2)).toBe(true);
  });

  it('raises a 2D heightmap into stacked voxels', () => {
    const voxels = imageToVoxels(sampleHeightmapDrawing(), { mode: 'heightmap' });
    expect(voxels.length).toBeGreaterThan(30);
    const maxY = Math.max(...voxels.map((v) => v.y));
    expect(maxY).toBeGreaterThan(2);
  });

  it('extrudes a 2D pixel-art face', () => {
    const voxels = imageToVoxels(sampleBuddyFaceDrawing(), { mode: 'extrude', thickness: 4 });
    expect(voxels.length).toBeGreaterThan(15);
    expect(new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`)).size).toBe(voxels.length);
  });
});

describe('CAD bracket from 2D drawing', () => {
  it('fits the lab world and has through-holes', () => {
    const voxels = cadBracketVoxels();
    expect(voxels.length).toBeGreaterThan(40);
    expect(voxels.every((v) => inWorldBounds(v.x, v.y, v.z))).toBe(true);
    const keys = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
    expect(keys.size).toBe(voxels.length);
  });

  it('exports a printable STL with many triangles', () => {
    const tris = cadBracketTriangles();
    expect(tris.length).toBeGreaterThan(100);
    const stl = trianglesToAsciiStl(tris, 'bracket');
    expect(parseAsciiStlTriangleCount(stl)).toBe(tris.length);
  });
});
