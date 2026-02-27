type ShutdownHandler = () => Promise<void>;
const handlers: Map<string, ShutdownHandler> = new Map();
let shutdownResolve: (() => void) | null = null;

export function onShutdown(name: string, handler: ShutdownHandler): void {
  handlers.set(name, handler);
}

export async function awaitShutdown(): Promise<void> {
  return new Promise((resolve) => {
    shutdownResolve = resolve;

    const shutdown = async () => {
      for (const [name, handler] of handlers) {
        try {
          await handler();
        } catch (err) {
          console.error(`Shutdown handler "${name}" failed:`, err);
        }
      }
      resolve();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  });
}
