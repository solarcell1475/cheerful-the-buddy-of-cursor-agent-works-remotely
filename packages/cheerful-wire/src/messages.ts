import { z } from 'zod';

export const MessageRole = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRole>;

export const MessageType = z.enum([
  'text',
  'agent_status',
  'tool_call',
  'tool_result',
  'error',
  'session_event',
  'session_death',
  'notification',
]);
export type MessageType = z.infer<typeof MessageType>;

export const UserMessage = z.object({
  id: z.string(),
  type: z.literal('text'),
  role: z.literal('user'),
  content: z.object({
    text: z.string(),
  }),
  meta: z.object({
    model: z.string().optional(),
    repository: z.string().optional(),
    ref: z.string().optional(),
    autoCreatePr: z.boolean().optional(),
  }).optional(),
  timestamp: z.number(),
});
export type UserMessage = z.infer<typeof UserMessage>;

export const AssistantMessage = z.object({
  id: z.string(),
  type: z.literal('text'),
  role: z.literal('assistant'),
  content: z.object({
    text: z.string(),
  }),
  timestamp: z.number(),
});
export type AssistantMessage = z.infer<typeof AssistantMessage>;

export const AgentStatusMessage = z.object({
  id: z.string(),
  type: z.literal('agent_status'),
  role: z.literal('system'),
  agentId: z.string(),
  status: z.string(),
  summary: z.string().optional(),
  prUrl: z.string().optional(),
  branchName: z.string().optional(),
  timestamp: z.number(),
});
export type AgentStatusMessage = z.infer<typeof AgentStatusMessage>;

export const SessionEventMessage = z.object({
  id: z.string(),
  type: z.literal('session_event'),
  event: z.enum(['switch', 'created', 'resumed', 'archived']),
  mode: z.enum(['local', 'remote']).optional(),
  timestamp: z.number(),
});
export type SessionEventMessage = z.infer<typeof SessionEventMessage>;

export const SessionDeathMessage = z.object({
  id: z.string(),
  type: z.literal('session_death'),
  timestamp: z.number(),
});
export type SessionDeathMessage = z.infer<typeof SessionDeathMessage>;

export const ErrorMessage = z.object({
  id: z.string(),
  type: z.literal('error'),
  role: z.literal('system'),
  content: z.object({
    text: z.string(),
    code: z.string().optional(),
  }),
  timestamp: z.number(),
});
export type ErrorMessage = z.infer<typeof ErrorMessage>;

export const WireMessage = z.discriminatedUnion('type', [
  UserMessage,
  AssistantMessage,
  AgentStatusMessage,
  SessionEventMessage,
  SessionDeathMessage,
  ErrorMessage,
]);
export type WireMessage = z.infer<typeof WireMessage>;
