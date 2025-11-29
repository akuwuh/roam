/**
 * Trip List Screen - Main screen showing all trips
 * PRD Section 5.1 - Screen 1: Trip List
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useTrips, type TripWithStats } from '../hooks/useTrips';
import { useModelStatus } from '../../../infrastructure/cactus';
import { ModelDownloadBanner, OfflineIndicator, EmptyState } from '../../../shared/components';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TripList'>;
};

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  
  // Same month
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  }
  
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export function TripListScreen({ navigation }: Props) {
  const { trips, isLoading, createNewTrip, deleteTrip } = useTrips();
  const modelStatus = useModelStatus();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMenuForTrip, setShowMenuForTrip] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTrip = async () => {
    if (!newTripName.trim() || !startDate || !endDate) return;

    setIsCreating(true);
    try {
      const trip = await createNewTrip({
        name: newTripName.trim(),
        startDate,
        endDate,
      });
      setShowCreateModal(false);
      setNewTripName('');
      setStartDate('');
      setEndDate('');
      navigation.navigate('Timeline', { tripId: trip.id });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTrip = (tripId: string, tripName: string) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${tripName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setShowMenuForTrip(null);
            await deleteTrip(tripId);
          },
        },
      ]
    );
  };

  const renderTrip = ({ item }: { item: TripWithStats }) => (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={() => navigation.navigate('Timeline', { tripId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.tripCardInner}>
        <View style={styles.tripHeader}>
          <Text style={styles.tripName}>{item.name}</Text>
          <View style={styles.daysBadge}>
            <Text style={styles.daysBadgeText}>
              {item.dayCount} {item.dayCount === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
        
        <Text style={styles.tripDates}>
          {formatDateRange(item.startDate, item.endDate)}
        </Text>
        
        <View style={styles.tripFooter}>
          <View style={styles.activitiesBadge}>
            <Text style={styles.activitiesBadgeText}>
              {item.activityCount} {item.activityCount === 1 ? 'activity' : 'activities'}
            </Text>
          </View>
          <View style={styles.tripActions}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenuForTrip(showMenuForTrip === item.id ? null : item.id)}
            >
              <Text style={styles.menuIcon}>⋮</Text>
            </TouchableOpacity>
            <Text style={styles.arrow}>›</Text>
          </View>
        </View>
      </View>
      
      {/* Menu dropdown */}
      {showMenuForTrip === item.id && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleDeleteTrip(item.id, item.name)}
          >
            <Text style={styles.menuItemTextDelete}>Delete Trip</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Trips</Text>
          <TouchableOpacity
            style={styles.menuIconButton}
            onPress={() => {}}
          >
            <Text style={styles.headerMenuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ModelDownloadBanner
        isDownloading={modelStatus.isDownloading}
        downloadProgress={modelStatus.downloadProgress}
        isDownloaded={modelStatus.isDownloaded}
        onDownload={modelStatus.downloadModel}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      ) : trips.length > 0 ? (
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <EmptyState
          icon="🗺️"
          title="No trips yet"
          subtitle="Create your first trip to get started"
        />
      )}

      {/* New Trip Button */}
      <TouchableOpacity
        style={styles.newButton}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.newButtonText}>+ NEW TRIP</Text>
      </TouchableOpacity>

      {/* Create Trip Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Trip</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Trip Name</Text>
              <TextInput
                style={styles.input}
                value={newTripName}
                onChangeText={setNewTripName}
                placeholder="e.g., Tokyo Adventure"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, isCreating && styles.buttonDisabled]}
                onPress={handleCreateTrip}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  menuIconButton: {
    padding: 8,
  },
  headerMenuIcon: {
    fontSize: 20,
    color: '#000000',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
    overflow: 'visible',
  },
  tripCardInner: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tripName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 12,
  },
  daysBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  daysBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tripDates: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activitiesBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activitiesBadgeText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '500',
  },
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 20,
    color: '#666666',
    fontWeight: '700',
  },
  arrow: {
    fontSize: 24,
    color: '#666666',
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    top: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemTextDelete: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newButton: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  createButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
