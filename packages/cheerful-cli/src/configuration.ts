import os from 'node:os';
import path from 'node:path';

function resolveCheerfulHomeDir(): string {
  return process.env.CHEERFUL_HOME || path.join(os.homedir(), '.cheerful');
}

export const configuration = {
  cheerfulHomeDir: resolveCheerfulHomeDir(),
  serverUrl: process.env.CHEERFUL_SERVER_URL || 'https://api.cheerful.engineering',
  cursorApiBaseUrl: process.env.CURSOR_API_BASE_URL || 'https://api.cursor.com',
  version: '0.1.0',
};
