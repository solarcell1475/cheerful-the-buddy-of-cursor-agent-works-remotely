export interface SpecialCommand {
  type: 'none' | 'compact' | 'clear' | 'switch' | 'exit';
  originalMessage?: string;
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

  return { type: 'none' };
}
