/**
 * Chat Message Bubble Component
 * Migrated from src/components/ChatMessage.tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ChatMessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessageBubble({
  role,
  content,
  isStreaming = false,
}: ChatMessageBubbleProps) {
  const isUser = role === 'user';

  // Don't render system messages
  if (role === 'system') {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
      >
        <Text
          style={[
            styles.content,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          {content}
          {isStreaming && <Text style={styles.cursor}>▊</Text>}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#000000',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  userContent: {
    color: '#FFFFFF',
  },
  assistantContent: {
    color: '#000000',
  },
  cursor: {
    color: '#666666',
  },
});

