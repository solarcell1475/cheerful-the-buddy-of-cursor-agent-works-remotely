import chalk from 'chalk';
import inquirer from 'inquirer';
import open from 'open';
import {
  readCredentials,
  writeCredentials,
  clearCredentials,
  readSettings,
  writeSettings,
} from '../persistence';
import { CursorApiClient } from '../cursor/cursorApiClient';
import { configuration } from '../configuration';

export async function handleAuthCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === 'login') {
    await handleLogin(args.slice(1));
  } else if (subcommand === 'logout') {
    await handleLogout();
  } else if (subcommand === 'status') {
    await handleStatus();
  } else if (subcommand === 'setup-cursor') {
    await handleSetupCursor();
  } else {
    console.log(`
${chalk.bold('cheerful auth')} - Authentication management

${chalk.bold('Usage:')}
  cheerful auth login         Login to Cheerful server
  cheerful auth logout        Clear saved credentials
  cheerful auth status        Show authentication status
  cheerful auth setup-cursor  Configure Cursor API key
`);
  }
}

async function handleLogin(args: string[]): Promise<void> {
  const isForce = args.includes('--force');
  const existing = await readCredentials();

  if (existing && !isForce) {
    console.log(chalk.green('Already authenticated.'));
    console.log(chalk.gray('Use --force to re-authenticate.'));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'token',
      message: 'Enter your Cheerful auth token:',
    },
  ]);

  await writeCredentials({
    token: answers.token,
    userId: 'pending',
  });

  console.log(chalk.green('Authentication saved successfully.'));
}

async function handleLogout(): Promise<void> {
  await clearCredentials();
  console.log(chalk.green('Credentials cleared.'));
}

async function handleStatus(): Promise<void> {
  const credentials = await readCredentials();
  const settings = await readSettings();

  if (credentials) {
    console.log(chalk.green('Authenticated'));
    console.log(`  User ID: ${credentials.userId}`);
  } else {
    console.log(chalk.red('Not authenticated'));
  }

  if (settings.cursorApiKey) {
    console.log(chalk.green('Cursor API Key: Configured'));
    try {
      const cursorApi = new CursorApiClient({
        apiKey: settings.cursorApiKey,
        baseUrl: configuration.cursorApiBaseUrl,
      });
      const me = await cursorApi.getMe();
      console.log(`  Email: ${me.userEmail}`);
      console.log(`  Key Name: ${me.apiKeyName}`);
    } catch {
      console.log(chalk.yellow('  (Could not verify key)'));
    }
  } else {
    console.log(chalk.yellow('Cursor API Key: Not configured'));
    console.log(chalk.gray('  Run "cheerful auth setup-cursor" to configure'));
  }
}

async function handleSetupCursor(): Promise<void> {
  console.log(chalk.bold('\nCursor API Key Setup'));
  console.log(chalk.gray('Get your API key from: https://cursor.com/settings\n'));

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Cursor API key:',
      mask: '*',
    },
  ]);

  const cursorApi = new CursorApiClient({
    apiKey: answers.apiKey,
    baseUrl: configuration.cursorApiBaseUrl,
  });

  try {
    const me = await cursorApi.getMe();
    console.log(chalk.green(`\nVerified! Connected as: ${me.userEmail}`));
    await writeSettings({ cursorApiKey: answers.apiKey });
    console.log(chalk.green('API key saved successfully.'));
  } catch {
    console.error(chalk.red('Invalid API key. Please check and try again.'));
    process.exit(1);
  }
}
