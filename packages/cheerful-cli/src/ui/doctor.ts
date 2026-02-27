import os from 'node:os';
import chalk from 'chalk';
import { configuration } from '../configuration';
import { readSettings, readCredentials } from '../persistence';

export function getEnvironmentInfo(): Record<string, unknown> {
  return {
    os: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cheerfulVersion: configuration.version,
    cheerfulHomeDir: configuration.cheerfulHomeDir,
    serverUrl: configuration.serverUrl,
    cursorApiBaseUrl: configuration.cursorApiBaseUrl,
  };
}

export async function runDoctorCommand(scope?: string): Promise<void> {
  console.log(chalk.bold('\nCheerful Doctor'));
  console.log(chalk.gray('─'.repeat(50)));

  const envInfo = getEnvironmentInfo();
  console.log(`  OS:             ${envInfo.os} (${envInfo.arch})`);
  console.log(`  Node:           ${envInfo.nodeVersion}`);
  console.log(`  Cheerful:       ${envInfo.cheerfulVersion}`);
  console.log(`  Home Dir:       ${envInfo.cheerfulHomeDir}`);
  console.log(`  Server:         ${envInfo.serverUrl}`);
  console.log(`  Cursor API:     ${envInfo.cursorApiBaseUrl}`);

  const credentials = await readCredentials();
  console.log(`  Auth:           ${credentials ? chalk.green('Authenticated') : chalk.red('Not authenticated')}`);

  const settings = await readSettings();
  console.log(`  Machine ID:     ${settings.machineId || chalk.yellow('Not set')}`);
  console.log(`  Cursor API Key: ${settings.cursorApiKey ? chalk.green('Configured') : chalk.red('Not configured')}`);
  console.log(`  Default Repo:   ${settings.defaultRepository || chalk.gray('Not set')}`);

  if (scope === 'daemon') {
    console.log(chalk.bold('\nDaemon Status:'));
    console.log(`  (Daemon diagnostics not yet implemented)`);
  }

  console.log('');
}
