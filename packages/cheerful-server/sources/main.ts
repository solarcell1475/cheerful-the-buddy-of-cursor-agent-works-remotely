import { startApi } from './app/api/api';
import { log } from './utils/log';
import { awaitShutdown, onShutdown } from './utils/shutdown';
import { db } from './storage/db';
import { startTimeout } from './app/presence/timeout';
import { startMetricsServer, startDatabaseMetricsUpdater } from './app/monitoring/metrics';
import { activityCache } from './app/presence/sessionCache';
import { auth } from './app/auth/auth';
import { initEncrypt } from './modules/encrypt';

async function main() {
  await db.$connect();
  onShutdown('db', async () => {
    await db.$disconnect();
  });
  onShutdown('activity-cache', async () => {
    activityCache.shutdown();
  });

  await initEncrypt();
  await auth.init();

  await startApi();
  await startMetricsServer();
  startDatabaseMetricsUpdater();
  startTimeout();

  log('Ready');
  await awaitShutdown();
  log('Shutting down...');
}

process.on('uncaughtException', (error) => {
  log({ module: 'process-error', level: 'error' }, `Uncaught Exception: ${error.message}`);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  log({ module: 'process-error', level: 'error' }, `Unhandled Rejection: ${msg}`);
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).then(() => {
  process.exit(0);
});
