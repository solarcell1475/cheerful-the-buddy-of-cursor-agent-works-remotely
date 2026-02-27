import axios, { type AxiosInstance } from 'axios';
import type {
  AgentLaunchOptions,
  AgentInfo,
  ConversationEntry,
  CursorApiConfig,
} from './types';

const CURSOR_API_BASE = 'https://api.cursor.com';

export class CursorApiClient {
  private http: AxiosInstance;
  private config: CursorApiConfig;

  constructor(config: CursorApiConfig) {
    this.config = config;
    this.http = axios.create({
      baseURL: config.baseUrl || CURSOR_API_BASE,
      auth: { username: config.apiKey, password: '' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
  }

  async launchAgent(opts: AgentLaunchOptions): Promise<AgentInfo> {
    const body: Record<string, unknown> = {
      prompt: { text: opts.prompt },
      source: {
        repository: opts.repository,
        ...(opts.ref && { ref: opts.ref }),
        ...(opts.prUrl && { prUrl: opts.prUrl }),
      },
    };
    if (opts.model) body.model = opts.model;
    if (opts.autoCreatePr || opts.branchName) {
      body.target = {
        ...(opts.autoCreatePr !== undefined && { autoCreatePr: opts.autoCreatePr }),
        ...(opts.branchName && { branchName: opts.branchName }),
      };
    }
    if (opts.webhookUrl) {
      body.webhook = {
        url: opts.webhookUrl,
        ...(opts.webhookSecret && { secret: opts.webhookSecret }),
      };
    }

    const { data } = await this.http.post('/v0/agents', body);
    return this.mapAgent(data);
  }

  async getAgent(agentId: string): Promise<AgentInfo> {
    const { data } = await this.http.get(`/v0/agents/${agentId}`);
    return this.mapAgent(data);
  }

  async listAgents(opts?: {
    limit?: number;
    cursor?: string;
    prUrl?: string;
  }): Promise<{ agents: AgentInfo[]; nextCursor?: string }> {
    const params: Record<string, string | number> = {};
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.cursor) params.cursor = opts.cursor;
    if (opts?.prUrl) params.prUrl = opts.prUrl;

    const { data } = await this.http.get('/v0/agents', { params });
    return {
      agents: data.agents.map((a: Record<string, unknown>) => this.mapAgent(a)),
      nextCursor: data.nextCursor,
    };
  }

  async getConversation(agentId: string): Promise<ConversationEntry[]> {
    const { data } = await this.http.get(`/v0/agents/${agentId}/conversation`);
    return data.messages ?? [];
  }

  async sendFollowUp(agentId: string, text: string): Promise<void> {
    await this.http.post(`/v0/agents/${agentId}/followup`, {
      prompt: { text },
    });
  }

  async stopAgent(agentId: string): Promise<void> {
    await this.http.post(`/v0/agents/${agentId}/stop`);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.http.delete(`/v0/agents/${agentId}`);
  }

  async listModels(): Promise<string[]> {
    const { data } = await this.http.get('/v0/models');
    return data.models ?? [];
  }

  async listRepositories(): Promise<
    Array<{ owner: string; name: string; repository: string }>
  > {
    const { data } = await this.http.get('/v0/repositories');
    return data.repositories ?? [];
  }

  async getMe(): Promise<{
    apiKeyName: string;
    createdAt: string;
    userEmail: string;
  }> {
    const { data } = await this.http.get('/v0/me');
    return data;
  }

  private mapAgent(raw: Record<string, unknown>): AgentInfo {
    const source = raw.source as Record<string, string> | undefined;
    const target = raw.target as Record<string, unknown> | undefined;
    return {
      id: raw.id as string,
      name: raw.name as string,
      status: raw.status as AgentInfo['status'],
      repository: source?.repository ?? '',
      ref: source?.ref,
      branchName: target?.branchName as string | undefined,
      prUrl: target?.prUrl as string | undefined,
      summary: raw.summary as string | undefined,
      createdAt: raw.createdAt as string,
    };
  }
}
