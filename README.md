# Cheerful

## Mobile and Web Client for Cursor Cloud Agents

Use Cursor Cloud Agents from anywhere with end-to-end encryption.

### Step 1: Install CLI on your computer

```bash
npm install -g cheerful-coder
```

### Step 2: Start using `cheerful` to manage Cursor Cloud Agents

```bash
# Start a new agent session
cheerful

# Launch an agent on a specific repo
cheerful --repo https://github.com/your-org/your-repo

# List running agents
cheerful agent list
```

## How does it work?

On your computer, run `cheerful` to launch and monitor Cursor Cloud Agents through our CLI wrapper. When you want to control your coding agents from your phone, it switches to remote mode via our sync server. To switch back to your computer, just press any key on your keyboard.

## Why Cheerful?

- **Mobile access to Cursor Cloud Agents** - Check what your AI is building while away from your desk
- **Push notifications** - Get alerted when agents finish or encounter errors
- **Switch devices instantly** - Take control from phone or desktop with one keypress
- **End-to-end encrypted** - Your code never leaves your devices unencrypted
- **Open source** - Audit the code yourself. No telemetry, no tracking

## Project Components

- **Cheerful App** - Web UI + mobile client (Expo)
- **Cheerful CLI** - Command-line interface for Cursor Cloud Agents
- **Cheerful Agent** - Remote agent control CLI (create, send, monitor sessions)
- **Cheerful Server** - Backend server for encrypted sync
- **Cheerful Wire** - Shared types and validation schemas

## License

MIT License
