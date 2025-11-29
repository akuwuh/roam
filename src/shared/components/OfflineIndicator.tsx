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
        {isOnline ? 'ONLINE' : 'OFFLINE'}
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
    borderRadius: 0,
    gap: 6,
    borderWidth: 1,
  },
  online: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
  },
  offline: {
    backgroundColor: '#E5E5E5',
    borderColor: '#666666',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 0, // Square dot
  },
  dotOnline: {
    backgroundColor: '#000000',
  },
  dotOffline: {
    backgroundColor: '#666666',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textOnline: {
    color: '#000000',
  },
  textOffline: {
    color: '#666666',
  },
});

