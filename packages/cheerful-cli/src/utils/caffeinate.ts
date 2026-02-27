import { spawn, type ChildProcess } from 'node:child_process';
import os from 'node:os';

let caffeinateProcess: ChildProcess | null = null;

export function startCaffeinate(): boolean {
  if (os.platform() !== 'darwin') return false;
  try {
    caffeinateProcess = spawn('caffeinate', ['-i'], {
      stdio: 'ignore',
      detached: true,
    });
    caffeinateProcess.unref();
    return true;
  } catch {
    return false;
  }
}

export function stopCaffeinate(): void {
  if (caffeinateProcess) {
    caffeinateProcess.kill();
    caffeinateProcess = null;
  }
}
