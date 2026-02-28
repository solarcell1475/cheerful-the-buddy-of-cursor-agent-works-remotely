#!/usr/bin/env sh
# Cheerful — curl installation script
# Usage: curl -fsSL https://raw.githubusercontent.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely/main/scripts/install.sh | sh
#    or: curl -fsSL ... | sh -s -- /path/to/install

set -e

REPO_URL="https://github.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely.git"
BRANCH="${CHEERFUL_INSTALL_BRANCH:-main}"
INSTALL_DIR="${1:-cheerful-the-buddy-of-cursor-agent-works-remotely}"

echo "Cheerful installer (branch: $BRANCH)"
echo ""

if [ -f "package.json" ] && grep -q "cheerful-monorepo" package.json 2>/dev/null; then
  echo "Already inside Cheerful repo. Using current directory."
  ROOT="$(pwd)"
else
  if [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/package.json" ]; then
    echo "Directory $INSTALL_DIR already exists. Using it."
    ROOT="$(cd "$INSTALL_DIR" && pwd)"
  else
    echo "Cloning into $INSTALL_DIR ..."
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    ROOT="$(cd "$INSTALL_DIR" && pwd)"
  fi
fi

echo ""
echo "Installing dependencies (yarn) ..."
cd "$ROOT"
yarn install

echo ""
echo "=============================================="
echo "Cheerful is ready at: $ROOT"
echo "=============================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Server (in one terminal):"
echo "   cd $ROOT/packages/cheerful-server"
echo "   # Create .env with: DATABASE_URL, CHEERFUL_USERNAME, CHEERFUL_PASSWORD, PORT=3005"
echo "   yarn db:generate && yarn db:migrate && yarn dev"
echo ""
echo "2. CLI (in another terminal):"
echo "   cd $ROOT/packages/cheerful-cli"
echo "   export CHEERFUL_SERVER_URL=\"http://YOUR_IP:3005\""
echo "   ./bin/cheerful.mjs auth login"
echo "   ./bin/cheerful.mjs cursor"
echo ""
echo "3. Android APK: see docs/INSTALL.md (eas build --platform android --profile preview)"
echo "   Full guide: $ROOT/docs/INSTALL.md"
echo ""
