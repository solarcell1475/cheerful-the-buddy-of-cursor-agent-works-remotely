import { CursorApiClient } from './cursorApiClient';
import type { AgentInfo, ThinkingCallback } from './types';
import { logger } from '../ui/logger';

export interface CursorCloudOptions {
  cursorApi: CursorApiClient;
  prompt: string;
  repository: string;
  ref?: string;
  model?: string;
  autoCreatePr?: boolean;
  branchName?: string;
  signal?: AbortSignal;
  onThinkingChange?: ThinkingCallback;
  onAgentCreated?: (agent: AgentInfo) => void;
  onMessage?: (entry: { type: string; text: string }) => void;
  onStatusChange?: (status: string) => void;
}

const POLL_INTERVAL_MS = 3000;
const POLL_INTERVAL_FAST_MS = 1000;

/**
 * Manages a Cursor Cloud Agent lifecycle:
 * Launch -> Poll status -> Fetch conversation -> Complete
 *
 * Replaces Happy's claudeLocal which spawns a child process.
 */
export async function cursorCloud(opts: CursorCloudOptions): Promise<AgentInfo> {
  const {
    cursorApi,
    prompt,
    repository,
    ref,
    model,
    autoCreatePr,
    branchName,
    signal,
    onThinkingChange,
    onAgentCreated,
    onMessage,
    onStatusChange,
  } = opts;

  logger.debug('[cursorCloud] Launching agent...');
  onThinkingChange?.(true);

  const agent = await cursorApi.launchAgent({
    prompt,
    repository,
    ref,
    model,
    autoCreatePr,
    branchName,
  });

  logger.debug(`[cursorCloud] Agent created: ${agent.id} (${agent.status})`);
  onAgentCreated?.(agent);
  onStatusChange?.(agent.status);

  let lastConvLength = 0;
  let currentStatus = agent.status;

  while (currentStatus === 'CREATING' || currentStatus === 'RUNNING') {
    if (signal?.aborted) {
      logger.debug('[cursorCloud] Aborted, stopping agent');
      await cursorApi.stopAgent(agent.id).catch(() => {});
      onThinkingChange?.(false);
      break;
    }

    const interval = currentStatus === 'CREATING'
      ? POLL_INTERVAL_FAST_MS
      : POLL_INTERVAL_MS;

    await sleep(interval);

    try {
      const info = await cursorApi.getAgent(agent.id);
      if (info.status !== currentStatus) {
        currentStatus = info.status;
        logger.debug(`[cursorCloud] Status changed: ${currentStatus}`);
        onStatusChange?.(currentStatus);
      }

      const conversation = await cursorApi.getConversation(agent.id);
      if (conversation.length > lastConvLength) {
        const newEntries = conversation.slice(lastConvLength);
        lastConvLength = conversation.length;
        for (const entry of newEntries) {
          onMessage?.(entry);
        }
      }
    } catch (err) {
      logger.debug(`[cursorCloud] Poll error: ${err}`);
    }
  }

  onThinkingChange?.(false);

  const finalAgent = await cursorApi.getAgent(agent.id).catch(() => ({
    ...agent,
    status: currentStatus as AgentInfo['status'],
  }));

  logger.debug(`[cursorCloud] Agent finished: ${finalAgent.status}`);
  return finalAgent;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
