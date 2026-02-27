import chalk from 'chalk';
import inquirer from 'inquirer';
import { readSettings, writeSettings } from '../persistence';
import { CursorApiClient } from '../cursor/cursorApiClient';
import { configuration } from '../configuration';

export async function handleConnectCommand(args: string[]): Promise<void> {
  const subcommand = args[0];

  if (subcommand === 'cursor') {
    await connectCursorKey();
  } else if (subcommand === 'repo') {
    await connectDefaultRepo();
  } else {
    console.log(`
${chalk.bold('cheerful connect')} - Connect and configure integrations

${chalk.bold('Usage:')}
  cheerful connect cursor    Configure Cursor API key
  cheerful connect repo      Set default repository for agents
`);
  }
}

async function connectCursorKey(): Promise<void> {
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
    console.log(chalk.green(`Connected as: ${me.userEmail}`));
    await writeSettings({ cursorApiKey: answers.apiKey });
  } catch {
    console.error(chalk.red('Invalid Cursor API key.'));
    process.exit(1);
  }
}

async function connectDefaultRepo(): Promise<void> {
  const settings = await readSettings();

  if (!settings.cursorApiKey) {
    console.error(chalk.red('Cursor API key not configured. Run "cheerful connect cursor" first.'));
    process.exit(1);
  }

  const cursorApi = new CursorApiClient({
    apiKey: settings.cursorApiKey,
    baseUrl: configuration.cursorApiBaseUrl,
  });

  console.log(chalk.gray('Fetching your repositories...'));

  try {
    const repos = await cursorApi.listRepositories();

    if (repos.length === 0) {
      console.log(chalk.yellow('No repositories found. Enter a URL manually.'));
      const { url } = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Repository URL:',
        },
      ]);
      await writeSettings({ defaultRepository: url });
      console.log(chalk.green(`Default repository set to: ${url}`));
      return;
    }

    const { repo } = await inquirer.prompt([
      {
        type: 'list',
        name: 'repo',
        message: 'Select default repository:',
        choices: repos.map((r) => ({
          name: `${r.owner}/${r.name}`,
          value: r.repository,
        })),
      },
    ]);

    await writeSettings({ defaultRepository: repo });
    console.log(chalk.green(`Default repository set to: ${repo}`));
  } catch (err) {
    console.error(chalk.red('Failed to fetch repositories.'));
    process.exit(1);
  }
}
