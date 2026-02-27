export function log(context: Record<string, unknown> | string, message?: string): void {
  const timestamp = new Date().toISOString();
  if (typeof context === 'string') {
    console.log(`[${timestamp}] ${context}`);
  } else {
    const prefix = context.module ? `[${context.module}]` : '';
    const level = (context.level as string) || 'info';
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${prefix} ${message || ''}`);
  }
}
