#!/usr/bin/env node

import chalk from 'chalk';
import { runCursor, type StartOptions } from './cursor/runCursor';
import { logger } from './ui/logger';
import { readCredentials, readSettings } from './persistence';
import { authAndSetupMachineIfNeeded } from './ui/auth';
import { startDaemon } from './daemon/run';
import {
  checkIfDaemonRunningAndCleanupStaleState,
  isDaemonRunningCurrentlyInstalledHappyVersion,
  stopDaemon,
  listDaemonSessions,
  stopDaemonSession,
} from './daemon/controlClient';
import { runDoctorCommand } from './ui/doctor';
import { handleAuthCommand } from './commands/auth';
import { handleConnectCommand } from './commands/connect';
import { ApiClient } from './api/api';
import { configuration } from './configuration';

(async () => {
  const args = process.argv.slice(2);

  if (!args.includes('--version')) {
    logger.debug('Starting cheerful CLI with args: ', process.argv);
  }

  const subcommand = args[0];

  if (subcommand === 'doctor') {
    await runDoctorCommand();
    return;
  } else if (subcommand === 'auth') {
    try {
      await handleAuthCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
    return;
  } else if (subcommand === 'connect') {
    try {
      await handleConnectCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
    return;
  } else if (subcommand === 'bye') {
    console.log('Bye!');
    process.exit(0);
  } else if (subcommand === 'logout') {
    console.log(chalk.yellow('Note: "cheerful logout" is deprecated. Use "cheerful auth logout" instead.\n'));
    try {
      await handleAuthCommand(['logout']);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
    return;
  } else if (subcommand === 'notify') {
    try {
      await handleNotifyCommand(args.slice(1));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
    return;
  } else if (subcommand === 'daemon') {
    const daemonSubcommand = args[1];

    if (daemonSubcommand === 'list') {
      try {
        const sessions = await listDaemonSessions();
        if (sessions.length === 0) {
          console.log('No active sessions');
        } else {
          console.log('Active sessions:');
          console.log(JSON.stringify(sessions, null, 2));
        }
      } catch {
        console.log('No daemon running');
      }
      return;
    } else if (daemonSubcommand === 'stop-session') {
      const sessionId = args[2];
      if (!sessionId) {
        console.error('Session ID required');
        process.exit(1);
      }
      const success = await stopDaemonSession(sessionId);
      console.log(success ? 'Session stopped' : 'Failed to stop session');
      return;
    } else if (daemonSubcommand === 'start') {
      const child = await import('node:child_process').then(m => {
        return m.spawn(process.execPath, [process.argv[1], 'daemon', 'start-sync'], {
          detached: true,
          stdio: 'ignore',
          env: process.env,
        });
      });
      child.unref();

      let started = false;
      for (let i = 0; i < 50; i++) {
        if (await checkIfDaemonRunningAndCleanupStaleState()) {
          started = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log(started ? 'Daemon started successfully' : 'Failed to start daemon');
      process.exit(started ? 0 : 1);
    } else if (daemonSubcommand === 'start-sync') {
      await startDaemon();
      process.exit(0);
    } else if (daemonSubcommand === 'stop') {
      await stopDaemon();
      process.exit(0);
    } else if (daemonSubcommand === 'status') {
      await runDoctorCommand('daemon');
      process.exit(0);
    } else {
      console.log(`
${chalk.bold('cheerful daemon')} - Daemon management

${chalk.bold('Usage:')}
  cheerful daemon start        Start the daemon (detached)
  cheerful daemon stop         Stop the daemon
  cheerful daemon status       Show daemon status
  cheerful daemon list         List active sessions

${chalk.bold('Note:')} The daemon runs in the background and manages agent sessions.
`);
    }
    return;
  } else if (subcommand === 'agent') {
    const agentSubcommand = args[1];
    const settings = await readSettings();
    const { CursorApiClient } = await import('./cursor/cursorApiClient');

    if (!settings.cursorApiKey) {
      console.error(chalk.red('Cursor API key not configured. Run "cheerful auth setup-cursor" first.'));
      process.exit(1);
    }

    const cursorApi = new CursorApiClient({
      apiKey: settings.cursorApiKey,
      baseUrl: configuration.cursorApiBaseUrl,
    });

    if (agentSubcommand === 'list') {
      const { agents } = await cursorApi.listAgents({ limit: 20 });
      if (agents.length === 0) {
        console.log('No agents found');
      } else {
        for (const a of agents) {
          const statusColor = a.status === 'FINISHED' ? chalk.green : a.status === 'RUNNING' ? chalk.blue : chalk.yellow;
          console.log(`  ${statusColor(a.status.padEnd(10))} ${a.id}  ${a.name || '(unnamed)'}`);
          if (a.prUrl) console.log(`           PR: ${a.prUrl}`);
        }
      }
      return;
    } else if (agentSubcommand === 'status') {
      const id = args[2];
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      const info = await cursorApi.getAgent(id);
      console.log(JSON.stringify(info, null, 2));
      return;
    } else if (agentSubcommand === 'conversation') {
      const id = args[2];
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      const messages = await cursorApi.getConversation(id);
      for (const m of messages) {
        const prefix = m.type === 'user_message' ? chalk.cyan('You: ') : chalk.green('Agent: ');
        console.log(`${prefix}${m.text}\n`);
      }
      return;
    } else if (agentSubcommand === 'stop') {
      const id = args[2];
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      await cursorApi.stopAgent(id);
      console.log(chalk.green('Agent stopped'));
      return;
    } else if (agentSubcommand === 'delete') {
      const id = args[2];
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      await cursorApi.deleteAgent(id);
      console.log(chalk.green('Agent deleted'));
      return;
    } else if (agentSubcommand === 'models') {
      const models = await cursorApi.listModels();
      console.log('Available models:');
      for (const m of models) console.log(`  ${m}`);
      return;
    } else if (agentSubcommand === 'repos') {
      const repos = await cursorApi.listRepositories();
      for (const r of repos) console.log(`  ${r.owner}/${r.name}  ${r.repository}`);
      return;
    } else {
      console.log(`
${chalk.bold('cheerful agent')} - Cursor Cloud Agent management

${chalk.bold('Usage:')}
  cheerful agent list                  List all agents
  cheerful agent status <id>           Show agent status
  cheerful agent conversation <id>     Show agent conversation
  cheerful agent stop <id>             Stop an agent
  cheerful agent delete <id>           Delete an agent
  cheerful agent models                List available models
  cheerful agent repos                 List accessible repositories
`);
    }
    return;
  } else {
    // Strip 'cursor' subcommand if passed
    if (args.length > 0 && args[0] === 'cursor') {
      args.shift();
    }

    const options: StartOptions = {};
    let showHelp = false;
    let showVersion = false;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '-h' || arg === '--help') {
        showHelp = true;
      } else if (arg === '-v' || arg === '--version') {
        showVersion = true;
      } else if (arg === '--cheerful-starting-mode') {
        const mode = args[++i];
        if (mode === 'local' || mode === 'remote') {
          options.startingMode = mode;
        }
      } else if (arg === '--started-by') {
        options.startedBy = args[++i] as 'daemon' | 'terminal';
      } else if (arg === '--repo') {
        options.repository = args[++i];
      } else if (arg === '--ref') {
        options.ref = args[++i];
      } else if (arg === '--model') {
        options.model = args[++i];
      } else if (arg === '--auto-pr') {
        options.autoCreatePr = true;
      }
    }

    if (showHelp) {
      console.log(`
${chalk.bold('cheerful')} - Cursor Cloud Agents On the Go

${chalk.bold('Usage:')}
  cheerful [options]           Start a Cursor Cloud Agent session
  cheerful auth                Manage authentication
  cheerful connect             Connect API keys and repos
  cheerful agent               Manage Cloud Agents directly
  cheerful notify              Send push notification
  cheerful daemon              Manage background service
  cheerful doctor              System diagnostics

${chalk.bold('Options:')}
  --repo <url>                 GitHub repository URL
  --ref <branch>               Git ref (branch/tag/commit)
  --model <name>               LLM model to use
  --auto-pr                    Auto-create PR when agent finishes
  --cheerful-starting-mode     Start in local or remote mode

${chalk.bold('Examples:')}
  cheerful --repo https://github.com/org/repo
  cheerful --repo https://github.com/org/repo --auto-pr
  cheerful agent list
  cheerful agent status bc_abc123
  cheerful auth setup-cursor
`);
      process.exit(0);
    }

    if (showVersion) {
      console.log(`cheerful version: ${configuration.version}`);
      process.exit(0);
    }

    // Use default repo from settings if not provided
    if (!options.repository) {
      const settings = await readSettings();
      options.repository = settings.defaultRepository;
    }

    const { credentials } = await authAndSetupMachineIfNeeded();

    logger.debug('Ensuring Cheerful background service is running...');
    if (!(await isDaemonRunningCurrentlyInstalledHappyVersion())) {
      logger.debug('Starting Cheerful background service...');
      const { spawn } = await import('node:child_process');
      const daemonProcess = spawn(process.execPath, [process.argv[1], 'daemon', 'start-sync'], {
        detached: true,
        stdio: 'ignore',
        env: process.env,
      });
      daemonProcess.unref();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      await runCursor(credentials, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      if (process.env.DEBUG) console.error(error);
      process.exit(1);
    }
  }
})();

async function handleNotifyCommand(args: string[]): Promise<void> {
  let message = '';
  let title = '';
  let showHelp = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-p' && i + 1 < args.length) {
      message = args[++i];
    } else if (arg === '-t' && i + 1 < args.length) {
      title = args[++i];
    } else if (arg === '-h' || arg === '--help') {
      showHelp = true;
    }
  }

  if (showHelp) {
    console.log(`
${chalk.bold('cheerful notify')} - Send notification

${chalk.bold('Usage:')}
  cheerful notify -p <message> [-t <title>]

${chalk.bold('Options:')}
  -p <message>   Notification message (required)
  -t <title>     Notification title (optional, defaults to "Cheerful")

${chalk.bold('Examples:')}
  cheerful notify -p "Agent finished!"
  cheerful notify -p "PR ready for review" -t "Cursor Agent"
`);
    return;
  }

  if (!message) {
    console.error(chalk.red('Error: Message required. Use -p "message"'));
    process.exit(1);
  }

  const credentials = await readCredentials();
  if (!credentials) {
    console.error(chalk.red('Not authenticated. Run "cheerful auth login" first.'));
    process.exit(1);
  }

  console.log(chalk.blue('Sending push notification...'));

  const api = await ApiClient.create(credentials);
  api.push().sendToAllDevices(title || 'Cheerful', message, {
    source: 'cli',
    timestamp: Date.now(),
  });

  console.log(chalk.green('Push notification sent!'));
  await new Promise(resolve => setTimeout(resolve, 1000));
}
