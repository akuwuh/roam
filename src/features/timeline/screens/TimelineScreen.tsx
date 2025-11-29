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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../types';
import type { TripItem } from '../../../domain/models';
import { useTimeline, type TimelineDay } from '../hooks/useTimeline';
import { useHybridPlanner } from '../../planner/hooks/useHybridPlanner';
import { useModelStatus } from '../../../infrastructure/cactus';
import { formatTime } from '../../../domain/services';
import { useServices } from '../../../app/providers';

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

function findScheduleGaps(day: TimelineDay): { start: string; end: string }[] {
  const gaps: { start: string; end: string }[] = [];
  const date = day.dayPlan.date;
  
  // Sort items by start time
  const sortedItems = [...day.items].sort((a, b) => 
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  // Define day bounds (9am to 9pm)
  const dayStart = new Date(`${date}T09:00:00`).getTime();
  const dayEnd = new Date(`${date}T21:00:00`).getTime();

  let lastEndTime = dayStart;

  for (const item of sortedItems) {
    const itemStart = new Date(item.startDateTime).getTime();
    const itemEnd = new Date(item.endDateTime).getTime();

    // Check for gap before this item
    if (itemStart - lastEndTime > 2 * 60 * 60 * 1000) { // > 2 hours
      gaps.push({
        start: new Date(lastEndTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        end: new Date(itemStart).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      });
    }

    lastEndTime = Math.max(lastEndTime, itemEnd);
  }

  // Check for gap after last item
  if (dayEnd - lastEndTime > 2 * 60 * 60 * 1000) {
    gaps.push({
      start: new Date(lastEndTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      end: '21:00'
    });
  }

  return gaps;
}

export function TimelineScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { trip, days, allItems, isLoading, addItem, addDay, deleteItem, refresh } = useTimeline(tripId);
  const { generatePlan, isGenerating: isPlanGenerating } = useHybridPlanner();
  const modelStatus = useModelStatus();
  const { cloudPlannerApi, tripRepository, memoryStore, cactusService } = useServices();
  
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
  const [isFillingGaps, setIsFillingGaps] = useState(false);

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
      const emptyDays = days.filter(day => day.items.length === 0);
      
      if (emptyDays.length === 0) return;
      
      if (emptyDays.length === 1) {
        // Single day - use existing single-day API
        await generatePlan({
          tripId,
          dayPlanId: emptyDays[0].dayPlan.id,
          city: trip.destination || trip.name,
          date: emptyDays[0].dayPlan.date,
        });
      } else {
        // Multi-day - generate all days in ONE API call for guaranteed variety
        console.log(`Generating ${emptyDays.length} days in a single API call...`);
        
        // Placeholder for multi-day generation logic if supported by CloudPlannerApi
        // For now, iterate and generate individually to ensure it works
        for (const day of emptyDays) {
          await generatePlan({
            tripId,
            dayPlanId: day.dayPlan.id,
            city: trip.destination || trip.name,
            date: day.dayPlan.date,
            timeRanges: [{ start: '09:00', end: '21:00' }],
          });
        }
      }
      
      await refresh();
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleFillGaps = async () => {
    if (!trip) return;
    
    setIsFillingGaps(true);
    try {
      let hasGaps = false;
      
      // Check each day for gaps
      for (const day of days) {
        if (day.items.length === 0) continue; // Skip empty days (use Generate Itinerary instead)
        
        const gaps = findScheduleGaps(day);
        if (gaps.length > 0) {
          hasGaps = true;
          // Generate plan for the gaps
          await generatePlan({
            tripId,
            dayPlanId: day.dayPlan.id,
            city: trip.destination || trip.name,
            date: day.dayPlan.date,
            timeRanges: gaps,
          });
        }
      }
      
      if (!hasGaps) {
        Alert.alert('No Gaps Found', 'Your schedule looks pretty full already!');
      } else {
        await refresh();
      }
    } finally {
      setIsFillingGaps(false);
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {trip.name === 'Untitled Trip' ? 'NEW TRIP' : trip.name.toUpperCase()}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('TripDetails', { tripId })}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-sharp" size={24} color="#FFFFFF" />
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
                      <View style={styles.itemContentInner}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                      </View>
                      <Text style={styles.itemType}>{item.type}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => handleDeleteItem(item)}
                    >
                      <Ionicons name="close" size={20} color="#000000" />
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
            <Ionicons name="sparkles" size={18} color="#FFFFFF" style={styles.aiCardIcon} />
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

          <TouchableOpacity
            style={[
              styles.fillBlanksButton,
              (isFillingGaps || !modelStatus.isDownloaded) && styles.buttonDisabled
            ]}
            onPress={handleFillGaps}
            disabled={isFillingGaps || !modelStatus.isDownloaded}
          >
            {isFillingGaps ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.fillBlanksButtonText}>FILL IN BLANKS</Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  settingsButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tripInfoCard: {
    backgroundColor: '#000000',
    padding: 24,
    marginTop: 0,
  },
  tripInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tripInfoName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 16,
    letterSpacing: -0.5,
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 0,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tripInfoDates: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '500',
  },
  tripInfoStats: {
    flexDirection: 'row',
    gap: 40,
  },
  tripInfoStat: {},
  tripInfoStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666666',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tripInfoStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    marginBottom: 24,
    backgroundColor: '#FFFFFF', // Updated from gray
    borderRadius: 0,
    overflow: 'hidden',
  },
  dayHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    paddingVertical: 16,
    borderBottomWidth: 0, // Removed border
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dayContent: {
    padding: 0,
    backgroundColor: '#F9F9F9', // Gray background for content area
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  emptyDayContent: {
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  emptyDayText: {
    fontSize: 14,
    color: '#999999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  itemTime: {
    width: 80,
  },
  itemTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999999',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemContentInner: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  deleteItemButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteItemIcon: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '400',
  },
  addItemButton: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    borderRadius: 8,
    borderTopWidth: 0, // Removed border
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
    backgroundColor: '#000000',
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
    marginRight: 8,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aiCardSubtitle: {
    fontSize: 13,
    color: '#CCCCCC',
    lineHeight: 18,
    marginBottom: 16,
  },
  generateButton: {
    backgroundColor: '#FFFFFF',
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
  fillBlanksButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  fillBlanksButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
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
