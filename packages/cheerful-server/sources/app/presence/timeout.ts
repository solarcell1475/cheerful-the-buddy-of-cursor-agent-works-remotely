import { db } from '../../storage/db';
import { log } from '../../utils/log';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function startTimeout(): void {
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
      const stale = await db.session.findMany({
        where: {
          updatedAt: { lt: cutoff },
          metadata: { path: ['lifecycleState'], equals: 'running' },
        },
      });

      for (const session of stale) {
        await db.session.update({
          where: { id: session.id },
          data: {
            metadata: {
              ...(session.metadata as Record<string, unknown>),
              lifecycleState: 'archived',
              lifecycleStateSince: Date.now(),
            },
          },
        });
        log({ module: 'timeout' }, `Archived stale session: ${session.id}`);
      }
    } catch (err) {
      log({ module: 'timeout', level: 'error' }, `Timeout check failed: ${err}`);
    }
  }, 60_000);
}
