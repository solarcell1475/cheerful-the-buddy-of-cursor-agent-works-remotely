import { CursorApiClient } from './cursorApiClient';
import type { AgentInfo, ConversationEntry, ThinkingCallback } from './types';
import { logger } from '../ui/logger';

export interface CursorRemoteOptions {
  cursorApi: CursorApiClient;
  agentId: string | null;
  signal?: AbortSignal;

  nextMessage: () => Promise<{ message: string; model?: string } | null>;
  onReady: () => void;
  onThinkingChange?: ThinkingCallback;
  onMessage: (entry: ConversationEntry) => void;
  onStatusChange?: (status: string, agent: AgentInfo) => void;

  repository: string;
  ref?: string;
  model?: string;
  autoCreatePr?: boolean;
}

const POLL_INTERVAL_MS = 3000;

/**
 * Remote-mode handler for Cursor Cloud Agents.
 * Receives messages from the mobile app via cheerful-server,
 * dispatches them to the Cursor API, and relays responses back.
 *
 * Replaces Happy's claudeRemote which used the Claude SDK query() stream.
 */
export async function cursorRemote(opts: CursorRemoteOptions): Promise<void> {
  const {
    cursorApi,
    signal,
    nextMessage,
    onReady,
    onThinkingChange,
    onMessage,
    onStatusChange,
    repository,
    ref,
    model,
    autoCreatePr,
  } = opts;

  let agentId = opts.agentId;
  let lastConvLength = 0;

  while (true) {
    if (signal?.aborted) break;

    onReady();
    const incoming = await nextMessage();
    if (!incoming) break;

    onThinkingChange?.(true);

    try {
      if (!agentId) {
        const agent = await cursorApi.launchAgent({
          prompt: incoming.message,
          repository,
          ref,
          model: incoming.model ?? model,
          autoCreatePr,
        });
        agentId = agent.id;
        lastConvLength = 0;
        logger.debug(`[cursorRemote] New agent launched: ${agentId}`);
        onStatusChange?.('CREATING', agent);
      } else {
        await cursorApi.sendFollowUp(agentId, incoming.message);
        logger.debug(`[cursorRemote] Follow-up sent to ${agentId}`);
      }

      let done = false;
      while (!done) {
        if (signal?.aborted) break;
        await sleep(POLL_INTERVAL_MS);

        const info = await cursorApi.getAgent(agentId);
        onStatusChange?.(info.status, info);

        const conversation = await cursorApi.getConversation(agentId);
        if (conversation.length > lastConvLength) {
          const newEntries = conversation.slice(lastConvLength);
          lastConvLength = conversation.length;
          for (const entry of newEntries) {
            onMessage(entry);
          }
        }

        if (info.status !== 'CREATING' && info.status !== 'RUNNING') {
          done = true;
        }
      }
    } catch (err) {
      logger.debug(`[cursorRemote] Error: ${err}`);
    } finally {
      onThinkingChange?.(false);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
