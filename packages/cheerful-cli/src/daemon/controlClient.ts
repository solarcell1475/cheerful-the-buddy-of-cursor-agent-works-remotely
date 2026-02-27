import { readDaemonState, clearDaemonState } from './run';
import { configuration } from '../configuration';
import { logger } from '../ui/logger';

export async function checkIfDaemonRunningAndCleanupStaleState(): Promise<boolean> {
  const state = readDaemonState();
  if (!state) return false;

  try {
    process.kill(state.pid, 0);
    return true;
  } catch {
    clearDaemonState();
    return false;
  }
}

export async function isDaemonRunningCurrentlyInstalledHappyVersion(): Promise<boolean> {
  const state = readDaemonState();
  if (!state) return false;

  try {
    process.kill(state.pid, 0);
    return state.version === configuration.version;
  } catch {
    clearDaemonState();
    return false;
  }
}

export async function stopDaemon(): Promise<void> {
  const state = readDaemonState();
  if (!state) {
    console.log('No daemon running');
    return;
  }

  try {
    process.kill(state.pid, 'SIGTERM');
    clearDaemonState();
    console.log('Daemon stopped');
  } catch {
    clearDaemonState();
    console.log('Daemon already stopped');
  }
}

export async function listDaemonSessions(): Promise<unknown[]> {
  logger.debug('[controlClient] listDaemonSessions not yet implemented');
  return [];
}

export async function stopDaemonSession(sessionId: string): Promise<boolean> {
  logger.debug(`[controlClient] stopDaemonSession ${sessionId} not yet implemented`);
  return false;
}
