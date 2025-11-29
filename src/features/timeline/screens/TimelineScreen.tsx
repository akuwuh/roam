/**
 * Timeline Screen - Trip timeline with days and items
 * PRD Section 5.2 - Screen 2: Timeline View
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../types';
import type { TripItem } from '../../../domain/models';
import { useTimeline, type TimelineDay } from '../hooks/useTimeline';
import { useHybridPlanner } from '../../planner/hooks/useHybridPlanner';
import { useModelStatus } from '../../../infrastructure/cactus';
import { formatTime } from '../../../domain/services';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Timeline'>;
  route: RouteProp<RootStackParamList, 'Timeline'>;
};

function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

export function TimelineScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { trip, days, allItems, isLoading, addItem, addDay, deleteItem, refresh } = useTimeline(tripId);
  const { generatePlan, isGenerating: isPlanGenerating } = useHybridPlanner();
  const modelStatus = useModelStatus();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemStart, setNewItemStart] = useState('');
  const [newItemEnd, setNewItemEnd] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);

  const handleAddItem = async () => {
    if (!selectedDayId || !newItemTitle.trim() || !newItemStart || !newItemEnd) return;

    const selectedDay = days.find((d) => d.dayPlan.id === selectedDayId);
    if (!selectedDay) return;

    setIsAdding(true);
    try {
      await addItem({
        dayPlanId: selectedDayId,
        type: 'activity',
        title: newItemTitle.trim(),
        startDateTime: `${selectedDay.dayPlan.date}T${newItemStart}:00`,
        endDateTime: `${selectedDay.dayPlan.date}T${newItemEnd}:00`,
      });
      setShowAddModal(false);
      resetAddForm();
    } finally {
      setIsAdding(false);
    }
  };

  const resetAddForm = () => {
    setNewItemTitle('');
    setNewItemStart('');
    setNewItemEnd('');
    setSelectedDayId(null);
  };

  const handleEditItem = (item: TripItem) => {
    setEditingItem(item);
    setNewItemTitle(item.title);
    // Extract time from datetime
    const startTime = item.startDateTime.split('T')[1]?.substring(0, 5) || '';
    const endTime = item.endDateTime.split('T')[1]?.substring(0, 5) || '';
    setNewItemStart(startTime);
    setNewItemEnd(endTime);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !newItemTitle.trim() || !newItemStart || !newItemEnd) return;

    setIsAdding(true);
    try {
      const date = editingItem.startDateTime.split('T')[0];
      await addItem({
        dayPlanId: editingItem.dayPlanId,
        type: editingItem.type,
        title: newItemTitle.trim(),
        startDateTime: `${date}T${newItemStart}:00`,
        endDateTime: `${date}T${newItemEnd}:00`,
      });
      // Delete old item
      await deleteItem(editingItem.id);
      setShowEditModal(false);
      setEditingItem(null);
      resetAddForm();
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddDay = async () => {
    setIsAddingDay(true);
    try {
      await addDay();
    } finally {
      setIsAddingDay(false);
    }
  };

  const handleGenerateItinerary = async () => {
    if (!trip) return;
    
    setIsGeneratingFull(true);
    try {
      // Generate plan for each empty day
      for (const day of days) {
        if (day.items.length === 0) {
          await generatePlan({
            tripId,
            dayPlanId: day.dayPlan.id,
            city: trip.destination || trip.name,
            date: day.dayPlan.date,
          });
        }
      }
      await refresh();
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleDeleteItem = (item: TripItem) => {
    Alert.alert(
      'Delete Activity',
      `Remove "${item.title}" from your itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(item.id);
          },
        },
      ]
    );
  };

  if (isLoading || !trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000" />
        </View>
      </SafeAreaView>
    );
  }

  const totalActivities = allItems.length;
  const hasEmptyDays = days.some(d => d.items.length === 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {trip.name === 'Untitled Trip' ? 'NEW TRIP' : trip.name.toUpperCase()}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('TripDetails', { tripId })}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Info Card */}
        <View style={styles.tripInfoCard}>
          <View style={styles.tripInfoHeader}>
            <Text style={styles.tripInfoName}>
              {trip.name || 'UNTITLED TRIP'}
            </Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => navigation.navigate('TripDetails', { tripId })}
            >
              <Text style={styles.editButtonText}>EDIT</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.tripInfoDates}>
            {trip.startDate && trip.endDate 
              ? `${trip.startDate} - ${trip.endDate}`
              : 'No dates set'}
          </Text>
          <View style={styles.tripInfoStats}>
            <View style={styles.tripInfoStat}>
              <Text style={styles.tripInfoStatLabel}>DESTINATION</Text>
              <Text style={styles.tripInfoStatValue}>
                {trip.destination || 'Not set'}
              </Text>
            </View>
            <View style={styles.tripInfoStat}>
              <Text style={styles.tripInfoStatLabel}>DURATION</Text>
              <Text style={styles.tripInfoStatValue}>
                {trip.startDate && trip.endDate 
                  ? `${calculateDuration(trip.startDate, trip.endDate)} days`
                  : '0 days'}
              </Text>
            </View>
          </View>
        </View>

        {/* Itinerary Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ITINERARY</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {/* Empty State or Days */}
        {totalActivities === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>NO PLANS YET</Text>
            <Text style={styles.emptySubtitle}>
              Start building your itinerary by adding trip details or let AI generate one for you
            </Text>
          </View>
        ) : null}

        {/* Day Sections */}
        {days.map((day) => (
          <View key={day.dayPlan.id} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>DAY {day.dayPlan.dayNumber}</Text>
            </View>

            {day.items.length > 0 ? (
              <View style={styles.dayContent}>
                {day.items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemTime}>
                      <Text style={styles.itemTimeText}>
                        {formatTime(item.startDateTime)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.itemContent}
                      onPress={() => handleEditItem(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemType}>{item.type}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => handleDeleteItem(item)}
                    >
                      <Text style={styles.deleteItemIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDayContent}>
                <Text style={styles.emptyDayText}>EMPTY</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => {
                setSelectedDayId(day.dayPlan.id);
                setShowAddModal(true);
              }}
            >
              <Text style={styles.addItemButtonText}>+ Add Activity</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Day Button */}
        <TouchableOpacity
          style={styles.addDayButton}
          onPress={handleAddDay}
          disabled={isAddingDay}
        >
          {isAddingDay ? (
            <ActivityIndicator size="small" color="#666666" />
          ) : (
            <Text style={styles.addDayButtonText}>+ ADD DAY</Text>
          )}
        </TouchableOpacity>

        {/* AI Assistant Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <Text style={styles.aiCardIcon}>✨</Text>
            <Text style={styles.aiCardTitle}>AI ASSISTANT</Text>
          </View>
          <Text style={styles.aiCardSubtitle}>
            Let AI generate a personalized itinerary based on your preferences
          </Text>
          
          <TouchableOpacity
            style={[
              styles.generateButton,
              (isGeneratingFull || !hasEmptyDays) && styles.buttonDisabled
            ]}
            onPress={handleGenerateItinerary}
            disabled={isGeneratingFull || !hasEmptyDays}
          >
            {isGeneratingFull ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.generateButtonText}>GENERATE ITINERARY</Text>
            )}
          </TouchableOpacity>
          
          {!hasEmptyDays && totalActivities > 0 && (
            <Text style={styles.aiHelperText}>
              All days have activities. Use Trip Brain to get suggestions.
            </Text>
          )}
        </View>

        {/* Offline Mode Indicator */}
        {modelStatus.isDownloaded && (
          <View style={styles.offlineIndicator}>
            <Text style={styles.offlineIcon}>ℹ️</Text>
            <View style={styles.offlineTextContainer}>
              <Text style={styles.offlineTitle}>OFFLINE MODE AVAILABLE</Text>
              <Text style={styles.offlineSubtitle}>
                Download context data for offline AI assistance
              </Text>
            </View>
          </View>
        )}

        {/* Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { tripId })}
          activeOpacity={0.8}
        >
          <Text style={styles.chatButtonText}>💬 Ask Trip Brain</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Activity</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity Name</Text>
              <TextInput
                style={styles.input}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="e.g., Visit Temple"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={newItemStart}
                  onChangeText={setNewItemStart}
                  placeholder="09:00"
                  placeholderTextColor="#999999"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={newItemEnd}
                  onChangeText={setNewItemEnd}
                  placeholder="11:00"
                  placeholderTextColor="#999999"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, isAdding && styles.buttonDisabled]}
                onPress={handleAddItem}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Activity</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity Name</Text>
              <TextInput
                style={styles.input}
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                placeholder="e.g., Visit Temple"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={newItemStart}
                  onChangeText={setNewItemStart}
                  placeholder="09:00"
                  placeholderTextColor="#999999"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={newItemEnd}
                  onChangeText={setNewItemEnd}
                  placeholder="11:00"
                  placeholderTextColor="#999999"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                  resetAddForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, isAdding && styles.buttonDisabled]}
                onPress={handleSaveEdit}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.createButtonText}>Save</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    fontSize: 24,
    color: '#FFFFFF',
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tripInfoCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  tripInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripInfoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 0.5,
  },
  tripInfoDates: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  tripInfoStats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 32,
  },
  tripInfoStat: {},
  tripInfoStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tripInfoStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  daySection: {
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  dayContent: {
    padding: 16,
  },
  emptyDayContent: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    margin: 16,
    borderRadius: 8,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#999999',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemTime: {
    width: 60,
  },
  itemTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  itemContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  itemType: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  deleteItemButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  deleteItemIcon: {
    fontSize: 28,
    color: '#000000',
    fontWeight: '300',
  },
  addItemButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  addItemButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  addDayButton: {
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  addDayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 0.5,
  },
  aiCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiCardIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  aiCardSubtitle: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  aiHelperText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    marginBottom: 16,
  },
  offlineIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  offlineTextContainer: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  offlineSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  chatButton: {
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
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
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
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
});
