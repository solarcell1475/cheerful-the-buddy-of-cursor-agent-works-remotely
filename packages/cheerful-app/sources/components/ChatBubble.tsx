import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import type { ChatMessage } from '../types/session';

interface ChatBubbleProps {
  message: ChatMessage;
  isTablet?: boolean;
}

export function ChatBubble({ message, isTablet }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system' || message.type === 'agent_status';

  if (isSystem) {
    return (
      <View style={[styles.systemContainer, isTablet && styles.systemContainerTablet]}>
        <Text style={[styles.systemText, isTablet && styles.systemTextTablet]}>
          {message.status ? `Agent: ${message.status}` : message.content}
        </Text>
        {message.prUrl && (
          <TouchableOpacity onPress={() => Linking.openURL(message.prUrl!)}>
            <Text style={[styles.link, isTablet && styles.linkTablet]}>View PR</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
        isTablet && styles.bubbleTablet,
        isTablet && (isUser ? styles.userBubbleTablet : styles.assistantBubbleTablet),
      ]}
    >
      <Text
        style={[
          styles.text,
          isUser ? styles.userText : styles.assistantText,
          isTablet && styles.textTablet,
        ]}
        selectable
      >
        {message.content}
      </Text>
      <Text style={[styles.timestamp, isTablet && styles.timestampTablet]}>
        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bubbleTablet: {
    maxWidth: '70%',
    borderRadius: 20,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
  },
  userBubbleTablet: {
    backgroundColor: '#2563EB',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A2A4A',
  },
  assistantBubbleTablet: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textTablet: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#E0E0E0',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timestampTablet: {
    fontSize: 12,
    marginTop: 6,
  },
  systemContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 4,
    maxWidth: '90%',
  },
  systemContainerTablet: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 6,
    maxWidth: '70%',
  },
  systemText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
  systemTextTablet: {
    fontSize: 14,
  },
  link: {
    color: '#3B82F6',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  linkTablet: {
    fontSize: 14,
    marginTop: 6,
  },
});
