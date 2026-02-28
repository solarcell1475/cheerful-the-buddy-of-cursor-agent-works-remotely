import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let lastServerUrl: string | null = null;

export function getSocket(token: string, serverUrl: string): Socket {
  const base = serverUrl.trim().replace(/\/$/, '');
  if (socket?.connected && lastServerUrl === base) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  lastServerUrl = base;
  socket = io(base, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  lastServerUrl = null;
}

export function joinSession(sessionId: string): void {
  socket?.emit('join-session', { sessionId });
}

export function sendUserMessage(sessionId: string, text: string, meta?: Record<string, unknown>): void {
  socket?.emit('user-message', {
    sessionId,
    message: {
      content: { text },
      meta,
    },
  });
}

export function onSessionMessage(callback: (data: { message: Record<string, unknown>; timestamp: number }) => void): void {
  socket?.on('session-message', callback);
}

export function onSessionEvent(callback: (data: { event: Record<string, unknown>; timestamp: number }) => void): void {
  socket?.on('session-event', callback);
}

export function onSessionDeath(callback: (data: { timestamp: number }) => void): void {
  socket?.on('session-death', callback);
}

export function onMetadataUpdated(callback: (data: { metadata: Record<string, unknown> }) => void): void {
  socket?.on('metadata-updated', callback);
}

export function onAgentStateUpdated(callback: (data: { state: Record<string, unknown> }) => void): void {
  socket?.on('agent-state-updated', callback);
}

export function onAgentList(callback: (data: { agents: Array<{ id: string; name: string }> }) => void): void {
  socket?.on('agent-list', callback);
}

export function onPlanUpdate(callback: (data: { plan: { steps?: string[]; currentStep?: number } }) => void): void {
  socket?.on('plan-update', callback);
}

export function onDebugOutput(callback: (data: { output: string }) => void): void {
  socket?.on('debug-output', callback);
}
