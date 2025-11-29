/**
 * Timeline Screen - Trip timeline with days and items
 * PRD Section 5.2 - Screen 2: Timeline View
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../types';
import type { TripItem } from '../../../domain/models';
import { useTimeline, type TimelineDay } from '../hooks/useTimeline';
import { useHybridPlanner } from '../../planner/hooks/useHybridPlanner';
import { OfflineIndicator, EmptyState } from '../../../shared/components';
import { formatTime } from '../../../domain/services';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Timeline'>;
  route: RouteProp<RootStackParamList, 'Timeline'>;
};

export function TimelineScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { trip, days, isLoading, addItem, deleteItem } = useTimeline(tripId);
  const { generatePlan, isGenerating: isPlanGenerating } = useHybridPlanner();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemStart, setNewItemStart] = useState('');
  const [newItemEnd, setNewItemEnd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async () => {
    if (!selectedDayId || !newItemTitle.trim() || !newItemStart || !newItemEnd) return;

    const selectedDay = days.find((d) => d.dayPlan.id === selectedDayId);
    if (!selectedDay) return;

    Keyboard.dismiss();
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

  const handleCloseModal = () => {
    Keyboard.dismiss();
    setShowAddModal(false);
    resetAddForm();
  };

  const handleGeneratePlan = async (dayPlan: TimelineDay['dayPlan']) => {
    await generatePlan({
      tripId,
      dayPlanId: dayPlan.id,
      city: trip?.name ?? 'Destination',
      date: dayPlan.date,
    });
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('TripList')}>
          <Text style={styles.backButton}>← Trips</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{trip.name}</Text>
          <OfflineIndicator compact />
        </View>
        <Text style={styles.subtitle}>
          {trip.startDate} → {trip.endDate}
        </Text>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {days.map((day) => (
          <View key={day.dayPlan.id} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>Day {day.dayPlan.dayNumber}</Text>
              <Text style={styles.dayDate}>{day.dayPlan.date}</Text>
            </View>

            {day.items.length > 0 ? (
              day.items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemTime}>
                    <Text style={styles.itemTimeText}>
                      {formatTime(item.startDateTime)}
                    </Text>
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemType}>{item.type}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyDay}>
                <Text style={styles.emptyDayText}>No activities yet</Text>
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => handleGeneratePlan(day.dayPlan)}
                  disabled={isPlanGenerating}
                >
                  {isPlanGenerating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.generateButtonText}>Generate with AI</Text>
                  )}
                </TouchableOpacity>
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
      </ScrollView>

      {/* Removed since we now have bottom tabs for navigation */}

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalBackdrop} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <ScrollView 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Add Activity</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Activity Name</Text>
                  <TextInput
                    style={styles.input}
                    value={newItemTitle}
                    onChangeText={setNewItemTitle}
                    placeholder="e.g., Visit Temple"
                    placeholderTextColor="#999999"
                    returnKeyType="next"
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
                      returnKeyType="next"
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
                      returnKeyType="done"
                      onSubmitEditing={handleAddItem}
                    />
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseModal}
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
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
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  daySection: {
    marginBottom: 32,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  dayDate: {
    fontSize: 14,
    color: '#666666',
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
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
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
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyDayText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addItemButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
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
    backgroundColor: '#F5F5F5',
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
  buttonDisabled: {
    opacity: 0.5,
  },
});
