import axios, { type AxiosInstance } from 'axios';

const CURSOR_API_BASE = 'https://api.cursor.com';

export interface AgentInfo {
  id: string;
  name: string;
  status: string;
  source: { repository: string; ref?: string };
  target?: { branchName?: string; prUrl?: string; url?: string; autoCreatePr?: boolean };
  summary?: string;
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  type: 'user_message' | 'assistant_message';
  text: string;
}

export class CursorClient {
  private http: AxiosInstance;

  constructor(apiKey: string, baseUrl?: string) {
    this.http = axios.create({
      baseURL: baseUrl || CURSOR_API_BASE,
      auth: { username: apiKey, password: '' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
  }

  async launch(opts: {
    prompt: string;
    repository: string;
    ref?: string;
    model?: string;
    autoCreatePr?: boolean;
    branchName?: string;
  }): Promise<AgentInfo> {
    const body: Record<string, unknown> = {
      prompt: { text: opts.prompt },
      source: {
        repository: opts.repository,
        ...(opts.ref && { ref: opts.ref }),
      },
    };
    if (opts.model) body.model = opts.model;
    if (opts.autoCreatePr || opts.branchName) {
      body.target = {
        ...(opts.autoCreatePr !== undefined && { autoCreatePr: opts.autoCreatePr }),
        ...(opts.branchName && { branchName: opts.branchName }),
      };
    }
    const { data } = await this.http.post('/v0/agents', body);
    return data;
  }

  async list(opts?: { limit?: number; cursor?: string; prUrl?: string }): Promise<{ agents: AgentInfo[]; nextCursor?: string }> {
    const params: Record<string, string | number> = {};
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.cursor) params.cursor = opts.cursor;
    if (opts?.prUrl) params.prUrl = opts.prUrl;
    const { data } = await this.http.get('/v0/agents', { params });
    return data;
  }

  async get(agentId: string): Promise<AgentInfo> {
    const { data } = await this.http.get(`/v0/agents/${agentId}`);
    return data;
  }

  async conversation(agentId: string): Promise<ConversationMessage[]> {
    const { data } = await this.http.get(`/v0/agents/${agentId}/conversation`);
    return data.messages ?? [];
  }

  async followup(agentId: string, text: string): Promise<void> {
    await this.http.post(`/v0/agents/${agentId}/followup`, { prompt: { text } });
  }

  async stop(agentId: string): Promise<void> {
    await this.http.post(`/v0/agents/${agentId}/stop`);
  }

  async delete(agentId: string): Promise<void> {
    await this.http.delete(`/v0/agents/${agentId}`);
  }

  async models(): Promise<string[]> {
    const { data } = await this.http.get('/v0/models');
    return data.models ?? [];
  }

  async repositories(): Promise<Array<{ owner: string; name: string; repository: string }>> {
    const { data } = await this.http.get('/v0/repositories');
    return data.repositories ?? [];
  }

  async me(): Promise<{ apiKeyName: string; createdAt: string; userEmail: string }> {
    const { data } = await this.http.get('/v0/me');
    return data;
  }
}
