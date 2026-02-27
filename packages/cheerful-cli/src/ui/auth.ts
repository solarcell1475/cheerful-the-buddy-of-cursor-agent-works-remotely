import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import {
  readCredentials,
  writeCredentials,
  readSettings,
  writeSettings,
  type Credentials,
} from '../persistence';
import { logger } from './logger';

export async function authAndSetupMachineIfNeeded(): Promise<{
  credentials: Credentials;
}> {
  let credentials = await readCredentials();

  if (!credentials) {
    console.log(chalk.yellow('Not authenticated. Please run "cheerful auth login" first.'));
    process.exit(1);
  }

  const settings = await readSettings();
  if (!settings.machineId) {
    const machineId = randomUUID();
    await writeSettings({ machineId });
    logger.debug(`Generated machine ID: ${machineId}`);
  }

  return { credentials };
}
