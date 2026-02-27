export const SLASH_COMMANDS: { command: string; description: string }[] = [
  { command: '/model <model>', description: 'Set current model' },
  { command: '/auto-run', description: 'Toggle run all' },
  { command: '/plan [prompt]', description: 'Create or show plan' },
  { command: '/ask', description: 'Toggle ask mode (read-only)' },
  { command: '/max-mode', description: 'Toggle max mode' },
  { command: '/clear', description: 'Start new chat' },
  { command: '/compress', description: 'Summarize conversation' },
  { command: '/show-thinking', description: 'Toggle thinking block' },
  { command: '/shell [command]', description: 'Shell mode' },
  { command: '/about', description: 'CLI version and info' },
  { command: '/help [command]', description: 'Show help' },
  { command: '/open', description: 'Open repo in Cursor' },
  { command: '/cursor', description: 'Alias for /open' },
  { command: '/search <query>', description: 'Search the web' },
];

export function filterSlashCommands(prefix: string): { command: string; description: string }[] {
  const lower = prefix.toLowerCase().replace(/^\//, '').trim();
  if (!lower) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (c) => c.command.toLowerCase().replace(/^\//, '').startsWith(lower) || c.command.toLowerCase().includes(lower)
  );
}
