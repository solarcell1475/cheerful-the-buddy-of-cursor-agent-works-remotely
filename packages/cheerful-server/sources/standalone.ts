import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './utils/log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];

if (command === 'migrate') {
  log('Running database migrations...');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || `file:${process.env.DATA_DIR || '/data'}/cheerful.db`,
      },
    });
    log('Migrations complete');
  } catch (err) {
    log({ module: 'standalone', level: 'error' }, `Migration failed: ${err}`);
    process.exit(1);
  }
} else if (command === 'serve') {
  await import('./main.js');
} else {
  console.log('Usage: standalone.ts <migrate|serve>');
  process.exit(1);
}
