import { useState, useEffect, useCallback } from 'react';
import { getToken, getServerUrl } from '../auth/authStore';
import { fetchSessions, fetchSession } from '../sync/sessionSync';
import {
  getSocket,
  joinSession,
  onSessionMessage,
  onSessionDeath,
  onMetadataUpdated,
  onAgentStateUpdated,
  onAgentList,
  onPlanUpdate,
  onDebugOutput,
} from '../realtime/socket';
import type { SessionInfo, ChatMessage } from '../types/session';

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [token, baseUrl] = await Promise.all([getToken(), getServerUrl()]);
      if (!token) return;
      const data = await fetchSessions(token, baseUrl);
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}

export interface AgentChoice {
  id: string;
  name: string;
}

export interface PlanState {
  steps?: string[];
  currentStep?: number;
}

export function useSessionDetail(sessionId: string) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentChoice[]>([]);
  const [plan, setPlan] = useState<PlanState>({});
  const [debugLines, setDebugLines] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const [token, baseUrl] = await Promise.all([getToken(), getServerUrl()]);
      if (!token || !mounted) return;

      try {
        const data = await fetchSession(token, sessionId, baseUrl);
        if (!mounted) return;

        setSession({
          id: data.id,
          tag: data.tag,
          metadata: data.metadata as SessionInfo['metadata'],
          state: data.state as SessionInfo['state'],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });

        const chatMessages: ChatMessage[] = data.messages.map((m, i) => {
          const payload = m.payload as Record<string, unknown>;
          return {
            id: `msg-${i}`,
            type: (payload.type as string) || 'text',
            role: (payload.role as string) || 'system',
            content: (payload.content as { text: string })?.text || JSON.stringify(payload),
            agentId: payload.agentId as string | undefined,
            status: payload.status as string | undefined,
            prUrl: payload.prUrl as string | undefined,
            timestamp: (payload.timestamp as number) || new Date(m.createdAt).getTime(),
          } as ChatMessage;
        });
        setMessages(chatMessages);

        getSocket(token, baseUrl);
        joinSession(sessionId);

        onSessionMessage(({ message, timestamp }) => {
          const content = (message as { content?: { text?: string } })?.content?.text || JSON.stringify(message);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}`,
              type: (message.type as string) || 'text',
              role: (message.role as string) || 'assistant',
              content,
              timestamp,
            } as ChatMessage,
          ]);
        });

        onMetadataUpdated(({ metadata }) => {
          setSession((prev) =>
            prev ? { ...prev, metadata: { ...prev.metadata, ...metadata } as SessionInfo['metadata'] } : prev,
          );
        });

        onAgentStateUpdated(({ state }) => {
          setSession((prev) =>
            prev ? { ...prev, state: { ...prev.state, ...state } as SessionInfo['state'] } : prev,
          );
        });

        onSessionDeath(() => {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  metadata: { ...prev.metadata, lifecycleState: 'archived' as const, lifecycleStateSince: Date.now() },
                }
              : prev,
          );
        });

        onAgentList(({ agents: list }) => {
          setAgents(list);
        });

        onPlanUpdate(({ plan: p }) => {
          setPlan(p);
        });

        onDebugOutput(({ output }) => {
          setDebugLines((prev) => [...prev, output]);
        });
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  return { session, messages, loading, agents, plan, debugLines };
}
