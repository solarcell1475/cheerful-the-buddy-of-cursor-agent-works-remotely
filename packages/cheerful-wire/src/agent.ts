import { z } from 'zod';

export const CursorAgentStatus = z.enum([
  'CREATING',
  'RUNNING',
  'STOPPED',
  'FINISHED',
  'ERROR',
]);
export type CursorAgentStatus = z.infer<typeof CursorAgentStatus>;

export const CursorAgentSource = z.object({
  repository: z.string().url(),
  ref: z.string().optional(),
  prUrl: z.string().url().optional(),
});
export type CursorAgentSource = z.infer<typeof CursorAgentSource>;

export const CursorAgentTarget = z.object({
  branchName: z.string().optional(),
  url: z.string().url().optional(),
  prUrl: z.string().url().optional(),
  autoCreatePr: z.boolean().default(false),
  openAsCursorGithubApp: z.boolean().default(false),
  skipReviewerRequest: z.boolean().default(false),
  autoBranch: z.boolean().default(true),
});
export type CursorAgentTarget = z.infer<typeof CursorAgentTarget>;

export const CursorAgent = z.object({
  id: z.string(),
  name: z.string(),
  status: CursorAgentStatus,
  source: CursorAgentSource,
  target: CursorAgentTarget.optional(),
  summary: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type CursorAgent = z.infer<typeof CursorAgent>;

export const LaunchAgentRequest = z.object({
  prompt: z.object({
    text: z.string(),
    images: z.array(z.object({
      data: z.string(),
      dimension: z.object({
        width: z.number(),
        height: z.number(),
      }),
    })).optional(),
  }),
  model: z.string().optional(),
  source: z.object({
    repository: z.string().url().optional(),
    ref: z.string().optional(),
    prUrl: z.string().url().optional(),
  }),
  target: z.object({
    autoCreatePr: z.boolean().optional(),
    openAsCursorGithubApp: z.boolean().optional(),
    skipReviewerRequest: z.boolean().optional(),
    branchName: z.string().optional(),
    autoBranch: z.boolean().optional(),
  }).optional(),
  webhook: z.object({
    url: z.string().url(),
    secret: z.string().min(32).optional(),
  }).optional(),
});
export type LaunchAgentRequest = z.infer<typeof LaunchAgentRequest>;

export const FollowUpRequest = z.object({
  prompt: z.object({
    text: z.string(),
    images: z.array(z.object({
      data: z.string(),
      dimension: z.object({
        width: z.number(),
        height: z.number(),
      }),
    })).optional(),
  }),
});
export type FollowUpRequest = z.infer<typeof FollowUpRequest>;

export const AgentListResponse = z.object({
  agents: z.array(CursorAgent),
  nextCursor: z.string().optional(),
});
export type AgentListResponse = z.infer<typeof AgentListResponse>;

export const ConversationMessage = z.object({
  id: z.string(),
  type: z.enum(['user_message', 'assistant_message']),
  text: z.string(),
});
export type ConversationMessage = z.infer<typeof ConversationMessage>;

export const ConversationResponse = z.object({
  id: z.string(),
  messages: z.array(ConversationMessage),
});
export type ConversationResponse = z.infer<typeof ConversationResponse>;

export const CursorModel = z.string();
export const ModelsResponse = z.object({
  models: z.array(CursorModel),
});
export type ModelsResponse = z.infer<typeof ModelsResponse>;

export const RepositoryInfo = z.object({
  owner: z.string(),
  name: z.string(),
  repository: z.string().url(),
});
export type RepositoryInfo = z.infer<typeof RepositoryInfo>;

export const RepositoriesResponse = z.object({
  repositories: z.array(RepositoryInfo),
});
export type RepositoriesResponse = z.infer<typeof RepositoriesResponse>;

export const ApiKeyInfo = z.object({
  apiKeyName: z.string(),
  createdAt: z.string().datetime(),
  userEmail: z.string().email(),
});
export type ApiKeyInfo = z.infer<typeof ApiKeyInfo>;
