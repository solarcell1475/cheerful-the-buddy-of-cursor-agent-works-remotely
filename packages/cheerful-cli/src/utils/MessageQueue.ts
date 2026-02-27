interface QueueEntry {
  message: string;
  resolve: () => void;
}

/**
 * Simple async message queue for serializing user input.
 * Messages are pushed by the Socket.IO listener and consumed by the loop.
 */
export class MessageQueue {
  private queue: QueueEntry[] = [];
  private waiters: Array<(entry: { message: string } | null) => void> = [];
  private closed = false;

  push(message: string): void {
    const entry = { message } as QueueEntry;

    if (this.waiters.length > 0) {
      const waiter = this.waiters.shift()!;
      waiter({ message });
    } else {
      this.queue.push(entry);
    }
  }

  async next(): Promise<{ message: string } | null> {
    if (this.closed) return null;

    if (this.queue.length > 0) {
      const entry = this.queue.shift()!;
      return { message: entry.message };
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  close(): void {
    this.closed = true;
    for (const waiter of this.waiters) {
      waiter(null);
    }
    this.waiters = [];
  }
}
