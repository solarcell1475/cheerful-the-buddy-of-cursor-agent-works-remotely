import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isTablet?: boolean;
}

export function MessageInput({ onSend, disabled, placeholder, isTablet }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <TextInput
        style={[styles.input, isTablet && styles.inputTablet]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder || 'Send a message...'}
        placeholderTextColor="#666"
        multiline
        maxLength={4096}
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          isTablet && styles.sendButtonTablet,
          (!text.trim() || disabled) && styles.sendDisabled,
        ]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Text style={[styles.sendText, isTablet && styles.sendTextTablet]}>
          {Platform.OS === 'web' ? 'Send' : '\u27A4'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0F0F1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A4A',
  },
  containerTablet: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0A0A14',
    borderTopColor: '#1E293B',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#E0E0E0',
    fontSize: 14,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  inputTablet: {
    backgroundColor: '#111827',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    maxHeight: 160,
    borderColor: '#334155',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonTablet: {
    marginLeft: 12,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    minWidth: 56,
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  sendTextTablet: {
    fontSize: 18,
  },
});
