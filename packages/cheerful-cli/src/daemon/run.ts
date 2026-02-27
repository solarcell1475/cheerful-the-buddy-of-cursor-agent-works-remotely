import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { configuration } from '../configuration';
import { logger } from '../ui/logger';

export const initialMachineMetadata = {
  host: os.hostname(),
  os: os.platform(),
  arch: os.arch(),
  nodeVersion: process.version,
};

interface DaemonState {
  pid: number;
  port: number;
  version: string;
  startedAt: number;
}

function daemonStatePath(): string {
  return path.join(configuration.cheerfulHomeDir, 'daemon.json');
}

export async function startDaemon(): Promise<void> {
  logger.debug('[daemon] Starting daemon...');

  const port = 23847;

  const state: DaemonState = {
    pid: process.pid,
    port,
    version: configuration.version,
    startedAt: Date.now(),
  };

  fs.mkdirSync(configuration.cheerfulHomeDir, { recursive: true });
  fs.writeFileSync(daemonStatePath(), JSON.stringify(state, null, 2));

  logger.debug(`[daemon] Daemon started on port ${port}, pid ${process.pid}`);

  // Keep alive
  await new Promise(() => {
    setInterval(() => {
      logger.debug('[daemon] Heartbeat');
    }, 30_000);
  });
}

export function readDaemonState(): DaemonState | null {
  try {
    const data = fs.readFileSync(daemonStatePath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearDaemonState(): void {
  try {
    fs.unlinkSync(daemonStatePath());
  } catch {
    // ignore
  }
}
