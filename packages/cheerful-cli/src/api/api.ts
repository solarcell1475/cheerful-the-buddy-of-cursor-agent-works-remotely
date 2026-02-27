import axios, { type AxiosInstance } from 'axios';
import { configuration } from '../configuration';
import type { Credentials } from '../persistence';
import { ApiSessionClient } from './apiSession';
import { logger } from '../ui/logger';

export class ApiClient {
  private http: AxiosInstance;
  private credentials: Credentials;

  private constructor(credentials: Credentials) {
    this.credentials = credentials;
    this.http = axios.create({
      baseURL: configuration.serverUrl,
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15_000,
    });
  }

  static async create(credentials: Credentials): Promise<ApiClient> {
    return new ApiClient(credentials);
  }

  async getOrCreateMachine(opts: {
    machineId: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.http.post('/api/machines', opts);
    } catch (err) {
      logger.debug(`[api] getOrCreateMachine error: ${err}`);
    }
  }

  async getOrCreateSession(opts: {
    tag: string;
    metadata: Record<string, unknown>;
    state: Record<string, unknown>;
  }): Promise<{ id: string } | null> {
    try {
      const { data } = await this.http.post('/api/sessions', opts);
      return data;
    } catch (err) {
      logger.debug(`[api] getOrCreateSession error: ${err}`);
      return null;
    }
  }

  sessionSyncClient(session: { id: string }): ApiSessionClient {
    return new ApiSessionClient({
      sessionId: session.id,
      serverUrl: configuration.serverUrl,
      token: this.credentials.token,
    });
  }

  push() {
    return {
      sendToAllDevices: (title: string, body: string, data?: Record<string, unknown>) => {
        this.http.post('/api/push', { title, body, data }).catch((err) => {
          logger.debug(`[api] Push notification error: ${err}`);
        });
      },
    };
  }
}
