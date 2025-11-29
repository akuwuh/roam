/**
 * Model Download Banner - Shows AI model download progress
 * PRD Section 5.1 - Download progress UI
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface ModelDownloadBannerProps {
  isDownloading: boolean;
  downloadProgress: number;
  isDownloaded: boolean;
  onDownload: () => void;
}

export function ModelDownloadBanner({
  isDownloading,
  downloadProgress,
  isDownloaded,
  onDownload,
}: ModelDownloadBannerProps) {
  if (isDownloaded) {
    return null;
  }

  if (isDownloading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.text}>Downloading AI model...</Text>
        </View>
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(downloadProgress * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onDownload} activeOpacity={0.8}>
      <View style={styles.content}>
        <Text style={styles.icon}>⬇️</Text>
        <View>
          <Text style={styles.text}>Download AI Model</Text>
          <Text style={styles.subtext}>Required for offline chat</Text>
        </View>
      </View>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  subtext: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  arrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    fontSize: 20,
    color: '#666666',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
});

