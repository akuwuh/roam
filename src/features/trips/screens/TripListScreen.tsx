/**
 * Trip List Screen - Main screen showing all trips
 * PRD Section 5.1 - Screen 1: Trip List
 */

import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Animation state
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showCreateModal) {
      setModalVisible(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setModalVisible(false);
      });
    }
  }, [showCreateModal]);

  const backdropOpacity = slideAnim;
  const modalTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get('window').height, 0],
  });

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) return;

    setIsCreating(true);
    try {
      const trip = await createNewTrip({
        name: newTripName.trim(),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });
      setShowCreateModal(false);
      setNewTripName('');
      setStartDate(new Date());
      setEndDate(new Date());
      navigation.navigate('Timeline', { tripId: trip.id });
    } finally {
      setIsCreating(false);
    }
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
              <Ionicons name="ellipsis-vertical" size={20} color="#000000" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color="#000000" />
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
            <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
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
          icon="map-outline"
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
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="none"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity 
              style={styles.backdropTouchable} 
              activeOpacity={1} 
              onPress={() => setShowCreateModal(false)}
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.modalContentWrapper, 
              { transform: [{ translateY: modalTranslateY }] }
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={styles.modalContent}>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
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
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        setShowStartDatePicker(!showStartDatePicker);
                        setShowEndDatePicker(false);
                      }}
                    >
                      <Text style={styles.dateButtonText}>
                        {formatDateForDisplay(startDate)}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color="#000000" />
                    </TouchableOpacity>
                    {showStartDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (Platform.OS === 'android') {
                              setShowStartDatePicker(false);
                            }
                            if (selectedDate) {
                              setStartDate(selectedDate);
                              // Auto-adjust end date if it's before start date
                              if (selectedDate > endDate) {
                                setEndDate(selectedDate);
                              }
                            }
                          }}
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity 
                            style={styles.dateConfirmButton}
                            onPress={() => setShowStartDatePicker(false)}
                          >
                            <Text style={styles.dateConfirmText}>Confirm</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        setShowEndDatePicker(!showEndDatePicker);
                        setShowStartDatePicker(false);
                      }}
                    >
                      <Text style={styles.dateButtonText}>
                        {formatDateForDisplay(endDate)}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color="#000000" />
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <View style={styles.datePickerContainer}>
                        <DateTimePicker
                          value={endDate}
                          mode="date"
                          display="spinner"
                          minimumDate={startDate}
                          onChange={(event, selectedDate) => {
                            if (Platform.OS === 'android') {
                              setShowEndDatePicker(false);
                            }
                            if (selectedDate) {
                              setEndDate(selectedDate);
                            }
                          }}
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity 
                            style={styles.dateConfirmButton}
                            onPress={() => setShowEndDatePicker(false)}
                          >
                            <Text style={styles.dateConfirmText}>Confirm</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
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
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
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
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  menuIconButton: {
    padding: 8,
  },
  headerMenuIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
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
    marginBottom: 8,
  },
  tripName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.5,
  },
  daysBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  daysBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tripDates: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    fontWeight: '500',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activitiesBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activitiesBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  tripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    padding: 4,
  },
  menuIcon: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '700',
  },
  arrow: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '700',
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
    bottom: 40,
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#000000',
    alignItems: 'center',
    minWidth: 200,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContentWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
  },
  keyboardView: {
    width: '100%',
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
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000000',
  },
  calendarIcon: {
    fontSize: 18,
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
  datePickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
  },
  dateConfirmButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  dateConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
