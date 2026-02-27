interface CachedSession {
  sessionId: string;
  lastActivity: number;
  metadata: Record<string, unknown>;
}

class ActivityCache {
  private cache = new Map<string, CachedSession>();

  get(sessionId: string): CachedSession | undefined {
    return this.cache.get(sessionId);
  }

  set(sessionId: string, data: Partial<CachedSession>): void {
    const existing = this.cache.get(sessionId);
    this.cache.set(sessionId, {
      sessionId,
      lastActivity: Date.now(),
      metadata: {},
      ...existing,
      ...data,
    });
  }

  remove(sessionId: string): void {
    this.cache.delete(sessionId);
  }

  getAll(): CachedSession[] {
    return Array.from(this.cache.values());
  }

  shutdown(): void {
    this.cache.clear();
  }
}

export const activityCache = new ActivityCache();
