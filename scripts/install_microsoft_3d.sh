#!/usr/bin/env bash
# Download Microsoft open-source image-to-3D (MoGe) and CPU PyTorch.
# TRELLIS.2 is not installed here: it needs NVIDIA ≥24GB and CUDA 12.4.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/.vendor/microsoft-moge"
PYTHON="${PYTHON:-python3}"

echo "Cheerful + Microsoft image-to-3D installer"
echo "  MoGe (MIT):     https://github.com/microsoft/MoGe"
echo "  TRELLIS.2 (MIT): https://github.com/microsoft/TRELLIS.2  [GPU, skipped]"
echo ""

mkdir -p "$ROOT/.vendor"
if [ ! -d "$VENDOR/.git" ]; then
  echo "Cloning microsoft/MoGe ..."
  git clone --depth 1 https://github.com/microsoft/MoGe.git "$VENDOR"
else
  echo "MoGe already cloned at $VENDOR"
fi

echo "Installing CPU PyTorch + MoGe runtime deps ..."
"$PYTHON" -m pip install --upgrade pip
"$PYTHON" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
"$PYTHON" -m pip install huggingface-hub pillow opencv-python-headless numpy scipy
"$PYTHON" -m pip install "git+https://github.com/EasternJournalist/utils3d-moge.git@62f09d58509485564e24d5d9f6aac9ee9ebc0c37"

echo ""
echo "Done. Convert a photo:"
echo "  $PYTHON $ROOT/scripts/microsoft_image_to_3d.py your.jpg -o out.stl --backend moge"
echo ""
echo "TRELLIS.2 (full generative 3D, GPU only):"
echo "  git clone --recursive https://github.com/microsoft/TRELLIS.2.git"
echo "  cd TRELLIS.2 && . ./setup.sh --new-env --basic --flash-attn --nvdiffrast --nvdiffrec --cumesh --o-voxel --flexgemm"
echo "  $PYTHON $ROOT/scripts/microsoft_image_to_3d.py your.jpg -o out.stl --backend trellis2"
