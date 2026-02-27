import type { ApiSessionClient } from '../api/apiSession';
import type {
  ICursorAgentAdapter,
  AgentLaunchOptions,
  AgentInfo,
  ConversationEntry,
} from './types';

const MOCK_AGENT_ID = 'mock-local-agent-1';
const MOCK_AGENT_NAME = 'Cursor Agent (local mock)';

export function createMockLocalAdapter(
  sessionClient: ApiSessionClient,
  _sessionId: string,
): ICursorAgentAdapter {
  const conversationHistory: ConversationEntry[] = [];

  return {
    async launchAgent(opts: AgentLaunchOptions): Promise<AgentInfo> {
      sessionClient.sendAgentList([
        { id: MOCK_AGENT_ID, name: MOCK_AGENT_NAME },
      ]);
      sessionClient.sendPlanUpdate({
        steps: [
          'Step 1: Analyzing your request',
          'Step 2: Planning changes',
          'Step 3: Implementing (mock)',
        ],
        currentStep: 0,
      });
      sessionClient.sendDebugOutput(`[Mock] Launching agent for repo: ${opts.repository}`);
      sessionClient.sendDebugOutput(`[Mock] Prompt: ${opts.prompt.slice(0, 80)}...`);

      conversationHistory.push({
        id: `user-${Date.now()}`,
        type: 'user_message',
        text: opts.prompt,
      });

      const reply = `Mock response: I received your request: "${opts.prompt.slice(0, 60)}...". This is a local mock — connect a real Cursor agent for full functionality.`;
      conversationHistory.push({
        id: `assistant-${Date.now()}`,
        type: 'assistant_message',
        text: reply,
      });

      sessionClient.sendPlanUpdate({
        steps: [
          'Step 1: Analyzing your request',
          'Step 2: Planning changes',
          'Step 3: Implementing (mock)',
        ],
        currentStep: 3,
      });
      sessionClient.sendDebugOutput('[Mock] Agent completed (mock).');

      return {
        id: MOCK_AGENT_ID,
        name: MOCK_AGENT_NAME,
        status: 'COMPLETED',
        repository: opts.repository,
        createdAt: new Date().toISOString(),
      };
    },

    async sendFollowUp(agentId: string, text: string): Promise<void> {
      sessionClient.sendDebugOutput(`[Mock] Follow-up to ${agentId}: ${text.slice(0, 60)}...`);
      conversationHistory.push({
        id: `user-${Date.now()}`,
        type: 'user_message',
        text,
      });
      const reply = `Mock: Got your message — "${text.slice(0, 40)}...". Use a real Cursor agent for actual work.`;
      conversationHistory.push({
        id: `assistant-${Date.now()}`,
        type: 'assistant_message',
        text: reply,
      });
    },

    async getAgent(_agentId: string): Promise<AgentInfo> {
      return {
        id: MOCK_AGENT_ID,
        name: MOCK_AGENT_NAME,
        status: 'COMPLETED',
        repository: '',
        createdAt: new Date().toISOString(),
      };
    },

    async getConversation(_agentId: string): Promise<ConversationEntry[]> {
      return [...conversationHistory];
    },

    async stopAgent(_agentId: string): Promise<void> {
      sessionClient.sendDebugOutput('[Mock] Agent stop requested.');
    },
  };
}
