# Cheerful — The buddy of Cursor Agent works remotely

Use your **tablet or phone** (e.g. Xiaomi Pad) to control and monitor **Cursor Agent** on your Mac, Ubuntu, or Windows. Chat, slash commands, plan, and debug in one place—without streaming your whole desktop.

## Quick links

- **[For humans](docs/FOR_USERS.md)** — What Cheerful is, advantages vs RealVNC, and points to note.
- **[Development overview](docs/CHEERFUL_DEVELOPMENT_OVERVIEW.md)** — Architecture, server, CLI, and Pad app in detail.

## How it works

1. **Cheerful Server** (runs on your machine or a cloud) — Handles login, sessions, and relays messages between the Pad and your computer.
2. **Cheerful CLI** (runs on your Mac/Ubuntu/Windows) — Connects to the server and to **Cursor Agent** on the same machine. Receives messages from the Pad and passes them to the agent; sends back replies, plan, and debug.
3. **Cheerful App** (on your Xiaomi Pad or phone) — Log in, open a session, send messages and slash commands, and see the agent’s plan and debug in real time.

All code and commands run **locally** on your computer. The server only passes messages; it does not execute your code.

## Quick start

### 1. Server (once)

```bash
# In packages/cheerful-server: set DATABASE_URL, CHEERFUL_USERNAME, CHEERFUL_PASSWORD
yarn db:migrate
yarn dev
```

### 2. Your computer (each time you want to use the Pad)

```bash
# Install and log in (one time)
cd packages/cheerful-cli && yarn && ./bin/cheerful.mjs auth login

# Start a session (Pad can then connect to it)
./bin/cheerful.mjs cursor
```

### 3. Pad

- Install the app (Expo / Android build).
- Set the server URL and log in with the same username/password as on the server.
- Open a session and start chatting; the agent runs on your computer.

## Project layout

| Package | Role |
|--------|------|
| **cheerful-server** | Auth, sessions, messages, Socket.IO relay (PostgreSQL) |
| **cheerful-cli** | Gateway: connects to server and Cursor Agent on your machine |
| **cheerful-app** | Mobile/tablet client (Expo, React Native) |
| **cheerful-agent** | Helper for Cursor Cloud API (optional) |
| **cheerful-wire** | Shared types and schemas |

## Why Cheerful?

- **Lightweight** — Chat and events, not desktop video. Works on Wi‑Fi and mobile.
- **Cursor-native** — Slash commands, plan, debug, and conversation in one place.
- **Local execution** — Your code stays on your machine; the server only relays.
- **Open** — Self-host the server and audit the code.

See **[For humans](docs/FOR_USERS.md)** for a comparison with RealVNC and more details.

## License

MIT
