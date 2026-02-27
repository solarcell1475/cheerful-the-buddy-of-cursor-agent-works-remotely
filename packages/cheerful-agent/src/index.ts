#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CursorClient } from './cursorClient';

const program = new Command();

program
  .name('cheerful-agent')
  .description('CLI for controlling Cursor Cloud Agents remotely')
  .version('0.1.0');

function getClient(): CursorClient {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    console.error(chalk.red('CURSOR_API_KEY environment variable is required.'));
    console.error(chalk.gray('Get your API key from: https://cursor.com/settings'));
    process.exit(1);
  }
  return new CursorClient(apiKey, process.env.CURSOR_API_BASE_URL);
}

// --- launch ---
program
  .command('launch')
  .description('Launch a new Cursor Cloud Agent')
  .requiredOption('-p, --prompt <text>', 'Task prompt for the agent')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .option('--ref <branch>', 'Git ref (branch/tag/commit)')
  .option('--model <name>', 'LLM model to use')
  .option('--auto-pr', 'Auto-create PR when done')
  .option('--branch <name>', 'Custom branch name')
  .action(async (opts) => {
    const client = getClient();
    try {
      console.log(chalk.blue('Launching agent...'));
      const agent = await client.launch({
        prompt: opts.prompt,
        repository: opts.repo,
        ref: opts.ref,
        model: opts.model,
        autoCreatePr: opts.autoPr,
        branchName: opts.branch,
      });
      console.log(chalk.green(`Agent launched: ${agent.id}`));
      console.log(`  Name:   ${agent.name}`);
      console.log(`  Status: ${agent.status}`);
      if (agent.target?.url) console.log(`  URL:    ${agent.target.url}`);
    } catch (err: any) {
      console.error(chalk.red('Failed to launch agent:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- list ---
program
  .command('list')
  .description('List all Cloud Agents')
  .option('-l, --limit <n>', 'Number of agents to return', '20')
  .option('--pr <url>', 'Filter by pull request URL')
  .action(async (opts) => {
    const client = getClient();
    try {
      const { agents } = await client.list({
        limit: parseInt(opts.limit, 10),
        prUrl: opts.pr,
      });
      if (agents.length === 0) {
        console.log('No agents found.');
        return;
      }
      console.log(chalk.bold(`\n  ${'STATUS'.padEnd(12)} ${'ID'.padEnd(20)} NAME\n`));
      for (const a of agents) {
        const color = a.status === 'FINISHED' ? chalk.green
          : a.status === 'RUNNING' ? chalk.blue
          : a.status === 'ERROR' ? chalk.red
          : chalk.yellow;
        console.log(`  ${color(a.status.padEnd(12))} ${a.id.padEnd(20)} ${a.name || '(unnamed)'}`);
        if (a.target?.prUrl) console.log(`  ${''.padEnd(12)} ${''.padEnd(20)} PR: ${a.target.prUrl}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- status ---
program
  .command('status <id>')
  .description('Get agent status')
  .action(async (id) => {
    const client = getClient();
    try {
      const info = await client.get(id);
      console.log(chalk.bold('\nAgent Status\n'));
      console.log(`  ID:         ${info.id}`);
      console.log(`  Name:       ${info.name}`);
      console.log(`  Status:     ${info.status}`);
      console.log(`  Repository: ${info.source.repository}`);
      if (info.source.ref) console.log(`  Ref:        ${info.source.ref}`);
      if (info.target?.branchName) console.log(`  Branch:     ${info.target.branchName}`);
      if (info.target?.prUrl) console.log(`  PR:         ${info.target.prUrl}`);
      if (info.summary) console.log(`  Summary:    ${info.summary}`);
      console.log(`  Created:    ${info.createdAt}`);
      console.log('');
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- conversation ---
program
  .command('conversation <id>')
  .description('View agent conversation history')
  .action(async (id) => {
    const client = getClient();
    try {
      const messages = await client.conversation(id);
      if (messages.length === 0) {
        console.log('No conversation messages.');
        return;
      }
      console.log(chalk.bold('\nConversation\n'));
      for (const m of messages) {
        const prefix = m.type === 'user_message'
          ? chalk.cyan('You:   ')
          : chalk.green('Agent: ');
        console.log(`${prefix}${m.text}\n`);
      }
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- followup ---
program
  .command('followup <id>')
  .description('Send a follow-up instruction to an agent')
  .requiredOption('-p, --prompt <text>', 'Follow-up instruction')
  .action(async (id, opts) => {
    const client = getClient();
    try {
      await client.followup(id, opts.prompt);
      console.log(chalk.green('Follow-up sent successfully.'));
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- stop ---
program
  .command('stop <id>')
  .description('Stop a running agent')
  .action(async (id) => {
    const client = getClient();
    try {
      await client.stop(id);
      console.log(chalk.green('Agent stopped.'));
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- delete ---
program
  .command('delete <id>')
  .description('Delete an agent (permanent)')
  .action(async (id) => {
    const client = getClient();
    try {
      await client.delete(id);
      console.log(chalk.green('Agent deleted.'));
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- models ---
program
  .command('models')
  .description('List available LLM models')
  .action(async () => {
    const client = getClient();
    try {
      const models = await client.models();
      console.log(chalk.bold('\nAvailable Models\n'));
      for (const m of models) console.log(`  ${m}`);
      console.log('');
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- repos ---
program
  .command('repos')
  .description('List accessible GitHub repositories')
  .action(async () => {
    const client = getClient();
    try {
      console.log(chalk.gray('Fetching repositories (this may take a moment)...'));
      const repos = await client.repositories();
      if (repos.length === 0) {
        console.log('No repositories found.');
        return;
      }
      console.log(chalk.bold(`\n  ${'OWNER'.padEnd(20)} ${'NAME'.padEnd(30)} URL\n`));
      for (const r of repos) {
        console.log(`  ${r.owner.padEnd(20)} ${r.name.padEnd(30)} ${r.repository}`);
      }
      console.log('');
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- me ---
program
  .command('me')
  .description('Show API key info')
  .action(async () => {
    const client = getClient();
    try {
      const info = await client.me();
      console.log(chalk.bold('\nAPI Key Info\n'));
      console.log(`  Email:    ${info.userEmail}`);
      console.log(`  Key Name: ${info.apiKeyName}`);
      console.log(`  Created:  ${info.createdAt}`);
      console.log('');
    } catch (err: any) {
      console.error(chalk.red('Failed:'), err.response?.data?.error || err.message);
      process.exit(1);
    }
  });

// --- watch ---
program
  .command('watch <id>')
  .description('Watch agent status in real-time')
  .option('-i, --interval <seconds>', 'Poll interval in seconds', '5')
  .action(async (id, opts) => {
    const client = getClient();
    const intervalMs = parseInt(opts.interval, 10) * 1000;
    let lastConvLen = 0;

    console.log(chalk.blue(`Watching agent ${id} (Ctrl+C to stop)\n`));

    const poll = async () => {
      try {
        const info = await client.get(id);
        const statusColor = info.status === 'FINISHED' ? chalk.green
          : info.status === 'RUNNING' ? chalk.blue
          : info.status === 'ERROR' ? chalk.red
          : chalk.yellow;

        process.stdout.write(`\r  Status: ${statusColor(info.status)}  `);

        const messages = await client.conversation(id);
        if (messages.length > lastConvLen) {
          const newMsgs = messages.slice(lastConvLen);
          lastConvLen = messages.length;
          console.log('');
          for (const m of newMsgs) {
            const prefix = m.type === 'user_message'
              ? chalk.cyan('You:   ')
              : chalk.green('Agent: ');
            console.log(`${prefix}${m.text}\n`);
          }
        }

        if (info.status !== 'CREATING' && info.status !== 'RUNNING') {
          console.log(chalk.bold(`\nAgent ${info.status.toLowerCase()}.`));
          if (info.summary) console.log(`Summary: ${info.summary}`);
          if (info.target?.prUrl) console.log(`PR: ${info.target.prUrl}`);
          process.exit(0);
        }
      } catch (err: any) {
        console.error(chalk.red('\nPoll error:'), err.message);
      }
    };

    await poll();
    setInterval(poll, intervalMs);
  });

program.parse();
