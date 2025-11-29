/**
 * Chat Screen - Trip Assistant AI chat
 * Matches mockup: dark header, bot avatar, structured responses
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useTripBrain } from '../hooks/useTripBrain';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { QuickActions } from '../components/QuickActions';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const WELCOME_MESSAGE = {
  role: 'assistant' as const,
  content: "Hi! I'm your trip assistant. I can help you with questions about your itinerary, suggest changes, and rearrange your schedule. What would you like to know?",
};

export function ChatScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const {
    messages,
    isGenerating,
    isDownloading,
    downloadProgress,
    isModelReady,
    error,
    ask,
    clearChat,
    downloadModel,
  } = useTripBrain(tripId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setShowWelcome(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleQuickAction = (action: string) => {
    ask(action);
  };

  const displayMessages = showWelcome && messages.length === 0 
    ? [WELCOME_MESSAGE] 
    : messages;

  const renderMessage = ({ item, index }: { item: any; index: number }) => (
    <ChatMessageBubble
      role={item.role}
      content={item.content}
      isStreaming={isGenerating && index === displayMessages.length - 1 && item.role === 'assistant'}
    />
  );

  const renderDownloadState = () => (
    <View style={styles.downloadContainer}>
      <Text style={styles.downloadTitle}>
        {isDownloading ? 'Downloading AI Model...' : 'AI Model Required'}
      </Text>
      {isDownloading ? (
        <>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
        </>
      ) : (
        <>
          <Text style={styles.downloadSubtitle}>
            Download to chat offline about your trip
          </Text>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={downloadModel}
            activeOpacity={0.8}
          >
            <Text style={styles.downloadButtonText}>Download Model</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  if (!isModelReady) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Assistant</Text>
          <TouchableOpacity style={styles.menuButton}>
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
        {renderDownloadState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Dark Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Assistant</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(_, index) => index.toString()}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {/* Quick Actions */}
        <QuickActions onAction={handleQuickAction} />

        {/* Chat Input */}
        <ChatInput
          onSend={ask}
          disabled={isGenerating}
          placeholder={isGenerating ? 'Thinking...' : 'Ask about your itinerary...'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  chatContainer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  downloadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  downloadSubtitle: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  downloadButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 4,
  },
  progressText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 12,
  },
  errorBanner: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  errorText: {
    color: '#FF0000',
    fontSize: 14,
    textAlign: 'center',
  },
});
