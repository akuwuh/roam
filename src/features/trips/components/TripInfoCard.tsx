/**
 * Trip Info Card - Displays trip details at top of TripDetailScreen
 * Shows name, destination, duration with edit button
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Trip } from '../../../domain/models';

interface Props {
  trip: Trip;
  dayCount: number;
  onEdit: () => void;
}

export function TripInfoCard({ trip, dayCount, onEdit }: Props) {
  const formatDuration = () => {
    if (dayCount === 0) return '0 days';
    if (dayCount === 1) return '1 day';
    return `${dayCount} days`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip.name || 'UNTITLED TRIP'}</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>EDIT</Text>
        </TouchableOpacity>
      </View>
      
      {!trip.startDate && !trip.destination && (
        <Text style={styles.noDatesText}>No dates set</Text>
      )}

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>DESTINATION</Text>
          <Text style={styles.infoValue}>
            {trip.destination || 'Not set'}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>DURATION</Text>
          <Text style={styles.infoValue}>{formatDuration()}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    letterSpacing: 0.5,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  noDatesText: {
    fontSize: 14,
    color: '#999999',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
});

