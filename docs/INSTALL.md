# Cheerful — Installation guide (copy & paste)

Follow these steps to run the **server**, **CLI** (on your computer), and install the **Android APK** on your phone or tablet (e.g. Xiaomi Pad).

---

## Download

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely/main/scripts/install.sh | sh
```

or [download manually](#manual-install-instructions) (clone the repo).

### Windows

In **PowerShell** (Run as Administrator if needed):

```powershell
irm https://raw.githubusercontent.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely/main/scripts/install.ps1 | iex
```

or [download manually](#manual-install-instructions) (clone the repo).

### Linux

```bash
curl -fsSL https://raw.githubusercontent.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely/main/scripts/install.sh | sh
```

or [download manually](#manual-install-instructions) (clone the repo).

### Manual install instructions

Clone the repo and install dependencies:

```bash
git clone https://github.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely.git
cd cheerful-the-buddy-of-cursor-agent-works-remotely
yarn install
```

Then continue from the [Server](#2-server-cheerful-gateway--backend) section below.

### Docker

Run only the **Cheerful server** in Docker (you still need PostgreSQL and env vars):

```bash
# Build (from repo root)
docker build -f Dockerfile.server -t cheerful-server .

# Run (set DATABASE_URL, CHEERFUL_USERNAME, CHEERFUL_PASSWORD)
docker run -p 3005:3005 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@host.docker.internal:5432/cheerful" \
  -e CHEERFUL_USERNAME=your_username \
  -e CHEERFUL_PASSWORD=your_password \
  cheerful-server
```

Use `host.docker.internal` (Mac/Windows) or your host IP for PostgreSQL. The CLI and Android app run on your machine and point to this server.

---

## Prerequisites

- **Node.js** 18+ and **Yarn** (or npm)
- **PostgreSQL** (for the server)
- **Git**
- For **local Android build**: Android Studio / Android SDK and `JAVA_HOME` set (optional; you can use EAS cloud build instead)

---

## 1. Clone the repo

```bash
git clone https://github.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely.git
cd cheerful-the-buddy-of-cursor-agent-works-remotely
```

---

## 2. Server (Cheerful gateway / backend)

Create a `.env` file in `packages/cheerful-server` with your database and login:

```bash
cd packages/cheerful-server
```

Create `.env` (copy and edit):

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/cheerful"
CHEERFUL_USERNAME=your_username
CHEERFUL_PASSWORD=your_password
PORT=3005
```

Replace `USER`, `PASSWORD`, and database name as needed. Then:

```bash
yarn install
yarn db:generate
yarn db:migrate
yarn dev
```

Leave this terminal open. The server runs at `http://localhost:3005` (or your machine’s IP on the network).

**Note:** If the Pad is on another device, use your computer’s **local IP** (e.g. `http://192.168.1.100:3005`) as the server URL in the app. Make sure port `3005` is not blocked by firewall.

---

## 3. CLI (on your Mac / Ubuntu / Windows)

In a **new terminal**:

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-cli
yarn install
```

Configure the CLI to talk to your server (edit `~/.cheerful` or set env). Example with env:

```bash
export CHEERFUL_SERVER_URL="http://YOUR_SERVER_IP:3005"
./bin/cheerful.mjs auth login
```

Use the **same** `CHEERFUL_USERNAME` and `CHEERFUL_PASSWORD` as on the server. Then start a session so the Pad can connect:

```bash
./bin/cheerful.mjs cursor
```

Keep this running while you use the Pad. To use a **mock agent** (no Cursor API key):

```bash
CHEERFUL_USE_MOCK_AGENT=1 ./bin/cheerful.mjs cursor
```

---

## 4. Android APK (install on phone / tablet)

You can either **build the APK in the cloud** (EAS) or **build it locally**.

### Option A — Build APK with EAS (recommended, no Android Studio needed)

1. Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

2. In the app folder, run a **preview** build (produces an APK):

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-app
yarn install
eas build --platform android --profile preview
```

3. When the build finishes, EAS will show a **download link**. Open it on your Android device (or download on PC and transfer the `.apk` file).

4. On the Android device: enable **Install from unknown sources** for your browser or file manager, then open the downloaded `.apk` and install.

---

### Option B — Build APK locally (Android Studio / SDK required)

1. Set `JAVA_HOME` and have Android SDK installed (e.g. via Android Studio).

2. Run:

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-app
yarn install
npx expo run:android
```

3. The APK is produced under `android/app/build/outputs/apk/` (e.g. `debug` or `release`). Copy the `.apk` to your phone and install it.

---

## 5. Configure the app on the Pad

1. Open the **Cheerful** app on your Android device.
2. On the login screen you’ll see **Server URL**, **Username**, and **Password**.
3. Enter your **Server URL** (e.g. `http://192.168.1.100:3005` — use your computer’s IP and the port from step 2). One APK works for everyone; no need to rebuild.
4. Enter the **same** username and password you set in the server `.env` (`CHEERFUL_USERNAME` / `CHEERFUL_PASSWORD`).
5. Tap **Login**. You should see the session list. If the CLI is running (`./bin/cheerful.mjs cursor`), a session will appear; tap it to chat and use slash commands.

---

## Quick copy-paste summary

**Terminal 1 — Server:**

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-server
# Add .env with DATABASE_URL, CHEERFUL_USERNAME, CHEERFUL_PASSWORD, PORT=3005
yarn install && yarn db:generate && yarn db:migrate && yarn dev
```

**Terminal 2 — CLI:**

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-cli
yarn install
export CHEERFUL_SERVER_URL="http://YOUR_IP:3005"
./bin/cheerful.mjs auth login
./bin/cheerful.mjs cursor
```

**Android APK (EAS):**

```bash
cd cheerful-the-buddy-of-cursor-agent-works-remotely/packages/cheerful-app
yarn install
eas build --platform android --profile preview
# Download the APK from the link and install on your device.
```

Replace `YOUR_IP` with your computer’s IP (e.g. `192.168.1.100`) so the Pad and CLI can reach the server.

---

## One APK for everyone

The app stores the **Server URL** you enter on the login screen. You can build a single APK and share it; each user only needs to enter their own server URL (and username/password) when they first log in.
