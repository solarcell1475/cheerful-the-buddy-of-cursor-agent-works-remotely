import { config } from '../constants/config';
import type { SessionInfo } from '../types/session';

export interface LoginResult {
  token: string;
  userId: string;
}

export async function loginWithPassword(
  serverUrl: string,
  username: string,
  password: string,
): Promise<LoginResult> {
  const base = serverUrl.trim().replace(/\/$/, '');
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Login failed (${res.status})`);
  }
  return res.json();
}

async function apiFetch<T>(
  path: string,
  token: string,
  baseUrl: string,
  options?: RequestInit,
): Promise<T> {
  const base = baseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function fetchSessions(token: string, baseUrl: string): Promise<SessionInfo[]> {
  const data = await apiFetch<{ sessions: SessionInfo[] }>('/api/sessions', token, baseUrl);
  return data.sessions;
}

export async function fetchSession(
  token: string,
  sessionId: string,
  baseUrl: string,
): Promise<SessionInfo & { messages: Array<{ payload: Record<string, unknown>; createdAt: string }> }> {
  return apiFetch(`/api/sessions/${sessionId}`, token, baseUrl);
}

export async function registerDevice(
  token: string,
  pushToken: string,
  baseUrl: string,
  deviceName?: string,
): Promise<void> {
  await apiFetch('/api/devices', token, baseUrl, {
    method: 'POST',
    body: JSON.stringify({ pushToken, deviceName }),
  });
}
