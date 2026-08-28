#!/usr/bin/env python3
"""Fuse Microsoft open-source image-to-3D into Cheerful.

Backends
--------
moge      Microsoft MoGe-2 (photo → metric point map → mesh → STL).
          Smallest checkpoint is Ruicheng/moge-2-vits-normal (~35M, CPU OK).
trellis2  Microsoft TRELLIS.2-4B (image → textured 3D asset). Needs NVIDIA ≥24GB.
auto      trellis2 if CUDA is available, otherwise moge.

Install (CPU MoGe)::

    scripts/install_microsoft_3d.sh

Then::

    python3 scripts/microsoft_image_to_3d.py photo.jpg -o out.stl
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDOR_MOGE = ROOT / ".vendor" / "microsoft-moge"


def _device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
    except ImportError:
        pass
    return "cpu"


def _ensure_moge_path() -> None:
    for candidate in (VENDOR_MOGE, Path("/tmp/MoGe")):
        if (candidate / "moge" / "model" / "v2.py").exists():
            sys.path.insert(0, str(candidate))
            return
    raise SystemExit(
        "Microsoft MoGe is not cloned. Run: scripts/install_microsoft_3d.sh\n"
        "Repo: https://github.com/microsoft/MoGe (MIT)"
    )


def write_binary_stl(path: Path, vertices, faces) -> int:
    import numpy as np

    verts = np.asarray(vertices, dtype=np.float32).reshape(-1, 3)
    idx = np.asarray(faces, dtype=np.int32).reshape(-1, 3)
    n = int(idx.shape[0])
    blob = bytearray(84 + n * 50)
    label = b"cheerful-moge"
    blob[0 : len(label)] = label
    struct.pack_into("<I", blob, 80, n)
    off = 84
    for i, j, k in idx:
        a, b, c = verts[i], verts[j], verts[k]
        ux, uy, uz = float(b[0] - a[0]), float(b[1] - a[1]), float(b[2] - a[2])
        vx, vy, vz = float(c[0] - a[0]), float(c[1] - a[1]), float(c[2] - a[2])
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        nlen = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
        struct.pack_into(
            "<12fH",
            blob,
            off,
            nx / nlen,
            ny / nlen,
            nz / nlen,
            float(a[0]),
            float(a[1]),
            float(a[2]),
            float(b[0]),
            float(b[1]),
            float(b[2]),
            float(c[0]),
            float(c[1]),
            float(c[2]),
            0,
        )
        off += 50
    path.write_bytes(blob)
    return n


def pointmap_to_mesh(points, mask):
    import numpy as np

    h, w = mask.shape
    index = -np.ones((h, w), dtype=np.int32)
    verts = points[mask]
    index[mask] = np.arange(verts.shape[0], dtype=np.int32)
    a = index[:-1, :-1]
    b = index[:-1, 1:]
    c = index[1:, :-1]
    d = index[1:, 1:]
    t1 = (a >= 0) & (b >= 0) & (c >= 0)
    t2 = (b >= 0) & (c >= 0) & (d >= 0)
    faces = np.concatenate(
        [
            np.stack([a[t1], c[t1], b[t1]], axis=1),
            np.stack([b[t2], c[t2], d[t2]], axis=1),
        ],
        axis=0,
    )
    return verts.astype(np.float32), faces.astype(np.int32)


def run_moge(image_path: Path, out_stl: Path, max_side: int, model_id: str) -> dict:
    _ensure_moge_path()
    import numpy as np
    from PIL import Image

    import torch
    from moge.model.v2 import MoGeModel

    device = _device()
    print(f"MoGe backend on {device}, model={model_id}", flush=True)
    model = MoGeModel.from_pretrained(model_id).to(device).eval()

    image = Image.open(image_path).convert("RGB")
    w, h = image.size
    scale = max_side / max(w, h)
    if scale < 1:
        image = image.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    arr = np.asarray(image).astype(np.float32) / 255.0
    tensor = torch.tensor(arr, dtype=torch.float32, device=device).permute(2, 0, 1)

    with torch.inference_mode():
        output = model.infer(tensor, use_fp16=device == "cuda")
    points = output["points"].detach().cpu().numpy()
    mask = output["mask"].detach().cpu().numpy() > 0.5
    if mask.ndim == 3:
        mask = mask[0]
        points = points[0]
    # Drop far/edge speckles
    if mask.any():
        depth = points[..., 2]
        finite = np.isfinite(depth) & mask
        if finite.any():
            lo, hi = np.percentile(depth[finite], [2, 98])
            mask = finite & (depth >= lo) & (depth <= hi)

    vertices, faces = pointmap_to_mesh(points, mask)
    # OpenGL-ish: Y up
    vertices = vertices * np.array([1.0, -1.0, -1.0], dtype=np.float32)
    ntris = write_binary_stl(out_stl, vertices, faces)
    meta = {
        "backend": "moge",
        "model": model_id,
        "device": device,
        "image": str(image_path),
        "stl": str(out_stl),
        "vertices": int(vertices.shape[0]),
        "triangles": ntris,
        "license": "MIT (Microsoft MoGe)",
        "source": "https://github.com/microsoft/MoGe",
    }
    out_stl.with_suffix(".json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))
    return meta


def run_trellis2(image_path: Path, out_stl: Path) -> dict:
    try:
        import torch
        from trellis2.pipelines import Trellis2ImageTo3DPipeline
    except ImportError as exc:
        raise SystemExit(
            "TRELLIS.2 is not installed. It needs Linux + NVIDIA GPU ≥24GB.\n"
            "Clone https://github.com/microsoft/TRELLIS.2 (MIT) and follow setup.sh.\n"
            f"Import error: {exc}"
        ) from exc
    if not torch.cuda.is_available():
        raise SystemExit(
            "TRELLIS.2 requires CUDA. This machine has no NVIDIA GPU.\n"
            "Use --backend moge for CPU photo→mesh, or run TRELLIS.2 on a 24GB GPU box."
        )
    from PIL import Image

    pipeline = Trellis2ImageTo3DPipeline.from_pretrained("microsoft/TRELLIS.2-4B")
    pipeline.cuda()
    image = Image.open(image_path).convert("RGB")
    mesh = pipeline.run(image)[0]
    vertices = mesh.vertices.detach().cpu().numpy()
    faces = mesh.faces.detach().cpu().numpy()
    ntris = write_binary_stl(out_stl, vertices, faces)
    meta = {
        "backend": "trellis2",
        "model": "microsoft/TRELLIS.2-4B",
        "stl": str(out_stl),
        "triangles": ntris,
        "license": "MIT (Microsoft TRELLIS.2)",
        "source": "https://github.com/microsoft/TRELLIS.2",
    }
    out_stl.with_suffix(".json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))
    return meta


def main() -> None:
    parser = argparse.ArgumentParser(description="Microsoft image-to-3D → STL for Cheerful")
    parser.add_argument("image", type=Path, help="Input photo / 2D drawing")
    parser.add_argument("-o", "--output", type=Path, default=None, help="Output .stl")
    parser.add_argument(
        "--backend",
        choices=("auto", "moge", "trellis2"),
        default="auto",
        help="auto = TRELLIS.2 on CUDA, else MoGe",
    )
    parser.add_argument("--max-side", type=int, default=384, help="MoGe resize cap (CPU-friendly)")
    parser.add_argument(
        "--model",
        default="Ruicheng/moge-2-vits-normal",
        help="Hugging Face MoGe repo id",
    )
    args = parser.parse_args()
    if not args.image.exists():
        raise SystemExit(f"Image not found: {args.image}")
    out = args.output or args.image.with_suffix(".stl")
    out.parent.mkdir(parents=True, exist_ok=True)
    backend = args.backend
    if backend == "auto":
        backend = "trellis2" if _device() == "cuda" else "moge"
        print(f"auto backend → {backend}", flush=True)
    if backend == "trellis2":
        run_trellis2(args.image, out)
    else:
        run_moge(args.image, out, args.max_side, args.model)


if __name__ == "__main__":
    main()
