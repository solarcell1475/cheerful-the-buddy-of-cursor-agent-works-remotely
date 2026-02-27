import type { Session } from './session';
import type { LoopResult } from './types';
import { cursorCloud } from './cursorCloud';
import { logger } from '../ui/logger';

interface LauncherOptions {
  repository: string;
  ref?: string;
  model?: string;
  autoCreatePr?: boolean;
}

/**
 * Local-mode launcher: interacts with Cursor Cloud Agents via the terminal.
 * Waits for user input from the message queue, launches agents, and displays results.
 *
 * Returns 'switch' to enter remote mode, or 'exit' to quit.
 */
export async function cursorCloudLauncher(
  session: Session,
  opts: LauncherOptions,
): Promise<LoopResult> {
  logger.debug('[cursorCloudLauncher] Waiting for user input...');

  const abortController = new AbortController();

  const handleSwitch = () => {
    abortController.abort();
  };

  let switchRequested = false;

  session.client.onUserMessage((message) => {
    if (message.content?.text === '/switch') {
      switchRequested = true;
      handleSwitch();
    }
  });

  while (true) {
    const next = await session.messageQueue.next();
    if (!next) {
      return { type: 'exit', code: 0 };
    }

    if (next.message === '/switch') {
      return { type: 'switch' };
    }

    if (next.message === '/exit' || next.message === '/quit') {
      return { type: 'exit', code: 0 };
    }

    try {
      if (session.agentId) {
        await session.sendFollowUp(next.message);
      } else {
        await session.launchAgent(next.message, opts.repository, {
          ref: opts.ref,
          model: opts.model,
          autoCreatePr: opts.autoCreatePr,
        });
      }

      const agent = await cursorCloud({
        cursorApi: session.cursorApi,
        prompt: next.message,
        repository: opts.repository,
        ref: opts.ref,
        model: opts.model,
        autoCreatePr: opts.autoCreatePr,
        signal: abortController.signal,
        onThinkingChange: (thinking) => session.updateThinking(thinking),
        onMessage: (entry) => {
          session.client.sendSessionMessage({
            type: entry.type === 'assistant_message' ? 'text' : 'text',
            role: entry.type === 'assistant_message' ? 'assistant' : 'user',
            content: { text: entry.text },
          });
        },
        onStatusChange: (status) => {
          session.client.sendSessionMessage({
            type: 'agent_status',
            agentId: session.agentId ?? '',
            status,
          });
        },
      });

      session.agentId = agent.id;

      if (switchRequested) {
        return { type: 'switch' };
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        return { type: 'switch' };
      }
      logger.debug(`[cursorCloudLauncher] Error: ${err}`);
    }
  }
}
