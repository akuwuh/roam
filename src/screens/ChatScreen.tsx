import React, { useRef, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  SafeAreaView,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { ChatMessage, ChatMessageProps } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { useChatbot } from '../hooks/useChatbot';

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const itinerary = route.params?.itinerary;
  const flatListRef = useRef<FlatList>(null);
  const {
    messages,
    isGenerating,
    isDownloading,
    downloadProgress,
    isModelReady,
    error,
    sendMessage,
    clearChat,
    downloadModel,
  } = useChatbot(itinerary);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderMessage = ({ item, index }: { item: ChatMessageProps; index: number }) => (
    <ChatMessage 
      {...item} 
      isStreaming={isGenerating && index === messages.length - 1 && item.role === 'assistant'}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Travel Assistant</Text>
      <Text style={styles.emptySubtitle}>
        Ask me anything about your itinerary
      </Text>
      <Text style={styles.emptyHint}>
        Works offline • Powered by local AI
      </Text>
    </View>
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
          <Text style={styles.progressText}>
            {Math.round(downloadProgress * 100)}%
          </Text>
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Travel Assistant</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearChat}>
            <Text style={styles.clearButton}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (!isModelReady && !isDownloading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderHeader()}
        {renderDownloadState()}
      </SafeAreaView>
    );
  }

  if (isDownloading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {renderHeader()}
        {renderDownloadState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {renderHeader()}
      
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
          messages.length === 0 && styles.messageListEmpty
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <ChatInput 
        onSend={sendMessage}
        disabled={isGenerating}
        placeholder={isGenerating ? "AI is thinking..." : "Ask about your trip..."}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  backButton: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  clearButton: {
    fontSize: 14,
    color: '#666666',
  },
  messageList: {
    paddingVertical: 16,
  },
  messageListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
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

