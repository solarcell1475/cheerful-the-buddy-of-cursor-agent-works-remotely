#!/usr/bin/env python3
"""Dual-path CAD review: parse the file AND capture many camera views.

This is the offline equivalent of an LLM driving a 3D GUI through MCP:

  1. cad_summary     — dimensions / entities from DXF or STL (ground truth-ish)
  2. capture_views   — orbit the mesh and save PNGs for visual double-check

Usage::

    python3 scripts/cad_review.py docs/cad/bracket-from-2d-drawing.stl -o /tmp/review
    python3 scripts/cad_review.py part.dxf -o /tmp/review
"""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path

MCP_TOOLS = [
    {
        "name": "cad_summary",
        "description": "Parse DXF or STL and return layers, entities, bbox, triangle count, units if known.",
        "inputSchema": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
    {
        "name": "capture_views",
        "description": "Orbit a 3D model and save named PNG views (iso, front, side, top, ...) for visual confirmation.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "outdir": {"type": "string"},
                "views": {"type": "integer", "minimum": 4, "maximum": 16},
            },
            "required": ["path", "outdir"],
        },
    },
]


def load_binary_stl(path: Path):
    data = path.read_bytes()
    if data[:5] == b"solid" and b"facet" in data[:200]:
        raise SystemExit("ASCII STL not used here; export binary STL.")
    n = int.from_bytes(data[80:84], "little")
    expected = 84 + n * 50
    if len(data) < expected:
        raise SystemExit(f"Truncated STL: {len(data)} < {expected}")
    verts = []
    faces = []
    off = 84
    for _ in range(n):
        _n = struct.unpack_from("<3f", data, off)
        a = struct.unpack_from("<3f", data, off + 12)
        b = struct.unpack_from("<3f", data, off + 24)
        c = struct.unpack_from("<3f", data, off + 36)
        i0 = len(verts)
        verts.extend((a, b, c))
        faces.append((i0, i0 + 1, i0 + 2))
        off += 50
    return verts, faces, n


def stl_summary(path: Path) -> dict:
    verts, faces, n = load_binary_stl(path)
    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    zs = [v[2] for v in verts]
    return {
        "format": "stl",
        "path": str(path),
        "triangles": n,
        "bbox": {
            "min": [min(xs), min(ys), min(zs)],
            "max": [max(xs), max(ys), max(zs)],
        },
        "size": [max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)],
        "note": "STL has no features/units. Use this bbox with DXF dimensions to double-check.",
    }


def dxf_summary(path: Path) -> dict:
    try:
        import ezdxf
    except ImportError:
        return {
            "format": "dxf",
            "path": str(path),
            "error": "ezdxf not installed. pip install ezdxf",
        }
    doc = ezdxf.readfile(path)
    msp = doc.modelspace()
    counts: dict[str, int] = {}
    circles = []
    for e in msp:
        kind = e.dxftype()
        counts[kind] = counts.get(kind, 0) + 1
        if kind == "CIRCLE":
            c = e.dxf.center
            circles.append({"center": [c.x, c.y, c.z], "radius": e.dxf.radius})
    return {
        "format": "dxf",
        "path": str(path),
        "layers": [layer.dxf.name for layer in doc.layers],
        "entity_counts": counts,
        "circles": circles[:50],
        "note": "DXF entities are the design intent. Compare hole radii to STL voids.",
    }


def look_at(eye, target, up=(0.0, 1.0, 0.0)):
    z = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]
    zn = math.sqrt(z[0] ** 2 + z[1] ** 2 + z[2] ** 2) or 1.0
    z = [z[0] / zn, z[1] / zn, z[2] / zn]
    x = [
        up[1] * z[2] - up[2] * z[1],
        up[2] * z[0] - up[0] * z[2],
        up[0] * z[1] - up[1] * z[0],
    ]
    xn = math.sqrt(x[0] ** 2 + x[1] ** 2 + x[2] ** 2) or 1.0
    x = [x[0] / xn, x[1] / xn, x[2] / xn]
    y = [
        z[1] * x[2] - z[2] * x[1],
        z[2] * x[0] - z[0] * x[2],
        z[0] * x[1] - z[1] * x[0],
    ]
    return x, y, z


def capture_views(verts, faces, outdir: Path, count: int = 8, size: int = 360) -> list[str]:
    from PIL import Image, ImageDraw

    xs = [v[0] for v in verts]
    ys = [v[1] for v in verts]
    zs = [v[2] for v in verts]
    cx = (min(xs) + max(xs)) / 2
    cy = (min(ys) + max(ys)) / 2
    cz = (min(zs) + max(zs)) / 2
    span = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs), 1e-6)
    radius = span * 1.8
    poses = []
    for i in range(count):
        theta = (2 * math.pi) * (i / count) + math.pi / 8
        phi = 0.55 if i % 2 == 0 else 1.15
        poses.append(
            (
                f"view-{i:02d}",
                (
                    cx + radius * math.sin(phi) * math.cos(theta),
                    cy + radius * math.cos(phi),
                    cz + radius * math.sin(phi) * math.sin(theta),
                ),
            )
        )
    light = [0.4, 0.85, 0.35]
    ln = math.sqrt(sum(c * c for c in light)) or 1
    light = [c / ln for c in light]
    outdir.mkdir(parents=True, exist_ok=True)
    names = []
    for name, eye in poses:
        xaxis, yaxis, zaxis = look_at(eye, (cx, cy, cz))
        img = Image.new("RGB", (size, size), (10, 10, 10))
        draw = ImageDraw.Draw(img)
        projected = []
        for vx, vy, vz in verts:
            dx, dy, dz = vx - eye[0], vy - eye[1], vz - eye[2]
            px = dx * xaxis[0] + dy * xaxis[1] + dz * xaxis[2]
            py = dx * yaxis[0] + dy * yaxis[1] + dz * yaxis[2]
            pz = dx * zaxis[0] + dy * zaxis[1] + dz * zaxis[2]
            projected.append((px, py, pz))
        order = []
        for i, (ia, ib, ic) in enumerate(faces):
            depth = (projected[ia][2] + projected[ib][2] + projected[ic][2]) / 3
            order.append((depth, i))
        order.sort(reverse=True)
        scale = size * 0.42 / (span * 0.5)
        mid = size / 2
        for _, fi in order:
            ia, ib, ic = faces[fi]
            a, b, c = verts[ia], verts[ib], verts[ic]
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            nn = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            shade = max(0.12, min(1.0, (nx * light[0] + ny * light[1] + nz * light[2]) / nn))
            g = int(40 + 200 * shade)
            poly = []
            for idx in (ia, ib, ic):
                px, py, _pz = projected[idx]
                poly.append((mid + px * scale, mid - py * scale))
            draw.polygon(poly, fill=(g, g, int(g * 0.92)))
        draw.text((10, 8), name, fill=(226, 232, 240))
        dest = outdir / f"{name}.png"
        img.save(dest)
        names.append(str(dest))
    return names


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse CAD + capture many views")
    parser.add_argument("path", type=Path)
    parser.add_argument("-o", "--outdir", type=Path, default=Path("cad-review"))
    parser.add_argument("--views", type=int, default=8)
    parser.add_argument("--dump-mcp-tools", action="store_true")
    args = parser.parse_args()
    if args.dump_mcp_tools:
        print(json.dumps({"tools": MCP_TOOLS}, indent=2))
        return
    if not args.path.exists():
        raise SystemExit(f"Not found: {args.path}")
    suffix = args.path.suffix.lower()
    args.outdir.mkdir(parents=True, exist_ok=True)
    if suffix == ".dxf":
        summary = dxf_summary(args.path)
        (args.outdir / "summary.json").write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2))
        return
    if suffix == ".stl":
        summary = stl_summary(args.path)
        verts, faces, _n = load_binary_stl(args.path)
        shots = capture_views(verts, faces, args.outdir / "views", count=args.views)
        summary["views"] = shots
        (args.outdir / "summary.json").write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2))
        return
    raise SystemExit("Supported: .stl .dxf")


if __name__ == "__main__":
    main()
