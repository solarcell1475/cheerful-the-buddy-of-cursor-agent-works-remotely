#!/usr/bin/env python3
"""Write sample 2D drawing + STL files for the 2D→3D CAD demo."""

from __future__ import annotations

import math
import os
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "cad"
OUT.mkdir(parents=True, exist_ok=True)

BASE_X, BASE_Z, BASE_Y = 60, 40, 6
UPRIGHT_X, UPRIGHT_Y = 6, 40
HOLES = [(22, 20), (44, 20)]
HOLE_R = 4
UPRIGHT_HOLE = (28, 20)
UPRIGHT_HOLE_R = 5


def in_circle(x: float, y: float, cx: float, cy: float, r: float) -> bool:
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def is_solid(x: float, y: float, z: float) -> bool:
    if x < 0 or x > BASE_X or z < 0 or z > BASE_Z or y < 0 or y > UPRIGHT_Y:
        return False
    in_base_hole = any(in_circle(x, z, hx, hz, HOLE_R) for hx, hz in HOLES)
    in_upright_hole = x <= UPRIGHT_X and in_circle(y, z, *UPRIGHT_HOLE, UPRIGHT_HOLE_R)
    in_base = y <= BASE_Y and not in_base_hole
    in_upright = x <= UPRIGHT_X and not in_upright_hole
    return in_base or in_upright


def occupancy(step: int = 2) -> list[tuple[int, int, int]]:
    cells = []
    y_range = range(0, UPRIGHT_Y, step)
    for x in range(0, BASE_X, step):
        for z in range(0, BASE_Z, step):
            for y in y_range:
                if is_solid(x + step / 2, y + step / 2, z + step / 2):
                    cells.append((x // step, y // step, z // step))
    return cells


def triangles_from_voxels(cells: list[tuple[int, int, int]], scale: float) -> list[tuple]:
    occ = set(cells)
    faces = [
        ((1, 0, 0), [(1, 0, 0), (1, 0, 1), (1, 1, 1), (1, 1, 0)]),
        ((-1, 0, 0), [(0, 0, 1), (0, 0, 0), (0, 1, 0), (0, 1, 1)]),
        ((0, 1, 0), [(0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1)]),
        ((0, -1, 0), [(0, 0, 1), (1, 0, 1), (1, 0, 0), (0, 0, 0)]),
        ((0, 0, 1), [(0, 0, 1), (0, 1, 1), (1, 1, 1), (1, 0, 1)]),
        ((0, 0, -1), [(1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 0)]),
    ]
    tris = []
    for x, y, z in cells:
        for (dx, dy, dz), corners in faces:
            if (x + dx, y + dy, z + dz) in occ:
                continue
            pts = [
                [(x + cx) * scale, (y + cy) * scale, (z + cz) * scale]
                for cx, cy, cz in corners
            ]
            # two tris: 0,1,2 and 0,2,3
            for a, b, c in ((0, 1, 2), (0, 2, 3)):
                p, q, r = pts[a], pts[b], pts[c]
                ux, uy, uz = q[0] - p[0], q[1] - p[1], q[2] - p[2]
                vx, vy, vz = r[0] - p[0], r[1] - p[1], r[2] - p[2]
                nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
                nlen = math.hypot(nx, ny, nz) or 1
                tris.append(((nx / nlen, ny / nlen, nz / nlen), p, q, r))
    return tris


def write_binary_stl(path: Path, tris: list, name: str) -> None:
    buf = bytearray(80)
    label = name.encode("ascii")[:80]
    buf[: len(label)] = label
    buf += struct.pack("<I", len(tris))
    for n, a, b, c in tris:
        buf += struct.pack("<12fH", *n, *a, *b, *c, 0)
    path.write_bytes(buf)


def write_bracket_drawing_png(path: Path, size: int = 240) -> None:
    from PIL import Image, ImageDraw

    img = Image.new("L", (size, size), 245)
    draw = ImageDraw.Draw(img)
    s = size / 48

    def R(x0, y0, x1, y1):
        draw.rectangle([x0 * s, y0 * s, x1 * s, y1 * s], fill=20)

    def hole(cx, cy, r):
        draw.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], fill=245)

    R(6, 18, 42, 42)
    R(6, 6, 14, 42)
    hole(24, 30, 3)
    hole(36, 30, 3)
    hole(10, 12, 3)
    img.save(path)


def main() -> None:
    cells = occupancy(2)
    tris = triangles_from_voxels(cells, 2)
    write_binary_stl(OUT / "bracket-from-2d-drawing.stl", tris, "cheerful-bracket")
    write_bracket_drawing_png(OUT / "bracket-2d-drawing.png")
    print(f"wrote {len(cells)} cells, {len(tris)} triangles -> {OUT}")


if __name__ == "__main__":
    main()
