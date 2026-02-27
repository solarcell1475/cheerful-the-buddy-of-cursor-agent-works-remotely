# Changelog

All notable changes to Cheerful are documented here.

## [0.2.0] — 2025-02-28

### Added

- **User-facing docs** — [For humans](docs/FOR_USERS.md): what Cheerful is, advantages vs RealVNC, points to note.
- **Server: content evaluation** — Lightweight filter before saving messages and memories (length, prompt-injection patterns). Rejects with "Content not accepted" without exposing rules.
- **Server: Memory (RAG)** — `Memory` model, `POST/GET /api/memories`, migration. For RAG-style agent context.
- **Pad: slash command panel** — When input starts with `/`, shows a filterable list of commands (e.g. `/plan`, `/clear`, `/search`). Tap to insert.
- **CLI: slash parsing** — `parseSlashCommand()`, extended `parseSpecialCommand()`. `/clear` sends session-death; `/exit` handled locally.
- **Repo assets** — Icon and banner in `docs/images/` for app and GitHub social preview.

### Changed

- README points to For humans and Development overview; quick start and version section added.

---

## [0.1.0] — Initial

- Cheerful Server (auth, sessions, messages, Socket.IO, PostgreSQL).
- Cheerful CLI (gateway, message queue, Cursor Agent adapter, daemon).
- Cheerful App (Expo: login, session list, chat, agent/plan/debug).
- Cheerful Agent, Cheerful Wire packages.
