import type { ApiSessionClient } from '../api/apiSession';
import type { ICursorAgentAdapter } from './types';
import type { AgentInfo, ConversationEntry, ThinkingCallback } from './types';
import type { MessageQueue } from '../utils/MessageQueue';
import { logger } from '../ui/logger';

export interface SessionOptions {
  client: ApiSessionClient;
  cursorApi: ICursorAgentAdapter;
  messageQueue: MessageQueue;
  onModeChange: (mode: 'local' | 'remote') => void;
  onThinkingChange?: ThinkingCallback;
}

export class Session {
  readonly client: ApiSessionClient;
  readonly cursorApi: ICursorAgentAdapter;
  readonly messageQueue: MessageQueue;
  private onModeChange: (mode: 'local' | 'remote') => void;
  private onThinkingChange?: ThinkingCallback;

  private _agentId: string | null = null;
  private _lastConversationLength = 0;
  private _pollInterval: ReturnType<typeof setInterval> | null = null;
  private _thinking = false;

  constructor(opts: SessionOptions) {
    this.client = opts.client;
    this.cursorApi = opts.cursorApi;
    this.messageQueue = opts.messageQueue;
    this.onModeChange = opts.onModeChange;
    this.onThinkingChange = opts.onThinkingChange;
  }

  get agentId(): string | null {
    return this._agentId;
  }

  set agentId(id: string | null) {
    this._agentId = id;
  }

  get isThinking(): boolean {
    return this._thinking;
  }

  updateThinking(value: boolean): void {
    if (this._thinking !== value) {
      this._thinking = value;
      this.onThinkingChange?.(value);
      logger.debug(`[Session] Thinking: ${value}`);
    }
  }

  async launchAgent(prompt: string, repository: string, opts?: {
    ref?: string;
    model?: string;
    autoCreatePr?: boolean;
    branchName?: string;
  }): Promise<AgentInfo> {
    this.updateThinking(true);
    const agent = await this.cursorApi.launchAgent({
      prompt,
      repository,
      ref: opts?.ref,
      model: opts?.model,
      autoCreatePr: opts?.autoCreatePr,
      branchName: opts?.branchName,
    });
    this._agentId = agent.id;
    logger.debug(`[Session] Agent launched: ${agent.id}`);
    return agent;
  }

  async sendFollowUp(text: string): Promise<void> {
    if (!this._agentId) throw new Error('No active agent');
    await this.cursorApi.sendFollowUp(this._agentId, text);
    logger.debug(`[Session] Follow-up sent to agent ${this._agentId}`);
  }

  async pollStatus(): Promise<AgentInfo | null> {
    if (!this._agentId) return null;
    try {
      const info = await this.cursorApi.getAgent(this._agentId);
      const wasThinking = this._thinking;
      const isActive = info.status === 'CREATING' || info.status === 'RUNNING';
      this.updateThinking(isActive);

      if (wasThinking && !isActive) {
        logger.debug(`[Session] Agent completed: ${info.status}`);
      }
      return info;
    } catch (err) {
      logger.debug(`[Session] Poll error: ${err}`);
      return null;
    }
  }

  async getNewMessages(): Promise<ConversationEntry[]> {
    if (!this._agentId) return [];
    try {
      const messages = await this.cursorApi.getConversation(this._agentId);
      const newMessages = messages.slice(this._lastConversationLength);
      this._lastConversationLength = messages.length;
      return newMessages;
    } catch {
      return [];
    }
  }

  startPolling(intervalMs: number = 3000): void {
    this.stopPolling();
    this._pollInterval = setInterval(async () => {
      await this.pollStatus();
      await this.getNewMessages();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  async stopAgent(): Promise<void> {
    if (!this._agentId) return;
    try {
      await this.cursorApi.stopAgent(this._agentId);
      this.updateThinking(false);
      logger.debug(`[Session] Agent stopped: ${this._agentId}`);
    } catch (err) {
      logger.debug(`[Session] Stop error: ${err}`);
    }
  }

  cleanup(): void {
    this.stopPolling();
    this.updateThinking(false);
  }
}
