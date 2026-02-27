import type { CursorAgentStatus } from '@cheerful/wire';

export interface AgentLaunchOptions {
  prompt: string;
  repository: string;
  ref?: string;
  prUrl?: string;
  model?: string;
  autoCreatePr?: boolean;
  branchName?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface ICursorAgentAdapter {
  launchAgent(opts: AgentLaunchOptions): Promise<AgentInfo>;
  sendFollowUp(agentId: string, text: string): Promise<void>;
  getAgent(agentId: string): Promise<AgentInfo>;
  getConversation(agentId: string): Promise<ConversationEntry[]>;
  stopAgent(agentId: string): Promise<void>;
}

export interface CursorApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: CursorAgentStatus;
  repository: string;
  ref?: string;
  branchName?: string;
  prUrl?: string;
  summary?: string;
  createdAt: string;
}

export interface ConversationEntry {
  id: string;
  type: 'user_message' | 'assistant_message';
  text: string;
}

export type AgentMode = 'local' | 'remote';

export interface LoopResult {
  type: 'switch' | 'exit';
  code?: number;
}

export type ThinkingCallback = (thinking: boolean) => void;
export type ModeChangeCallback = (mode: AgentMode) => void;
export type MessageCallback = (message: ConversationEntry) => void;
