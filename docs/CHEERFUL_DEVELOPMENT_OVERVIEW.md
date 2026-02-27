# Cheerful 开发总览：本地 Server / Gateway 与 Xiaomi Pad 远程连接

本文档供你整体评估 Cheerful 的架构、已实现功能与规划，涵盖**本地 cheerful server**、**本机 gateway（CLI/daemon）** 与 **Xiaomi Pad mini app** 的远程协作方式。

---

## 一、整体架构

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                  Xiaomi Pad (mini app)                   │
                    │  登录 | 会话列表 | 会话详情(Chat/Agent/Plan/Debug) | 发消息  │
                    └───────────────────────────┬─────────────────────────────┘
                                                │ HTTPS + Socket.IO (token)
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │              Cheerful Server (可跑在 Mac/云/内网)          │
                    │  Fastify + Socket.IO | PostgreSQL | 认证/会话/消息中继     │
                    └───────────────────────────┬─────────────────────────────┘
                                                │ Socket.IO (同一 session 房间)
                                                │
                    ┌───────────────────────────▼─────────────────────────────┐
                    │    本机 (Mac / Ubuntu / Windows) — Cheerful CLI         │
                    │  connect → 创建/加入 session → 消息队列 → Cursor Agent   │
                    │  (daemon 或 前台 cheerful cursor)                        │
                    └───────────────────────────┬─────────────────────────────┘
                                                │ 本地 API / 进程
                    ┌───────────────────────────▼─────────────────────────────┐
                    │              Cursor Agent (本机唯一执行端)               │
                    │  改文件 | 跑命令 | 搜索 | MCP | 斜杠能力 | 回复 → 回 Pad   │
                    └─────────────────────────────────────────────────────────┘
```

- **Pad**：远程连接 Server，只发“要做什么”（聊天/斜杠），看结果（消息、plan、debug、agent 列表）。
- **Server**：认证、存会话与消息、把 Pad 的消息转给本机 CLI、把 CLI 的回复/事件转给 Pad；不执行代码。
- **CLI（Gateway）**：在本机跑，连 Server、进同一 session、从 Socket 收 `user-message` 入队，交给 **Cursor Agent** 执行；再把 agent 的回复/plan/debug 通过 Socket 发回 Server → Pad。
- **Cursor Agent**：本机唯一“动手”的入口，所有开发任务（跑终端、改代码、搜索、斜杠能力）都在本机完成。

---

## 二、Cheerful Server（本地或远程）

### 2.1 技术栈与部署

- **栈**：Node.js + Fastify + Socket.IO + Prisma + PostgreSQL。
- **部署**：可跑在 Mac/Ubuntu/Windows 本机，或内网/云上一台机器；Pad 通过配置的 `serverUrl`（HTTPS + WSS）连接。
- **环境**：`DATABASE_URL`（PostgreSQL）、`CHEERFUL_USERNAME` / `CHEERFUL_PASSWORD`（登录预设）、可选 `CHEERFUL_AUTH_TOKEN`、`PORT`（默认 3005）。

### 2.2 认证

| 接口 | 说明 |
|------|------|
| `POST /api/auth/login` | Body: `{ username, password }`。与 env 中 `CHEERFUL_USERNAME` / `CHEERFUL_PASSWORD` 常量时间比较；通过则 upsert User（email: `{username}@cheerful.local`），返回 `{ token, userId }`。401 错误凭证，503 未配置预设。 |

- Pad 登录后把 `token` 存本地，后续 REST 与 Socket 均带该 token。

### 2.3 REST API（均需认证：Header 或 query 带 token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/machines` | 注册/更新本机（machineId + metadata），CLI 上报用。 |
| POST | `/api/sessions` | 创建或按 tag 更新会话，写入 metadata/state，返回 session 信息。CLI 启动会话时调用。 |
| GET | `/api/sessions` | 当前用户的会话列表（按 updatedAt 降序，最多 50）。Pad 首页列表。 |
| GET | `/api/sessions/:id` | 单会话详情，含 messages（按时间，最多 100）。Pad 进会话时拉取历史。 |
| POST | `/api/push` | 向该用户已注册设备发 Expo 推送（可选功能）。 |
| POST | `/api/devices` | 注册设备（pushToken 等），用于推送。 |

### 2.4 Socket.IO

- **鉴权**：`handshake.auth.token` 必须为有效 User token，否则拒绝连接。
- **房间**：客户端 `emit('join-session', { sessionId })` 加入 `session:${sessionId}`；Server 只向该房间广播该会话相关事件。

| 事件（客户端 → Server） | 说明 |
|-------------------------|------|
| `join-session` | 加入会话房间。 |
| `user-message` | Pad 发聊天/斜杠。Payload: `{ sessionId, message }`。Server 写入 Message 表，再 `to(session 房间).emit('user-message', message)`，CLI 收到后入队给 agent。 |
| `session-message` | CLI 发 agent 或系统消息。Server 写入 Message，再广播到 session 房间，Pad 收后更新对话。 |
| `session-event` | 通用会话事件，原样广播。 |
| `session-death` | 会话结束；Server 更新 session metadata（如 lifecycleState），并广播。 |
| `update-metadata` | 更新会话 metadata，写库并广播 `metadata-updated`。 |
| `update-agent-state` | 更新会话 state（如 isThinking），写库并广播 `agent-state-updated`。 |
| `agent-list` | CLI 发当前 agent 列表；Server 广播 `agent-list`。 |
| `plan-update` | CLI 发计划；Server 广播 `plan-update`。 |
| `debug-output` | CLI 发调试输出；Server 广播 `debug-output`。 |

- Pad 只发 `user-message` 与 `join-session`；CLI 发其余事件，Pad 订阅后更新 UI（消息、plan、debug、agent 列表等）。

### 2.5 数据模型（Prisma）

- **User**：id, email（如 `preset@cheerful.local`）, token, 关联 Machine / Session / Device。
- **Machine**：本机注册信息（machineId, userId, metadata）。
- **Session**：id, tag（唯一）, userId, metadata（仓库、生命周期等）, state（如 isThinking），关联 Message。
- **Message**：sessionId, payload（JSON，含消息内容）, createdAt；索引 (sessionId, createdAt)。
- **Device**：推送用（pushToken 等）。

**规划中**：Memory 表（RAG 记忆）、评估层（防注入/垃圾/毒性）在写入消息与记忆前执行。

---

## 三、本机 Gateway：Cheerful CLI（Mac / Ubuntu / Windows）

### 3.1 角色

- 在本机运行，连接同一 Cheerful Server；与 Pad 共享同一 session，形成「Pad ↔ Server ↔ CLI ↔ Cursor Agent」链路。
- 不替代 Cursor Agent：只做**消息队列 + 转发 + 状态上报**，所有执行（改文件、跑命令、搜索、斜杠）由 Cursor Agent 完成。

### 3.2 连接与会话建立

1. **认证**：CLI 使用 `cheerful auth login`（或已有 credentials）得到 token；与 Server 的 REST + Socket 使用同一套认证。
2. **机器注册**：`POST /api/machines` 上报 machineId、host、os、version 等。
3. **创建/加入会话**：  
   - 用户在本机执行 `cheerful cursor`（或由 daemon 启动）时，CLI 调用 `POST /api/sessions`，带上 tag（如 UUID）、metadata（repository、host、lifecycleState 等）、state（如 isThinking: false）。  
   - Server 返回 session id；CLI 用该 id 建立 **ApiSessionClient**（Socket 连 Server，`emit('join-session', { sessionId })`）。
4. **收消息**：Socket 监听 `user-message`；每收到一条，推入本机 **MessageQueue**。远程模式下，`cursorRemoteLauncher` 的 `nextMessage()` 从队列取消息交给 Cursor Agent；若为 `/switch` 等特殊命令，则先解析再决定是否交给 agent 或本地处理。

### 3.3 上报到 Pad（经 Server）

- CLI 通过 ApiSessionClient 向 Server 发送：
  - `sendSessionMessage(...)` → Server 存 Message 并广播 `session-message` → Pad 显示对话。
  - `updateAgentState(...)` → Server 更新 session.state 并广播 `agent-state-updated` → Pad 显示思考中等。
  - `sendAgentList(agents)` → Server 广播 `agent-list` → Pad 显示 agent 列表。
  - `sendPlanUpdate(plan)` → Server 广播 `plan-update` → Pad 显示计划。
  - `sendDebugOutput(output)` → Server 广播 `debug-output` → Pad 显示 debug。
  - `sendSessionDeath()` → 会话结束，Pad 可更新会话状态。

### 3.4 Cursor Agent 适配

- **真实 Cursor**：使用 Cursor Cloud API（需 API key）启动 agent，发送消息、收回复，再通过上面接口回传 Pad。
- **Mock 模式**：`CHEERFUL_USE_MOCK_AGENT=1` 时，使用 `createMockLocalAdapter`，不调 Cursor API，本地模拟 agent 回复、plan、debug，用于联调 Pad/Server。

### 3.5 入口与 Daemon

- **前台**：`cheerful cursor`（或等价命令）创建 session、连 Server、跑消息循环，直到退出或 `/switch`。
- **Daemon**：`cheerful daemon start` 等可在本机常驻，按需 spawn 子进程跑会话；Pad 看到的“会话”即这些会话，消息通过 Server 双向同步。
- **规划**：`cheerful gateway status | stop | install | (foreground)` 作为统一网关入口，与 daemon 对齐或合并。

---

## 四、Xiaomi Pad Mini App（cheerful-app）

### 4.1 技术栈与运行

- **栈**：React Native + Expo + expo-router；可构建为 Android/iOS/Web，你侧重点为 Xiaomi Pad（如 Android）。
- **连接**：配置 `serverUrl`（Cheerful Server 的地址）；所有请求与 Socket 指向该 Server，**不直连本机**；与本机通信完全经由 Server 与 CLI。

### 4.2 屏幕与路由（已实现）

| 路由 | 说明 |
|------|------|
| `/` (index) | 首页。若未登录显示欢迎 + 登录按钮；已登录则 `GET /api/sessions` 展示会话列表（SessionCard），点进 `/session/:id`。 |
| `/auth` | 登录页。用户名 + 密码，调用 `POST /api/auth/login`，存 token/userId 后返回首页。 |
| `/session/[id]` | 会话详情。拉取会话信息与历史消息，Socket `join-session`，订阅 `session-message` / `plan-update` / `debug-output` / `agent-list` / `agent-state-updated` 等，展示 Agent 区、Plan 区、可折叠 Debug 区、消息列表、输入框；发送走 `sendUserMessage(id, text)`。 |

### 4.3 已实现功能摘要

- **登录**：用户名/密码 → token 存储 → 后续请求带 token。
- **会话列表**：拉取并展示，支持刷新；点击进入会话详情。
- **会话详情**：  
  - 展示 agent 列表（若有）、计划步骤、可折叠 debug 输出。  
  - 消息列表（历史 + 实时 session-message）。  
  - 思考中状态（isThinking）。  
  - 底部输入框发送普通消息；**尚未**在输入框内做斜杠命令面板（规划中有）。
- **实时同步**：依赖 Socket 的 session-message、plan-update、debug-output、agent-list、metadata/state 更新，Pad 与 CLI 通过 Server 保持一致。

### 4.4 规划中的 Pad 功能（见计划文档）

- **标签页切换**：在会话或主框架增加 Tab，例如 **Chat | Terminal**；Terminal 为 SSH 连接本机 Mac（或经 Server 的 PTY 代理），在 Pad 上直接跑命令、查文件/目录，对齐 Cursor IDE 的终端体验。
- **斜杠命令面板**：输入以 `/` 开头时弹出命令列表（与 Cursor Agent 一致），选择后发送整条斜杠（如 `/clear`、`/plan`、`/search ...`）。
- **记忆（Memory）**：独立页或 Tab 展示记忆列表、搜索；“存为记忆”“应用到项目”等，与 RAG 存储与检索配合。
- **想法获取**：从会话提取想法、搜索网络（通过发消息给 Cursor Agent），结果可存为记忆。

---

## 五、端到端：从 Pad 到本机执行

1. **Pad 登录**：输入预设用户名/密码 → Server 校验 → 返回 token → Pad 存 token。
2. **本机启动会话**：用户在本机执行 `cheerful cursor`（或 daemon 已启动会话）；CLI 用 token 调 `POST /api/sessions` 创建/更新 session，Socket 连 Server 并 `join-session`。
3. **Pad 打开会话**：首页列表来自 `GET /api/sessions`，点击某条进入 `/session/:id`；`GET /api/sessions/:id` 拉历史消息，Socket 同 `join-session`，订阅各类事件。
4. **Pad 发消息**：输入文字（或将来输入斜杠）→ `sendUserMessage(sessionId, text)` → Socket `user-message` → Server 写 Message 表并 `to(session).emit('user-message', message)`。
5. **CLI 收并交给 Agent**：CLI Socket 收到 `user-message`，推入 MessageQueue；远程循环 `nextMessage()` 取出一条，若为普通聊天或斜杠则交给 Cursor Agent（或 mock）；Agent 在本机执行（改代码、跑命令、搜索等）。
6. **Agent 结果回 Pad**：CLI 通过 `sendSessionMessage` / `sendPlanUpdate` / `sendDebugOutput` / `sendAgentList` 等发到 Server，Server 广播到 `session` 房间；Pad 收到后更新 Agent 区、Plan、Debug、消息列表。

这样，**开发任务全部在本机由 Cursor Agent 完成**，Pad 仅负责输入与查看结果；若增加 Terminal 标签页，则 Pad 还可直接操作本机终端，与 Cursor IDE 的 Chat + Terminal 一致。

---

## 六、已实现 vs 规划（便于评估）

| 能力 | Server | CLI (Gateway) | Pad |
|------|--------|----------------|-----|
| 用户名/密码登录 | ✅ | ✅ auth login | ✅ |
| 会话 CRUD + 列表 | ✅ | ✅ 创建/加入 | ✅ 列表 + 详情 |
| 消息收发 + 持久化 | ✅ Socket + DB | ✅ 队列 + 回写 | ✅ 发消息 + 收展示 |
| Agent/Plan/Debug 展示 | ✅ 转发 | ✅ 上报 | ✅ 已展示 |
| 斜杠命令解析与执行 | - | ✅ 部分（如 /clear、/switch） | ❌ 无命令面板 |
| Gateway 子命令 (status/stop/install) | - | ❌ 规划中 | - |
| RAG 记忆 (Memory 表 + API) | ❌ 规划中 | - | ❌ 规划中 |
| 评估（防注入/垃圾/毒性） | ❌ 规划中 | - | - |
| Pad 标签页 (Chat / Terminal) | - | 可选 PTY 代理 | ❌ 规划中 |
| Pad SSH/终端连本机 | - | 可选 | ❌ 规划中 |

---

## 七、部署与连通性小结

- **Server**：需可被 Pad 与本机 CLI 访问（同一网络或公网）；配置 `DATABASE_URL`、`CHEERFUL_USERNAME`、`CHEERFUL_PASSWORD`；Pad 与 CLI 的 `serverUrl` 指向该 Server。
- **本机**：安装 Node，跑 `cheerful auth login` 与 `cheerful cursor`（或 daemon）；本机需能访问 Server，且 Cursor 已安装（或用 mock 模式不依赖 Cursor API）。
- **Pad**：安装 cheerful-app，配置同一 `serverUrl`，登录后即可看到本机创建的会话并与之聊天；若本机未启动会话，Pad 仅能看到历史会话列表，无法收到新消息直到本机再次连接并加入/创建会话。

以上为当前 Cheerful 开发的完整总览，便于你评估本地 Server、Gateway 与 Xiaomi Pad 的职责划分与协作方式。更细的规划（斜杠、记忆、评估、Terminal 等）见项目内计划文档。
