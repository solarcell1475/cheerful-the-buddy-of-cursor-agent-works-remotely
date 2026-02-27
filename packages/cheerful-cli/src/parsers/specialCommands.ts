export interface SpecialCommand {
  type: 'none' | 'compact' | 'clear' | 'switch' | 'exit' | 'slash';
  originalMessage?: string;
  command?: string;
  args?: string[];
}

/**
 * Parse slash command into command name and args (e.g. "/plan add tests" -> { command: 'plan', args: ['add', 'tests'] }).
 */
export function parseSlashCommand(text: string): { command: string; args: string[] } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const rest = trimmed.slice(1).trim();
  const firstSpace = rest.indexOf(' ');
  const command = firstSpace === -1 ? rest : rest.slice(0, firstSpace);
  const args = firstSpace === -1 ? [] : rest.slice(firstSpace + 1).trim().split(/\s+/).filter(Boolean);
  return { command, args };
}

export function parseSpecialCommand(text: string): SpecialCommand {
  const trimmed = text.trim();

  if (trimmed === '/compact' || trimmed.startsWith('/compact ')) {
    return {
      type: 'compact',
      originalMessage: trimmed.slice('/compact'.length).trim() || undefined,
    };
  }

  if (trimmed === '/clear') {
    return { type: 'clear' };
  }

  if (trimmed === '/switch') {
    return { type: 'switch' };
  }

  if (trimmed === '/exit' || trimmed === '/quit') {
    return { type: 'exit' };
  }

  if (trimmed.startsWith('/')) {
    const parsed = parseSlashCommand(trimmed);
    if (parsed) {
      return {
        type: 'slash',
        originalMessage: trimmed,
        command: parsed.command,
        args: parsed.args,
      };
    }
  }

  return { type: 'none' };
}
