import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer } from 'socket.io';
import { db } from '../../storage/db';
import { auth } from '../auth/auth';
import { activityCache } from '../presence/sessionCache';
import { log } from '../../utils/log';
import { Expo } from 'expo-server-sdk';
import { evaluateContent } from '../evaluation/evaluateContent';

const expo = new Expo();

export async function startApi(): Promise<void> {
  const port = parseInt(process.env.PORT || '3005', 10);

  const app = Fastify();
  await app.register(cors, { origin: true, credentials: true });

  // --- Login (username/password, no Bearer) ---
  app.post('/api/auth/login', async (request, reply) => {
    const presetUsername = process.env.CHEERFUL_USERNAME;
    const presetPassword = process.env.CHEERFUL_PASSWORD;
    const presetToken = process.env.CHEERFUL_AUTH_TOKEN;

    if (!presetUsername || !presetPassword) {
      return reply.status(503).send({ error: 'Server login not configured (missing CHEERFUL_USERNAME/CHEERFUL_PASSWORD)' });
    }

    const body = request.body as { username?: string; password?: string };
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!username || !password) {
      return reply.status(400).send({ error: 'username and password required' });
    }

    const { timingSafeEqual } = await import('node:crypto');
    const enc = new TextEncoder();
    const a = enc.encode(password);
    const b = enc.encode(presetPassword);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }
    if (username !== presetUsername) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    const token = presetToken || `preset-${presetUsername}`;
    const user = await db.user.upsert({
      where: { email: `${presetUsername}@cheerful.local` },
      create: {
        token,
        email: `${presetUsername}@cheerful.local`,
      },
      update: presetToken ? { token: presetToken } : {},
    });

    return { token: user.token, userId: user.id };
  });

  // --- REST Routes ---

  app.post('/api/machines', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = request.body as { machineId: string; metadata: Record<string, unknown> };
    const meta = body.metadata as object;
    await db.machine.upsert({
      where: { machineId_userId: { machineId: body.machineId, userId: user.id } },
      create: { machineId: body.machineId, userId: user.id, metadata: meta },
      update: { metadata: meta },
    });

    return { ok: true };
  });

  app.post('/api/sessions', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = request.body as { tag: string; metadata: Record<string, unknown>; state: Record<string, unknown> };
    const metadata = body.metadata as object;
    const state = body.state as object;
    const session = await db.session.upsert({
      where: { tag: body.tag },
      create: {
        tag: body.tag,
        userId: user.id,
        metadata,
        state,
      },
      update: {
        metadata,
        state,
      },
    });

    activityCache.set(session.id, { metadata: body.metadata as Record<string, unknown> });

    return { id: session.id, tag: session.tag, metadata: session.metadata, state: session.state, createdAt: session.createdAt.toISOString(), updatedAt: session.updatedAt.toISOString() };
  });

  app.get('/api/sessions', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const sessions = await db.session.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return { sessions };
  });

  app.get('/api/sessions/:id', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const session = await db.session.findFirst({
      where: { id, userId: user.id },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
    });

    if (!session) return reply.status(404).send({ error: 'Not found' });
    return session;
  });

  app.post('/api/memories', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = request.body as { content: string; rawContent?: string; sessionId?: string; type?: string; meta?: Record<string, unknown> };
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const evalResult = evaluateContent(content);
    if (!evalResult.ok) {
      return reply.status(400).send({ error: 'Content not accepted' });
    }

    const memory = await db.memory.create({
      data: {
        userId: user.id,
        sessionId: body.sessionId ?? null,
        type: body.type ?? 'manual',
        content,
        rawContent: body.rawContent ?? null,
        meta: (body.meta as object) ?? {},
      },
    });
    return {
      id: memory.id,
      content: memory.content,
      type: memory.type,
      sessionId: memory.sessionId,
      createdAt: memory.createdAt.toISOString(),
    };
  });

  app.get('/api/memories', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const query = request.query as { sessionId?: string; type?: string; limit?: string };
    const limit = Math.min(parseInt(query.limit || '50', 10) || 50, 100);
    const where: { userId: string; sessionId?: string; type?: string } = { userId: user.id };
    if (query.sessionId) where.sessionId = query.sessionId;
    if (query.type) where.type = query.type;

    const memories = await db.memory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return memories.map(m => ({
      id: m.id,
      content: m.content,
      rawContent: m.rawContent,
      type: m.type,
      sessionId: m.sessionId,
      meta: m.meta,
      createdAt: m.createdAt.toISOString(),
    }));
  });

  app.post('/api/push', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = request.body as { title: string; body: string; data?: Record<string, unknown> };
    const devices = await db.device.findMany({
      where: { userId: user.id, pushToken: { not: null } },
    });

    const messages = devices
      .filter(d => d.pushToken && Expo.isExpoPushToken(d.pushToken))
      .map(d => ({
        to: d.pushToken!,
        title: body.title,
        body: body.body,
        data: body.data,
        sound: 'default' as const,
      }));

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (err) {
          log({ module: 'push', level: 'error' }, `Push failed: ${err}`);
        }
      }
    }

    return { sent: messages.length };
  });

  app.post('/api/devices', async (request, reply) => {
    const user = await auth.authenticate(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    const body = request.body as { pushToken?: string; deviceName?: string; publicKey?: string };
    const device = await db.device.create({
      data: {
        userId: user.id,
        pushToken: body.pushToken,
        deviceName: body.deviceName,
        publicKey: body.publicKey,
      },
    });

    return { id: device.id };
  });

  // --- Socket.IO ---

  const server = await app.listen({ port, host: '0.0.0.0' });
  log({ module: 'api' }, `API server listening on port ${port}`);

  const io = new SocketIOServer(app.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const user = await db.user.findUnique({ where: { token } });
    if (!user) return next(new Error('Invalid token'));

    (socket as any).userId = user.id;
    next();
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    log({ module: 'socket' }, `Client connected: ${socket.id} (user: ${userId})`);

    socket.on('join-session', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
      log({ module: 'socket' }, `Joined session room: ${sessionId}`);
    });

    socket.on('user-message', async ({ sessionId, message }) => {
      const text = (message?.content as { text?: string })?.text ?? (typeof message === 'string' ? message : '');
      const evalResult = evaluateContent(text);
      if (!evalResult.ok) {
        socket.emit('user-message-error', { error: 'Content not accepted', reason: 'content_not_accepted' });
        return;
      }
      await db.message.create({
        data: { sessionId, payload: message },
      });

      socket.to(`session:${sessionId}`).emit('user-message', message);

      activityCache.set(sessionId, { lastActivity: Date.now() });
    });

    socket.on('session-message', async ({ sessionId, message, timestamp }) => {
      await db.message.create({
        data: { sessionId, payload: { ...message, timestamp } },
      });

      socket.to(`session:${sessionId}`).emit('session-message', { message, timestamp });
    });

    socket.on('session-event', ({ sessionId, event, timestamp }) => {
      io.to(`session:${sessionId}`).emit('session-event', { event, timestamp });
    });

    socket.on('session-death', async ({ sessionId, timestamp }) => {
      io.to(`session:${sessionId}`).emit('session-death', { timestamp });
      activityCache.remove(sessionId);

      try {
        await db.session.update({
          where: { id: sessionId },
          data: {
            metadata: {
              lifecycleState: 'archived',
              lifecycleStateSince: timestamp,
            },
          },
        });
      } catch {
        // session may not exist
      }
    });

    socket.on('update-metadata', async ({ sessionId, metadata }) => {
      try {
        await db.session.update({
          where: { id: sessionId },
          data: { metadata },
        });
        socket.to(`session:${sessionId}`).emit('metadata-updated', { metadata });
      } catch {
        // ignore
      }
    });

    socket.on('update-agent-state', async ({ sessionId, state }) => {
      try {
        await db.session.update({
          where: { id: sessionId },
          data: { state },
        });
        socket.to(`session:${sessionId}`).emit('agent-state-updated', { state });
      } catch {
        // ignore
      }
    });

    socket.on('agent-list', ({ sessionId, agents }) => {
      io.to(`session:${sessionId}`).emit('agent-list', { agents });
    });

    socket.on('plan-update', ({ sessionId, plan }) => {
      io.to(`session:${sessionId}`).emit('plan-update', { plan });
    });

    socket.on('debug-output', ({ sessionId, output }) => {
      io.to(`session:${sessionId}`).emit('debug-output', { output });
    });

    socket.on('disconnect', () => {
      log({ module: 'socket' }, `Client disconnected: ${socket.id}`);
    });
  });
}
