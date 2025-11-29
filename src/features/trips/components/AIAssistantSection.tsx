/**
 * AI Assistant Section - Generate itinerary / Fill blanks buttons
 * Includes offline mode indicator
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  onGenerateItinerary: () => void;
  onFillBlanks: () => void;
  isGenerating: boolean;
  isModelDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  onDownloadModel: () => void;
}

export function AIAssistantSection({
  onGenerateItinerary,
  onFillBlanks,
  isGenerating,
  isModelDownloaded,
  isDownloading,
  downloadProgress,
  onDownloadModel,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>✨</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>AI ASSISTANT</Text>
          <Text style={styles.subtitle}>
            Let AI generate a personalized{'\n'}itinerary based on your preferences
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.buttonDisabled]}
        onPress={onGenerateItinerary}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        {isGenerating ? (
          <ActivityIndicator color="#000000" size="small" />
        ) : (
          <Text style={styles.generateButtonText}>GENERATE ITINERARY</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.fillButton, isGenerating && styles.buttonDisabled]}
        onPress={onFillBlanks}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        <Text style={styles.fillButtonText}>FILL IN BLANKS</Text>
      </TouchableOpacity>

      {/* Offline Mode Indicator */}
      <View style={styles.offlineSection}>
        <View style={styles.offlineRow}>
          <Text style={styles.offlineIcon}>ⓘ</Text>
          <View style={styles.offlineTextContainer}>
            <Text style={styles.offlineTitle}>OFFLINE MODE AVAILABLE</Text>
            <Text style={styles.offlineSubtitle}>
              Download context data for offline AI assistance
            </Text>
          </View>
        </View>

        {!isModelDownloaded && !isDownloading && (
          <TouchableOpacity style={styles.downloadButton} onPress={onDownloadModel}>
            <Text style={styles.downloadButtonText}>Download</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} />
          </View>
        )}

        {isModelDownloaded && (
          <Text style={styles.downloadedText}>✓ Ready for offline</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  fillButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  fillButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  offlineSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 16,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  offlineIcon: {
    fontSize: 16,
    color: '#666666',
    marginRight: 8,
    marginTop: 2,
  },
  offlineTextContainer: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  offlineSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  downloadButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  progressContainer: {
    marginTop: 12,
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  downloadedText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

