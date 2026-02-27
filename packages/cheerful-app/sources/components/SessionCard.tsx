import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { SessionInfo } from '../types/session';

interface SessionCardProps {
  session: SessionInfo;
  onPress: () => void;
  isTablet?: boolean;
}

export function SessionCard({ session, onPress, isTablet }: SessionCardProps) {
  const { metadata, state } = session;
  const isRunning = metadata.lifecycleState === 'running';
  const isThinking = state.isThinking;

  const statusColor = isThinking ? '#3B82F6' : isRunning ? '#22C55E' : '#6B7280';
  const statusText = isThinking
    ? 'Thinking...'
    : metadata.cursorAgentStatus || (isRunning ? 'Active' : 'Archived');

  const timeAgo = formatTimeAgo(metadata.lifecycleStateSince);

  return (
    <TouchableOpacity
      style={[styles.card, isTablet && styles.cardTablet]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.dot, isTablet && styles.dotTablet, { backgroundColor: statusColor }]} />
        <Text style={[styles.status, isTablet && styles.statusTablet]}>{statusText}</Text>
        <Text style={[styles.time, isTablet && styles.timeTablet]}>{timeAgo}</Text>
      </View>

      {metadata.repository && (
        <Text style={[styles.repo, isTablet && styles.repoTablet]} numberOfLines={1}>
          {metadata.repository.replace('https://github.com/', '')}
        </Text>
      )}

      {metadata.branchName && (
        <Text style={[styles.branch, isTablet && styles.branchTablet]} numberOfLines={1}>
          {metadata.branchName}
        </Text>
      )}

      {metadata.prUrl && (
        <Text style={[styles.pr, isTablet && styles.prTablet]} numberOfLines={1}>
          PR: {metadata.prUrl.split('/').pop()}
        </Text>
      )}

      <View style={[styles.footer, isTablet && styles.footerTablet]}>
        <Text style={[styles.footerText, isTablet && styles.footerTextTablet]}>
          {metadata.host} &middot; {metadata.os}
        </Text>
        {state.controlledByUser ? (
          <Text style={[styles.modeLocal, isTablet && styles.modeTablet]}>Local</Text>
        ) : (
          <Text style={[styles.modeRemote, isTablet && styles.modeTablet]}>Remote</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  cardTablet: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 8,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotTablet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  status: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusTablet: {
    fontSize: 16,
  },
  time: {
    color: '#888',
    fontSize: 12,
  },
  timeTablet: {
    fontSize: 14,
  },
  repo: {
    color: '#A0A0FF',
    fontSize: 13,
    marginBottom: 4,
  },
  repoTablet: {
    fontSize: 15,
    marginBottom: 6,
  },
  branch: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 4,
  },
  branchTablet: {
    fontSize: 14,
    marginBottom: 6,
  },
  pr: {
    color: '#22C55E',
    fontSize: 12,
    marginBottom: 4,
  },
  prTablet: {
    fontSize: 14,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerTablet: {
    marginTop: 12,
  },
  footerText: {
    color: '#666',
    fontSize: 11,
  },
  footerTextTablet: {
    fontSize: 13,
  },
  modeLocal: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
  },
  modeRemote: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '600',
  },
  modeTablet: {
    fontSize: 13,
  },
});
