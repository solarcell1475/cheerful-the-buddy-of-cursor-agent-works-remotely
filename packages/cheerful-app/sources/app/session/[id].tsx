import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSessionDetail } from '../../hooks/useSession';
import { useLayout } from '../../hooks/useLayout';
import { ChatBubble } from '../../components/ChatBubble';
import { MessageInput } from '../../components/MessageInput';
import { sendUserMessage } from '../../realtime/socket';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, messages, loading, agents, plan, debugLines } = useSessionDetail(id);
  const listRef = useRef<FlatList>(null);
  const layout = useLayout();
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const isArchived = session.metadata.lifecycleState === 'archived';
  const isThinking = session.state.isThinking;

  const handleSend = (text: string) => {
    sendUserMessage(id, text);
  };

  const chatAreaStyle = layout.isTablet
    ? { maxWidth: layout.chatMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
    : undefined;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: session.metadata.repository
            ? session.metadata.repository.replace('https://github.com/', '')
            : 'Session',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: layout.isTablet ? 18 : 16,
          },
        }}
      />

      {/* Agent selector */}
      {agents.length > 0 && (
        <View style={[styles.agentBar, layout.isTablet && styles.agentBarTablet]}>
          <View style={chatAreaStyle}>
            <Text style={[styles.agentLabel, { fontSize: layout.fontSize.small }]}>Agent</Text>
            <View style={styles.agentChips}>
              {agents.map((a) => (
                <View key={a.id} style={styles.agentChip}>
                  <Text style={[styles.agentChipText, { fontSize: layout.fontSize.caption }]} numberOfLines={1}>
                    {a.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Plan */}
      {plan.steps && plan.steps.length > 0 && (
        <View style={[styles.planBar, layout.isTablet && styles.planBarTablet]}>
          <View style={chatAreaStyle}>
            <Text style={[styles.planLabel, { fontSize: layout.fontSize.small }]}>Plan</Text>
            {plan.steps.map((step, i) => (
              <View key={i} style={styles.planStep}>
                <Text style={[styles.planStepNum, { fontSize: layout.fontSize.caption }]}>
                  {i + 1}.
                </Text>
                <Text style={[styles.planStepText, { fontSize: layout.fontSize.caption }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Debug (collapsible) */}
      {debugLines.length > 0 && (
        <View style={styles.debugBar}>
          <TouchableOpacity onPress={() => setShowDebug((s) => !s)} style={styles.debugHeader}>
            <Text style={[styles.debugLabel, { fontSize: layout.fontSize.small }]}>
              Debug {showDebug ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>
          {showDebug && (
            <ScrollView style={styles.debugScroll} nestedScrollEnabled>
              {debugLines.map((line, i) => (
                <Text key={i} style={[styles.debugLine, { fontSize: layout.fontSize.small - 1 }]}>
                  {line}
                </Text>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Agent Info Bar */}
      <View style={[styles.infoBar, layout.isTablet && styles.infoBarTablet]}>
        <View style={chatAreaStyle}>
          <View style={styles.infoRow}>
            <View
              style={[
                styles.statusDot,
                layout.isTablet && styles.statusDotTablet,
                {
                  backgroundColor: isThinking
                    ? '#3B82F6'
                    : isArchived
                    ? '#6B7280'
                    : '#22C55E',
                },
              ]}
            />
            <Text style={[styles.infoText, { fontSize: layout.fontSize.caption }]}>
              {isThinking
                ? 'Agent is working...'
                : session.metadata.cursorAgentStatus || (isArchived ? 'Archived' : 'Active')}
            </Text>
          </View>
          {session.metadata.branchName && (
            <Text style={[styles.branchText, { fontSize: layout.fontSize.small + 1 }]}>
              {session.metadata.branchName}
            </Text>
          )}
          {session.metadata.prUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(session.metadata.prUrl!)}>
              <Text style={[styles.prLink, { fontSize: layout.fontSize.small + 1 }]}>
                View Pull Request
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={chatAreaStyle}>
            <ChatBubble message={item} isTablet={layout.isTablet} />
          </View>
        )}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageContent,
          layout.isTablet && styles.messageContentTablet,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={[styles.emptyText, { fontSize: layout.fontSize.subtitle }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { fontSize: layout.fontSize.caption }]}>
              Send a message to interact with the agent
            </Text>
          </View>
        }
      />

      {/* Thinking indicator */}
      {isThinking && (
        <View style={[styles.thinkingBar, layout.isTablet && styles.thinkingBarTablet]}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={[styles.thinkingText, { fontSize: layout.fontSize.caption }]}>
            Agent is thinking...
          </Text>
        </View>
      )}

      {/* Input */}
      <View style={layout.isTablet ? styles.inputWrapperTablet : undefined}>
        <View style={chatAreaStyle}>
          <MessageInput
            onSend={handleSend}
            disabled={isArchived}
            isTablet={layout.isTablet}
            placeholder={
              isArchived
                ? 'Session archived'
                : 'Send instruction to agent...'
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  infoBar: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A4A',
  },
  infoBarTablet: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotTablet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  infoText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '600',
  },
  branchText: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 4,
  },
  prLink: {
    color: '#3B82F6',
    fontSize: 12,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  messageList: {
    flex: 1,
  },
  messageContent: {
    paddingVertical: 8,
  },
  messageContentTablet: {
    paddingVertical: 16,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  thinkingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  thinkingBarTablet: {
    paddingVertical: 12,
  },
  thinkingText: {
    color: '#3B82F6',
    fontSize: 12,
    marginLeft: 8,
  },
  inputWrapperTablet: {
    alignItems: 'center',
  },
  agentBar: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  agentBarTablet: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  agentLabel: {
    color: '#888',
    marginBottom: 4,
  },
  agentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  agentChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  agentChipText: {
    color: '#E0E0E0',
  },
  planBar: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  planBarTablet: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  planLabel: {
    color: '#888',
    marginBottom: 6,
  },
  planStep: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  planStepNum: {
    color: '#3B82F6',
    marginRight: 8,
    minWidth: 20,
  },
  planStepText: {
    color: '#CBD5E1',
    flex: 1,
  },
  debugBar: {
    backgroundColor: '#0C0C14',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  debugHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  debugLabel: {
    color: '#64748B',
  },
  debugScroll: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  debugLine: {
    color: '#64748B',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});
