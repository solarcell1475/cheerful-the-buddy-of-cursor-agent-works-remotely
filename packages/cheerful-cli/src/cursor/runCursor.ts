import os from 'node:os';
import { randomUUID } from 'node:crypto';

import { ApiClient } from '../api/api';
import { logger } from '../ui/logger';
import { loop } from './loop';
import type { AgentMode } from './types';
import { CursorApiClient } from './cursorApiClient';
import { createMockLocalAdapter } from './mockLocalAdapter';
import { MessageQueue } from '../utils/MessageQueue';
import { readSettings, type Credentials } from '../persistence';
import { configuration } from '../configuration';
import { Session } from './session';

import packageJson from '../../package.json';

export interface StartOptions {
  model?: string;
  repository?: string;
  ref?: string;
  startingMode?: AgentMode;
  shouldStartDaemon?: boolean;
  startedBy?: 'daemon' | 'terminal';
  autoCreatePr?: boolean;
}

export async function runCursor(
  credentials: Credentials,
  options: StartOptions = {},
): Promise<void> {
  logger.debug('[CURSOR] ===== CURSOR MODE STARTING =====');

  const sessionTag = randomUUID();

  if (options.startedBy === 'daemon' && options.startingMode === 'local') {
    throw new Error(
      'Daemon-spawned sessions cannot use local/interactive mode. ' +
      'Use --cheerful-starting-mode remote or spawn from terminal.',
    );
  }

  const api = await ApiClient.create(credentials);

  const settings = await readSettings();
  const machineId = settings?.machineId;
  if (!machineId) {
    console.error(
      '[START] No machine ID found. Please run "cheerful auth login" first.',
    );
    process.exit(1);
  }

  await api.getOrCreateMachine({
    machineId,
    metadata: {
      host: os.hostname(),
      os: os.platform(),
      version: packageJson.version,
    },
  });

  const metadata = {
    repository: options.repository,
    ref: options.ref,
    host: os.hostname(),
    version: packageJson.version,
    os: os.platform(),
    machineId,
    homeDir: os.homedir(),
    startedFromDaemon: options.startedBy === 'daemon',
    hostPid: process.pid,
    startedBy: (options.startedBy || 'terminal') as 'daemon' | 'terminal',
    lifecycleState: 'running' as const,
    lifecycleStateSince: Date.now(),
    flavor: 'cursor' as const,
  };

  const state = {
    controlledByUser: options.startingMode !== 'remote',
    isThinking: false,
  };

  const response = await api.getOrCreateSession({
    tag: sessionTag,
    metadata,
    state,
  });

  if (!response) {
    console.error('[START] Failed to create session - server unreachable');
    process.exit(1);
  }

  logger.debug(`Session created: ${response.id}`);

  const session = api.sessionSyncClient(response);

  const useMockAgent = process.env.CHEERFUL_USE_MOCK_AGENT === 'true' || process.env.CHEERFUL_USE_MOCK_AGENT === '1';
  const cursorApiKey = settings?.cursorApiKey;

  if (!useMockAgent && !cursorApiKey) {
    console.error(
      'No Cursor API key configured. Run "cheerful auth setup-cursor" to configure, or set CHEERFUL_USE_MOCK_AGENT=1 to use the local mock.',
    );
    process.exit(1);
  }

  const cursorApi = useMockAgent
    ? createMockLocalAdapter(session, response.id)
    : new CursorApiClient({
        apiKey: cursorApiKey!,
        baseUrl: configuration.cursorApiBaseUrl,
      });

  if (useMockAgent) {
    console.error('[Cheerful] Using mock local agent — set CHEERFUL_USE_MOCK_AGENT=0 and add a Cursor API key for real agents.');
  }

  session.updateAgentState((current: Record<string, unknown>) => ({
    ...current,
    controlledByUser: options.startingMode !== 'remote',
  }));

  const messageQueue = new MessageQueue();

  session.onUserMessage((message: { content: { text: string } }) => {
    messageQueue.push(message.content.text);
    logger.debug(`User message queued: ${message.content.text.slice(0, 80)}`);
  });

  let currentSession: Session | null = null;

  const cleanup = async () => {
    logger.debug('[START] Cleaning up...');
    try {
      currentSession?.cleanup();

      session.updateMetadata((current: Record<string, unknown>) => ({
        ...current,
        lifecycleState: 'archived',
        lifecycleStateSince: Date.now(),
      }));

      session.sendSessionDeath();
      await session.flush();
      await session.close();

      logger.debug('[START] Cleanup complete');
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  const repository = options.repository;
  if (!repository) {
    console.error(
      'Repository URL required. Use --repo <url> or configure a default.',
    );
    process.exit(1);
  }

  const exitCode = await loop({
    repository,
    ref: options.ref,
    model: options.model,
    startingMode: options.startingMode,
    api,
    session,
    cursorApi,
    messageQueue,
    autoCreatePr: options.autoCreatePr,
    onModeChange: (newMode) => {
      session.sendSessionEvent({ type: 'switch', mode: newMode });
      session.updateAgentState((current: Record<string, unknown>) => ({
        ...current,
        controlledByUser: newMode === 'local',
      }));
    },
    onSessionReady: (sessionInstance) => {
      currentSession = sessionInstance;
    },
  });

  currentSession?.cleanup();
  session.sendSessionDeath();
  await session.flush();
  await session.close();

  process.exit(exitCode);
}
