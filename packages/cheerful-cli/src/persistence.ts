import fs from 'node:fs';
import path from 'node:path';
import { configuration } from './configuration';

export interface Credentials {
  token: string;
  userId: string;
}

export interface Settings {
  machineId?: string;
  cursorApiKey?: string;
  chromeMode?: boolean;
  defaultRepository?: string;
  defaultRef?: string;
  autoCreatePr?: boolean;
}

function settingsPath(): string {
  return path.join(configuration.cheerfulHomeDir, 'settings.json');
}

function credentialsPath(): string {
  return path.join(configuration.cheerfulHomeDir, 'credentials.json');
}

function ensureDir(): void {
  fs.mkdirSync(configuration.cheerfulHomeDir, { recursive: true });
}

export async function readSettings(): Promise<Settings> {
  try {
    const data = fs.readFileSync(settingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function writeSettings(settings: Settings): Promise<void> {
  ensureDir();
  const existing = await readSettings();
  const merged = { ...existing, ...settings };
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf-8');
}

export async function readCredentials(): Promise<Credentials | null> {
  try {
    const data = fs.readFileSync(credentialsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function writeCredentials(creds: Credentials): Promise<void> {
  ensureDir();
  fs.writeFileSync(credentialsPath(), JSON.stringify(creds, null, 2), 'utf-8');
}

export async function clearCredentials(): Promise<void> {
  try {
    fs.unlinkSync(credentialsPath());
  } catch {
    // ignore
  }
}
