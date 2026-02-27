import { z } from 'zod';

export const LifecycleState = z.enum(['running', 'paused', 'archived']);
export type LifecycleState = z.infer<typeof LifecycleState>;

export const SessionMetadata = z.object({
  repository: z.string().optional(),
  ref: z.string().optional(),
  host: z.string(),
  version: z.string(),
  os: z.string(),
  machineId: z.string(),
  homeDir: z.string(),
  startedFromDaemon: z.boolean().default(false),
  hostPid: z.number().optional(),
  startedBy: z.enum(['daemon', 'terminal']).default('terminal'),
  lifecycleState: LifecycleState.default('running'),
  lifecycleStateSince: z.number(),
  flavor: z.literal('cursor').default('cursor'),
  cursorAgentId: z.string().optional(),
  cursorAgentStatus: z.string().optional(),
  prUrl: z.string().optional(),
  branchName: z.string().optional(),
});
export type SessionMetadata = z.infer<typeof SessionMetadata>;

export const AgentState = z.object({
  controlledByUser: z.boolean().default(true),
  cursorAgentId: z.string().optional(),
  isThinking: z.boolean().default(false),
  lastPollAt: z.number().optional(),
});
export type AgentState = z.infer<typeof AgentState>;

export const SessionCreateRequest = z.object({
  tag: z.string(),
  metadata: SessionMetadata,
  state: AgentState,
});
export type SessionCreateRequest = z.infer<typeof SessionCreateRequest>;

export const SessionResponse = z.object({
  id: z.string(),
  tag: z.string(),
  metadata: SessionMetadata,
  state: AgentState,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;

export const MachineCreateRequest = z.object({
  machineId: z.string(),
  metadata: z.record(z.unknown()),
});
export type MachineCreateRequest = z.infer<typeof MachineCreateRequest>;

export const PushNotificationPayload = z.object({
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
});
export type PushNotificationPayload = z.infer<typeof PushNotificationPayload>;
