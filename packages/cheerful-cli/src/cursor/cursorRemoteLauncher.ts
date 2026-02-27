import type { Session } from './session';
import { cursorRemote } from './cursorRemote';
import { logger } from '../ui/logger';
import { parseSpecialCommand } from '../parsers/specialCommands';

interface RemoteLauncherOptions {
  repository: string;
  ref?: string;
  model?: string;
  autoCreatePr?: boolean;
}

type RemoteResult = 'switch' | 'exit';

/**
 * Remote-mode launcher: receives commands from the mobile app via cheerful-server
 * and dispatches them to the Cursor Cloud Agents API.
 *
 * Returns 'switch' to go back to local mode, or 'exit' to quit.
 */
export async function cursorRemoteLauncher(
  session: Session,
  opts: RemoteLauncherOptions,
): Promise<RemoteResult> {
  logger.debug('[cursorRemoteLauncher] Starting remote mode');

  const abortController = new AbortController();

  let switchRequested = false;

  const onKeypress = () => {
    switchRequested = true;
    abortController.abort();
  };

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', onKeypress);
  }

  try {
    await cursorRemote({
      cursorApi: session.cursorApi,
      agentId: session.agentId,
      signal: abortController.signal,
      repository: opts.repository,
      ref: opts.ref,
      model: opts.model,
      autoCreatePr: opts.autoCreatePr,
      nextMessage: async () => {
        const next = await session.messageQueue.next();
        if (!next) return null;

        const special = parseSpecialCommand(next.message);

        if (special.type === 'switch') {
          switchRequested = true;
          abortController.abort();
          return null;
        }

        if (special.type === 'clear') {
          session.client.sendSessionDeath();
          logger.debug('[cursorRemoteLauncher] /clear: session ended');
          return null;
        }

        if (special.type === 'exit') {
          abortController.abort();
          return null;
        }

        return { message: next.message, model: opts.model };
      },
      onReady: () => {
        logger.debug('[cursorRemoteLauncher] Ready for messages');
      },
      onThinkingChange: (thinking) => session.updateThinking(thinking),
      onMessage: (entry) => {
        session.client.sendSessionMessage({
          type: 'text',
          role: entry.type === 'assistant_message' ? 'assistant' : 'user',
          content: { text: entry.text },
        });
      },
      onStatusChange: (status, agent) => {
        session.client.sendSessionMessage({
          type: 'agent_status',
          agentId: agent.id,
          status,
          summary: agent.summary,
          prUrl: agent.prUrl,
          branchName: agent.branchName,
        });
      },
    });
  } finally {
    if (process.stdin.isTTY) {
      process.stdin.removeListener('data', onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
  }

  return switchRequested ? 'switch' : 'exit';
}
