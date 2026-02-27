import Fastify from 'fastify';
import { log } from '../../utils/log';

export async function startMetricsServer(): Promise<void> {
  const metricsPort = parseInt(process.env.METRICS_PORT || '9090', 10);

  const app = Fastify();

  app.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }));
  app.get('/metrics', async () => ({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now(),
  }));

  try {
    await app.listen({ port: metricsPort, host: '0.0.0.0' });
    log({ module: 'metrics' }, `Metrics server listening on port ${metricsPort}`);
  } catch (err) {
    log({ module: 'metrics', level: 'warn' }, `Metrics server failed to start: ${err}`);
  }
}

export function startDatabaseMetricsUpdater(): void {
  // Periodic DB metrics collection placeholder
}
