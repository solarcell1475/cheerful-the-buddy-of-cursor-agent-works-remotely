export interface SessionInfo {
  id: string;
  tag: string;
  metadata: {
    repository?: string;
    ref?: string;
    host: string;
    version: string;
    os: string;
    machineId: string;
    lifecycleState: 'running' | 'paused' | 'archived';
    lifecycleStateSince: number;
    cursorAgentId?: string;
    cursorAgentStatus?: string;
    prUrl?: string;
    branchName?: string;
  };
  state: {
    controlledByUser: boolean;
    cursorAgentId?: string;
    isThinking: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  type: 'text' | 'agent_status' | 'error';
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  status?: string;
  prUrl?: string;
  timestamp: number;
}
