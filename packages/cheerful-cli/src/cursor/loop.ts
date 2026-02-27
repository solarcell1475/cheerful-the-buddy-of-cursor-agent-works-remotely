import type { ApiSessionClient } from '../api/apiSession';
import type { ApiClient } from '../api/api';
import type { MessageQueue } from '../utils/MessageQueue';
import type { AgentMode, ICursorAgentAdapter } from './types';
import { Session } from './session';
import { cursorCloudLauncher } from './cursorCloudLauncher';
import { cursorRemoteLauncher } from './cursorRemoteLauncher';
import { logger } from '../ui/logger';

export interface LoopOptions {
  repository: string;
  ref?: string;
  model?: string;
  startingMode?: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  session: ApiSessionClient;
  api: ApiClient;
  cursorApi: ICursorAgentAdapter;
  messageQueue: MessageQueue;
  autoCreatePr?: boolean;
  onSessionReady?: (session: Session) => void;
}

export async function loop(opts: LoopOptions): Promise<number> {
  const session = new Session({
    client: opts.session,
    cursorApi: opts.cursorApi,
    messageQueue: opts.messageQueue,
    onModeChange: opts.onModeChange,
  });

  opts.onSessionReady?.(session);

  let mode: AgentMode = opts.startingMode ?? 'local';

  while (true) {
    logger.debug(`[loop] Iteration with mode: ${mode}`);

    switch (mode) {
      case 'local': {
        const result = await cursorCloudLauncher(session, {
          repository: opts.repository,
          ref: opts.ref,
          model: opts.model,
          autoCreatePr: opts.autoCreatePr,
        });
        switch (result.type) {
          case 'switch':
            mode = 'remote';
            opts.onModeChange(mode);
            break;
          case 'exit':
            return result.code ?? 0;
        }
        break;
      }

      case 'remote': {
        const reason = await cursorRemoteLauncher(session, {
          repository: opts.repository,
          ref: opts.ref,
          model: opts.model,
          autoCreatePr: opts.autoCreatePr,
        });
        switch (reason) {
          case 'exit':
            return 0;
          case 'switch':
            mode = 'local';
            opts.onModeChange(mode);
            break;
        }
        break;
      }
    }
  }
}
