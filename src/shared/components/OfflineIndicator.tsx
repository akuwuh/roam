/**
 * Offline Indicator - Shows network status
 * PRD - Offline capability indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '../../app/providers';

interface OfflineIndicatorProps {
  compact?: boolean;
}

export function OfflineIndicator({ compact = false }: OfflineIndicatorProps) {
  const { isOnline, status } = useNetwork();

  if (status === 'unknown') {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
    );
  }

  return (
    <View style={[styles.container, isOnline ? styles.online : styles.offline]}>
      <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
      <Text style={[styles.text, isOnline ? styles.textOnline : styles.textOffline]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  online: {
    backgroundColor: '#E8F5E9',
  },
  offline: {
    backgroundColor: '#FFF3E0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOnline: {
    backgroundColor: '#4CAF50',
  },
  dotOffline: {
    backgroundColor: '#FF9800',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textOnline: {
    color: '#2E7D32',
  },
  textOffline: {
    color: '#E65100',
  },
});

