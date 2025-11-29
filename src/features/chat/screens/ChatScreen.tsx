/**
 * Chat Screen - Trip Brain AI chat
 * PRD Section 5.3 - Screen 3: Chat / Trip Brain
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../types';
import { useTripBrain, type PendingAction } from '../hooks/useTripBrain';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageBubble } from '../components/ChatMessageBubble';
import { EmptyState } from '../../../shared/components';
import { useNetwork } from '../../../app/providers';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export function ChatScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { isOnline } = useNetwork();
  const flatListRef = useRef<FlatList>(null);
  const {
    messages,
    isGenerating,
    isDownloading,
    downloadProgress,
    isModelReady,
    error,
    kbStatus,
    pendingAction,
    ask,
    clearChat,
    downloadModel,
    applyPendingAction,
    dismissPendingAction,
  } = useTripBrain(tripId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderMessage = ({ item, index }: { item: any; index: number }) => (
    <ChatMessageBubble
      role={item.role}
      content={item.content}
      isStreaming={isGenerating && index === messages.length - 1 && item.role === 'assistant'}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="🧠"
      title="Trip Brain"
      subtitle="Ask me anything about your itinerary. I can help with questions, suggestions, and schedule changes."
    />
  );

  const renderKBStatus = () => (
    <View style={styles.kbStatusContainer}>
      <View style={[
        styles.kbStatusDot,
        { backgroundColor: kbStatus.isSynced ? '#10B981' : '#FFA500' }
      ]} />
      <Text style={styles.kbStatusText}>
        {kbStatus.isSynced 
          ? `KB synced (${kbStatus.totalCount} items)` 
          : 'KB not synced'}
      </Text>
      {isOnline && !kbStatus.isSynced && (
        <Text style={styles.kbStatusHint}>Generate itinerary to sync</Text>
      )}
    </View>
  );

  const renderPendingAction = () => {
    if (!pendingAction) return null;

    return (
      <View style={styles.actionContainer}>
        <View style={styles.actionHeader}>
          <Text style={styles.actionIcon}>📝</Text>
          <Text style={styles.actionTitle}>Suggested Change</Text>
        </View>
        <Text style={styles.actionDescription}>{pendingAction.description}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={dismissPendingAction}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={applyPendingAction}
          >
            <Text style={styles.applyButtonText}>Apply Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TRIP BRAIN</Text>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
              <Text style={styles.statusBadgeText}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>
        </View>
        {renderDownloadState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TRIP BRAIN</Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
            <Text style={styles.statusBadgeText}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderKBStatus()}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {renderPendingAction()}

      <View style={styles.inputContainer}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => ask("What's on my schedule today?")}
            disabled={isGenerating}
          >
            <Text style={styles.quickActionText}>Today's Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => ask("Do I have any free time?")}
            disabled={isGenerating}
          >
            <Text style={styles.quickActionText}>Free Time?</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => ask("What should I know about this destination?")}
            disabled={isGenerating}
          >
            <Text style={styles.quickActionText}>Tips</Text>
          </TouchableOpacity>
        </View>

        <ChatInput
          onSend={ask}
          disabled={isGenerating}
          placeholder={isGenerating ? 'Thinking...' : 'Ask about your trip...'}
        />
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    paddingTop: 60, // Status bar
  },
  backButton: {
    fontSize: 24,
    color: '#FFFFFF',
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  onlineBadge: {
    backgroundColor: '#000000',
  },
  offlineBadge: {
    backgroundColor: '#333333',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kbStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  kbStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 0, // Square dot
    marginRight: 8,
  },
  kbStatusText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kbStatusHint: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionDescription: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  inputContainer: {
    borderTopWidth: 2,
    borderTopColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  quickActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
  },
  quickActionText: {
    fontSize: 12,
    color: '#000000',
    fontWeight: '700',
    textTransform: 'uppercase',
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
