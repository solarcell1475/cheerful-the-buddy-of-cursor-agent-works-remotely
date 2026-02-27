import fs from 'node:fs';
import path from 'node:path';
import { configuration } from '../configuration';

class Logger {
  private logFile: string | null = null;

  get logFilePath(): string | null {
    return this.logFile;
  }

  constructor() {
    try {
      const logDir = path.join(configuration.cheerfulHomeDir, 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(logDir, `cheerful-${timestamp}.log`);
    } catch {
      // Logging not available
    }
  }

  debug(...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
    this.writeToFile('DEBUG', args);
  }

  info(...args: unknown[]): void {
    console.log(...args);
    this.writeToFile('INFO', args);
  }

  warn(...args: unknown[]): void {
    console.warn(...args);
    this.writeToFile('WARN', args);
  }

  error(...args: unknown[]): void {
    console.error(...args);
    this.writeToFile('ERROR', args);
  }

  infoDeveloper(...args: unknown[]): void {
    if (process.env.DEBUG) {
      console.log(...args);
    }
    this.writeToFile('INFO', args);
  }

  debugLargeJson(label: string, data: unknown): void {
    this.debug(label, JSON.stringify(data).slice(0, 500));
  }

  private writeToFile(level: string, args: unknown[]): void {
    if (!this.logFile) return;
    try {
      const line = `[${new Date().toISOString()}] [${level}] ${args.map(a =>
        typeof a === 'string' ? a : JSON.stringify(a)
      ).join(' ')}\n`;
      fs.appendFileSync(this.logFile, line);
    } catch {
      // ignore
    }
  }
}

export const logger = new Logger();
