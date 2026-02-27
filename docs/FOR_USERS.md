# Cheerful — For Humans

A short, human-friendly guide to what Cheerful is, why you might use it instead of RealVNC, and what to keep in mind.

---

## What is Cheerful?

**Cheerful** is a remote companion for **Cursor Agent** on your computer. It lets you:

- **Use your tablet or phone (e.g. Xiaomi Pad)** to talk to the same Cursor Agent that runs on your **Mac, Ubuntu, or Windows** machine.
- **Send messages and slash commands** from the Pad; the agent runs **locally** on your computer and does the real work (editing code, running terminals, searching, etc.).
- **See the agent’s plan, debug output, and replies** on the Pad in real time, so you can keep an eye on progress or continue the conversation away from your desk.

So: **Pad = remote control and view. Your computer = where everything actually runs.** No need to mirror the whole desktop.

---

## Cheerful vs RealVNC (and similar remote desktops)

| | **Cheerful** | **RealVNC / remote desktop** |
|--|--------------|------------------------------|
| **What you see** | Chat + agent plan + debug (focused view) | Full desktop screen (pixel stream) |
| **What you do** | Type messages and slash commands; optional terminal tab | Use mouse/keyboard on the whole OS |
| **Network** | Text and events (small, efficient) | Video of the screen (higher bandwidth, latency-sensitive) |
| **Use case** | “Drive Cursor Agent from the couch / on the go” | “Use my computer as if I’m in front of it” |
| **Setup** | Server + CLI on computer + app on Pad; one account | VNC server + VNC client; often more network/port setup |
| **Security** | Your code stays on your machine; server only relays messages | Full desktop access; security depends on VNC and network |

**When Cheerful is a better fit**

- You mainly want to **control and monitor Cursor Agent** (tasks, plans, chat) from a tablet/phone.
- You prefer **low bandwidth** and **chat-style interaction** instead of streaming a full desktop.
- You’re okay with **agent + (optional) terminal** as the main way to “do things” on the computer, rather than full GUI control.

**When something like RealVNC is a better fit**

- You need **full desktop access** (any app, multiple windows, complex GUI workflows).
- You want to **see exactly what’s on the monitor** (e.g. design tools, games, legacy apps).
- You’re not focused on Cursor Agent and prefer “remote desktop in the classic sense.”

You can also use **both**: Cheerful for Cursor Agent from the Pad, and RealVNC when you need full desktop control.

---

## Advantages of using Cheerful

- **Lightweight** — Chat and events, not video. Works well on Wi‑Fi and mobile networks.
- **Cursor-native** — Designed around Cursor Agent: slash commands, plan, debug, and conversation in one place.
- **Local execution** — Code and commands run on **your** Mac/Ubuntu/Windows; the server only passes messages.
- **One place to look** — Session list, current agent, plan, and debug on the Pad instead of hunting on a tiny desktop stream.
- **Optional terminal** — (Planned) A terminal tab on the Pad that connects to your computer (e.g. via SSH), so you can run quick commands or check paths without mirroring the whole screen.
- **Open and auditable** — You can host your own server and inspect the code.

---

## Points to note

1. **You need a running “gateway” on your computer**  
   The Pad talks to a **Cheerful server** (which can be on the same machine or elsewhere). Your computer must run the **Cheerful CLI** and be connected to that server so it can receive messages and run Cursor Agent. If the CLI isn’t running or isn’t connected, the Pad won’t be able to drive the agent.

2. **One preset user (for now)**  
   The server is typically configured with a single username/password (e.g. via environment variables). Everyone using that server uses that one account. Fine for personal or small-team use; multi-user improvements can come later.

3. **Network and URL**  
   The Pad app needs the **server URL** (and possibly HTTPS). Your computer (CLI) must reach the same server. If the server is on your home machine, the Pad and computer usually need to be on the same network or you need a way to reach that machine (e.g. tunnel or port forward).

4. **Cursor and API key (for real agent)**  
   To use the real Cursor Agent (not the mock), Cursor must be set up on your computer and the CLI needs the appropriate API key. The Pad doesn’t need the key; it only sends messages through the server to the CLI.

5. **Terminal tab (planned)**  
   A future version will add a **Terminal** tab on the Pad (e.g. SSH or PTY proxy to your computer) so you can run shell commands and check files directly from the Pad, similar to Cursor IDE’s integrated terminal.

6. **Slash commands**  
   Commands like `/clear`, `/plan`, `/search`, etc. are sent as messages. The CLI and Cursor Agent interpret them on your computer. The Pad’s job is to let you type or pick these commands and send them.

---

## Quick mental model

- **Pad (client)** — Your remote “remote control”: sessions, chat, plan, debug, (later) terminal.
- **Server** — Relays messages, stores sessions and chat history; doesn’t run your code.
- **CLI on your computer** — Joins a session, receives messages from the server, and hands them to Cursor Agent; sends back replies, plan, and debug.
- **Cursor Agent** — The only thing that actually edits files, runs commands, and searches; runs locally on your machine.

So: **Cheerful = the buddy of Cursor Agent that works remotely** — you stay in the “chat + plan + debug” (and later terminal) flow, without needing a full remote desktop like RealVNC.
