import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessions } from '../hooks/useSession';
import { useLayout } from '../hooks/useLayout';
import { SessionCard } from '../components/SessionCard';
import { isAuthenticated } from '../auth/authStore';

export default function HomeScreen() {
  const router = useRouter();
  const { sessions, loading, refresh } = useSessions();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const layout = useLayout();

  useEffect(() => {
    isAuthenticated().then(setAuthed);
  }, []);

  if (authed === false) {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { fontSize: layout.fontSize.title }]}>
          Welcome to Cheerful
        </Text>
        <Text style={[styles.subtitle, { fontSize: layout.fontSize.subtitle }]}>
          Mobile control for Cursor Cloud Agents
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, layout.isTablet && styles.loginButtonTablet]}
          onPress={() => router.push('/auth')}
        >
          <Text style={[styles.loginText, { fontSize: layout.fontSize.body }]}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        numColumns={layout.columns}
        key={`grid-${layout.columns}`}
        renderItem={({ item }) => (
          <View style={layout.columns > 1 ? { flex: 1 / layout.columns, padding: 4 } : undefined}>
            <SessionCard
              session={item}
              onPress={() => router.push(`/session/${item.id}`)}
              isTablet={layout.isTablet}
            />
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { fontSize: layout.fontSize.subtitle + 4 }]}>
                No Sessions
              </Text>
              <Text style={[styles.emptyText, { fontSize: layout.fontSize.caption }]}>
                Start a session using the Cheerful CLI on your computer.
              </Text>
              <Text style={[styles.emptyCode, { fontSize: layout.fontSize.caption }]}>
                cheerful --repo https://github.com/your-org/your-repo
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={[
          sessions.length === 0 ? styles.emptyContainer : styles.listContent,
          layout.isTablet && { paddingHorizontal: layout.horizontalPadding },
        ]}
      />
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
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  loginButtonTablet: {
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 16,
  },
  loginText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  empty: {
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCode: {
    color: '#A0A0FF',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#1A1A2E',
    padding: 14,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
