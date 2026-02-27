import { io, type Socket } from 'socket.io-client';
import { logger } from '../ui/logger';

interface ApiSessionOptions {
  sessionId: string;
  serverUrl: string;
  token: string;
}

type MessageHandler = (message: { content: { text: string }; meta?: Record<string, unknown> }) => void;

export class ApiSessionClient {
  private socket: Socket;
  private sessionId: string;
  private messageHandlers: MessageHandler[] = [];

  constructor(opts: ApiSessionOptions) {
    this.sessionId = opts.sessionId;
    this.socket = io(opts.serverUrl, {
      auth: { token: opts.token },
      query: { sessionId: opts.sessionId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      logger.debug(`[apiSession] Connected to server for session ${this.sessionId}`);
      this.socket.emit('join-session', { sessionId: this.sessionId });
    });

    this.socket.on('user-message', (message: unknown) => {
      for (const handler of this.messageHandlers) {
        handler(message as { content: { text: string }; meta?: Record<string, unknown> });
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.debug(`[apiSession] Disconnected: ${reason}`);
    });
  }

  onUserMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  sendSessionMessage(message: Record<string, unknown>): void {
    this.socket.emit('session-message', {
      sessionId: this.sessionId,
      message,
      timestamp: Date.now(),
    });
  }

  sendSessionEvent(event: { type: string; mode?: string }): void {
    this.socket.emit('session-event', {
      sessionId: this.sessionId,
      event,
      timestamp: Date.now(),
    });
  }

  sendSessionDeath(): void {
    this.socket.emit('session-death', {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  updateMetadata(updater: (current: Record<string, unknown>) => Record<string, unknown>): void {
    this.socket.emit('update-metadata', {
      sessionId: this.sessionId,
      metadata: updater({}),
      timestamp: Date.now(),
    });
  }

  updateAgentState(updater: (current: Record<string, unknown>) => Record<string, unknown>): void {
    this.socket.emit('update-agent-state', {
      sessionId: this.sessionId,
      state: updater({}),
      timestamp: Date.now(),
    });
  }

  sendAgentList(agents: Array<{ id: string; name: string }>): void {
    this.socket.emit('agent-list', { sessionId: this.sessionId, agents });
  }

  sendPlanUpdate(plan: { steps?: string[]; currentStep?: number }): void {
    this.socket.emit('plan-update', { sessionId: this.sessionId, plan });
  }

  sendDebugOutput(output: string): void {
    this.socket.emit('debug-output', { sessionId: this.sessionId, output });
  }

  async flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.socket.connected) {
        this.socket.volatile.emit('flush', {}, () => resolve());
        setTimeout(resolve, 500);
      } else {
        resolve();
      }
    });
  }

  async close(): Promise<void> {
    this.socket.disconnect();
  }
}
