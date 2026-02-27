/**
 * Lightweight content evaluation: reject prompt-injection, spam, or toxic input.
 * Used before persisting user messages or memories. No external API.
 */

const MAX_LENGTH = 16_384;
const MIN_LENGTH = 1;

const INJECTION_PATTERNS = [
  'ignore previous instructions',
  'disregard all above',
  'forget everything',
  'you are now',
  'act as if',
  'pretend you are',
  'new instructions',
  'system prompt',
  'developer mode',
  'jailbreak',
  'you are no longer',
  'from now on you',
  'your new role',
  'override',
];

export interface EvaluateResult {
  ok: boolean;
  reason?: string;
}

export function evaluateContent(text: string): EvaluateResult {
  if (typeof text !== 'string') return { ok: false, reason: 'invalid' };

  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) return { ok: false, reason: 'too_short' };
  if (trimmed.length > MAX_LENGTH) return { ok: false, reason: 'too_long' };

  const lower = trimmed.toLowerCase();
  for (const pattern of INJECTION_PATTERNS) {
    if (lower.includes(pattern)) return { ok: false, reason: 'content_not_accepted' };
  }

  return { ok: true };
}
