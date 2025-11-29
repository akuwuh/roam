/**
 * Chat Message Bubble Component
 * Shows bot avatar, user messages, and parses structured responses
 * Renders markdown for assistant messages
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Markdown from 'react-native-markdown-display';

export interface ChatMessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

interface SuggestionCard {
  type: string;
  icon: string;
  content: string;
}

// Filter out reasoning tags (<think>, </think>) from model output
function filterReasoningTags(content: string): string {
  // Remove <think>...</think> blocks entirely (including content)
  let filtered = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Also remove standalone opening tags (for streaming)
  filtered = filtered.replace(/<think>/gi, '');
  filtered = filtered.replace(/<\/think>/gi, '');
  // Clean up excessive whitespace
  filtered = filtered.replace(/\n{3,}/g, '\n\n').trim();
  return filtered;
}

// Parse structured responses like "ROUTE: ..." or "TIMING: ..."
function parseStructuredContent(content: string): { text: string; cards: SuggestionCard[] } {
  const filteredContent = filterReasoningTags(content);
  const cards: SuggestionCard[] = [];
  const lines = filteredContent.split('\n');
  const textLines: string[] = [];
  
  const typeIcons: Record<string, string> = {
    'ROUTE': '🔀',
    'TIMING': '🕐',
    'FOOD': '🍴',
    'ACTIVITY': '🎯',
    'TRANSPORT': '🚗',
    'SUGGESTION': '💡',
  };

  for (const line of lines) {
    // Check if line starts with a known tag
    const match = line.match(/^(ROUTE|TIMING|FOOD|ACTIVITY|TRANSPORT|SUGGESTION):\s*(.+)/i);
    if (match) {
      const type = match[1].toUpperCase();
      cards.push({
        type,
        icon: typeIcons[type] || '💡',
        content: match[2].trim(),
      });
    } else {
      textLines.push(line);
    }
  }

  return { text: textLines.join('\n').trim(), cards };
}

function SuggestionCardView({ card }: { card: SuggestionCard }) {
  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.header}>
        <View style={cardStyles.badge}>
          <Text style={cardStyles.badgeText}>{card.type}</Text>
        </View>
        <Text style={cardStyles.icon}>{card.icon}</Text>
      </View>
      <Text style={cardStyles.content}>{card.content}</Text>
    </View>
  );
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

  // Parse structured content for assistant messages
  const parsed = !isUser ? parseStructuredContent(content) : { text: content, cards: [] };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {/* Bot Avatar */}
      {!isUser && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🤖</Text>
          </View>
        </View>
      )}

      <View style={styles.messageContainer}>
        {/* Text Bubble */}
        {parsed.text ? (
          <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
            {isUser ? (
              <Text style={[styles.content, styles.userContent]}>
                {parsed.text}
              </Text>
            ) : (
              <View style={styles.markdownContainer}>
                <Markdown style={markdownStyles}>
                  {parsed.text}
                </Markdown>
                {isStreaming && <Text style={styles.cursor}>▊</Text>}
              </View>
            )}
          </View>
        ) : null}

        {/* Suggestion Cards */}
        {parsed.cards.length > 0 && (
          <View style={styles.cardsContainer}>
            {parsed.cards.map((card, index) => (
              <SuggestionCardView key={index} card={card} />
            ))}
          </View>
        )}
      </View>

      {/* User Avatar Placeholder */}
      {isUser && (
        <View style={styles.userAvatarContainer}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>👤</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 0, // Sharp
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  userAvatarContainer: {
    marginLeft: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 0, // Sharp
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
  },
  messageContainer: {
    flex: 1,
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 0, // Sharp corners for brutalist look
  },
  userBubble: {
    backgroundColor: '#000000',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Tech/Brutalist font
  },
  userContent: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  assistantContent: {
    color: '#000000',
    fontWeight: '500',
  },
  markdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  cursor: {
    color: '#000000',
    fontSize: 15,
    marginLeft: 2,
  },
  cardsContainer: {
    marginTop: 12,
    gap: 10,
  },
});

// Markdown styles for assistant messages
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  heading1: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    marginTop: 12,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    marginTop: 10,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    marginTop: 8,
  },
  paragraph: {
    marginBottom: 8,
    marginTop: 0,
  },
  strong: {
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    marginBottom: 4,
    flexDirection: 'row',
  },
  bullet_list_icon: {
    marginRight: 8,
    fontSize: 15,
    color: '#000000',
  },
  ordered_list_icon: {
    marginRight: 8,
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  code_inline: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  code_block: {
    backgroundColor: '#E5E5E5',
    padding: 12,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: '#E5E5E5',
    padding: 12,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  blockquote: {
    backgroundColor: '#F0F0F0',
    borderLeftWidth: 3,
    borderLeftColor: '#000000',
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: '#000000',
    height: 2,
    marginVertical: 12,
  },
  link: {
    color: '#000000',
    textDecorationLine: 'underline',
  },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0, // Sharp
    padding: 16,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    fontWeight: '500',
  },
});
