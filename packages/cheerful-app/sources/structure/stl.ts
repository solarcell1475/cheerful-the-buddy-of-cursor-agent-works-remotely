import type { Voxel } from './types';

export type Vec3 = [number, number, number];
export type Triangle = { n: Vec3; a: Vec3; b: Vec3; c: Vec3 };

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function triangleFrom(a: Vec3, b: Vec3, c: Vec3): Triangle {
  return { n: normalize(cross(sub(b, a), sub(c, a))), a, b, c };
}

export function addQuad(out: Triangle[], a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
  out.push(triangleFrom(a, b, c), triangleFrom(a, c, d));
}

export function addBox(
  out: Triangle[],
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number
): void {
  const xMin = Math.min(x0, x1);
  const xMax = Math.max(x0, x1);
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const zMin = Math.min(z0, z1);
  const zMax = Math.max(z0, z1);
  addQuad(out, [xMin, yMax, zMin], [xMax, yMax, zMin], [xMax, yMax, zMax], [xMin, yMax, zMax]);
  addQuad(out, [xMin, yMin, zMax], [xMax, yMin, zMax], [xMax, yMin, zMin], [xMin, yMin, zMin]);
  addQuad(out, [xMin, yMin, zMin], [xMax, yMin, zMin], [xMax, yMax, zMin], [xMin, yMax, zMin]);
  addQuad(out, [xMax, yMin, zMax], [xMin, yMin, zMax], [xMin, yMax, zMax], [xMax, yMax, zMax]);
  addQuad(out, [xMin, yMin, zMax], [xMin, yMin, zMin], [xMin, yMax, zMin], [xMin, yMax, zMax]);
  addQuad(out, [xMax, yMin, zMin], [xMax, yMin, zMax], [xMax, yMax, zMax], [xMax, yMax, zMin]);
}

/** Solid cylinder along +Y, used for bosses. Holes are cut in voxel space instead. */
export function addCylinderY(
  out: Triangle[],
  cx: number,
  zc: number,
  y0: number,
  y1: number,
  radius: number,
  segments = 24
): void {
  const yMin = Math.min(y0, y1);
  const yMax = Math.max(y0, y1);
  const ring = (y: number) => {
    const pts: Vec3[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * radius, y, zc + Math.sin(a) * radius]);
    }
    return pts;
  };
  const bottom = ring(yMin);
  const top = ring(yMax);
  const bCenter: Vec3 = [cx, yMin, zc];
  const tCenter: Vec3 = [cx, yMax, zc];
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    out.push(triangleFrom(bCenter, bottom[j], bottom[i]));
    out.push(triangleFrom(tCenter, top[i], top[j]));
    addQuad(out, bottom[i], bottom[j], top[j], top[i]);
  }
}

const FACE_DIRS: Array<{ dx: number; dy: number; dz: number; corners: Vec3[] }> = [
  {
    dx: 1,
    dy: 0,
    dz: 0,
    corners: [
      [1, 0, 0],
      [1, 0, 1],
      [1, 1, 1],
      [1, 1, 0],
    ],
  },
  {
    dx: -1,
    dy: 0,
    dz: 0,
    corners: [
      [0, 0, 1],
      [0, 0, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
  },
  {
    dx: 0,
    dy: 1,
    dz: 0,
    corners: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    dx: 0,
    dy: -1,
    dz: 0,
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 0, 0],
      [0, 0, 0],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: 1,
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  {
    dx: 0,
    dy: 0,
    dz: -1,
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
];

export function voxelsToTriangles(voxels: Voxel[], scale = 1): Triangle[] {
  const occupied = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const out: Triangle[] = [];
  for (const voxel of voxels) {
    for (const face of FACE_DIRS) {
      const nx = voxel.x + face.dx;
      const ny = voxel.y + face.dy;
      const nz = voxel.z + face.dz;
      if (occupied.has(`${nx},${ny},${nz}`)) continue;
      const corners = face.corners.map(
        ([cx, cy, cz]) =>
          [
            (voxel.x + cx) * scale,
            (voxel.y + cy) * scale,
            (voxel.z + cz) * scale,
          ] as Vec3
      );
      addQuad(out, corners[0], corners[1], corners[2], corners[3]);
    }
  }
  return out;
}

function fmt(n: number): string {
  return (Math.abs(n) < 1e-9 ? 0 : n).toFixed(5);
}

export function trianglesToAsciiStl(triangles: Triangle[], name = 'cheerful'): string {
  const lines = [`solid ${name}`];
  for (const t of triangles) {
    lines.push(`  facet normal ${fmt(t.n[0])} ${fmt(t.n[1])} ${fmt(t.n[2])}`);
    lines.push('    outer loop');
    lines.push(`      vertex ${fmt(t.a[0])} ${fmt(t.a[1])} ${fmt(t.a[2])}`);
    lines.push(`      vertex ${fmt(t.b[0])} ${fmt(t.b[1])} ${fmt(t.b[2])}`);
    lines.push(`      vertex ${fmt(t.c[0])} ${fmt(t.c[1])} ${fmt(t.c[2])}`);
    lines.push('    endloop');
    lines.push('  endfacet');
  }
  lines.push(`endsolid ${name}`);
  return lines.join('\n');
}

export function trianglesToBinaryStl(triangles: Triangle[], name = 'cheerful'): Uint8Array {
  const header = new Uint8Array(80);
  const label = new TextEncoder().encode(name.slice(0, 80));
  header.set(label);
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);
  new Uint8Array(buffer, 0, 80).set(header);
  view.setUint32(80, triangles.length, true);
  let offset = 84;
  const writeV = (v: Vec3) => {
    view.setFloat32(offset, v[0], true);
    view.setFloat32(offset + 4, v[1], true);
    view.setFloat32(offset + 8, v[2], true);
    offset += 12;
  };
  for (const t of triangles) {
    writeV(t.n);
    writeV(t.a);
    writeV(t.b);
    writeV(t.c);
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return new Uint8Array(buffer);
}

export function parseAsciiStlTriangleCount(stl: string): number {
  return (stl.match(/facet normal/g) || []).length;
}

export function downloadBytes(filename: string, data: Uint8Array, mime: string): boolean {
  if (typeof document === 'undefined') return false;
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

export function downloadText(filename: string, text: string, mime: string): boolean {
  return downloadBytes(filename, new TextEncoder().encode(text), mime);
}
