import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLayout } from '../hooks/useLayout';
import { setAuth, setServerUrl } from '../auth/authStore';
import { loginWithPassword } from '../sync/sessionSync';
import { config } from '../constants/config';

export default function AuthScreen() {
  const router = useRouter();
  const [serverUrl, setServerUrlInput] = useState(config.serverUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const layout = useLayout();

  const handleLogin = async () => {
    const url = serverUrl.trim();
    if (!url) {
      Alert.alert('Error', 'Please enter the server URL');
      return;
    }
    const u = username.trim();
    if (!u) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await setServerUrl(url);
      const { token, userId } = await loginWithPassword(url, u, password);
      await setAuth(token, userId);
      router.replace('/');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const formMaxWidth = layout.isTablet ? 480 : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.content,
          layout.isTablet && styles.contentTablet,
          formMaxWidth ? { maxWidth: formMaxWidth } : undefined,
        ]}
      >
        <Text style={[styles.title, { fontSize: layout.fontSize.title - 4 }]}>
          Login to Cheerful
        </Text>
        <Text style={[styles.subtitle, { fontSize: layout.fontSize.caption + 1 }]}>
          Use the server preset username and password
        </Text>

        <TextInput
          style={[styles.input, layout.isTablet && styles.inputTablet]}
          value={serverUrl}
          onChangeText={setServerUrlInput}
          placeholder="Server URL (e.g. http://192.168.1.100:3005)"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TextInput
          style={[styles.input, layout.isTablet && styles.inputTablet]}
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={[styles.input, layout.isTablet && styles.inputTablet]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[
            styles.button,
            layout.isTablet && styles.buttonTablet,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { fontSize: layout.fontSize.body }]}>
            {loading ? 'Connecting...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { fontSize: layout.fontSize.small + 1 }]}>
          Ask your server admin for the preset username and password.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  contentTablet: {
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 48,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#E0E0E0',
    fontSize: 16,
    marginBottom: 16,
  },
  inputTablet: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 18,
    marginBottom: 20,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonTablet: {
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  code: {
    color: '#A0A0FF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
