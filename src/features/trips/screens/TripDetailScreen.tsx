/**
 * Trip Detail Screen - Main itinerary view with AI assistant
 * Matches mockup: header, trip info card, day sections, AI section
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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import { useTimeline, type TimelineDay } from '../../timeline/hooks/useTimeline';
import { useHybridPlanner } from '../../planner/hooks/useHybridPlanner';
import { useModelStatus } from '../../../infrastructure/cactus';
import { TripInfoCard } from '../components/TripInfoCard';
import { DaySection } from '../components/DaySection';
import { AIAssistantSection } from '../components/AIAssistantSection';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;

export function TripDetailScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { trip, days, isLoading, addItem, deleteItem, refresh } = useTimeline(tripId);
  const { generatePlan, isGenerating } = useHybridPlanner();
  const modelStatus = useModelStatus();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemStart, setNewItemStart] = useState('');
  const [newItemEnd, setNewItemEnd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleGenerateItinerary = async () => {
    if (!trip) return;
    
    // Generate for all days
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
    refresh();
  };

  const handleFillBlanks = async () => {
    if (!trip) return;
    
    // Only fill days that are empty
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
    refresh();
  };

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

  const openAddModal = (dayPlanId: string) => {
    setSelectedDayId(dayPlanId);
    setShowAddModal(true);
  };

  const totalActivities = days.reduce((sum, d) => sum + d.items.length, 0);
  const hasAnyActivities = totalActivities > 0;

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
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NEW TRIP</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('TripSettings', { tripId })}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Trip Info Card */}
        <TripInfoCard
          trip={trip}
          dayCount={days.length}
          onEdit={() => navigation.navigate('TripSettings', { tripId })}
        />

        {/* Itinerary Section */}
        <View style={styles.itineraryHeader}>
          <Text style={styles.itineraryTitle}>ITINERARY</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {/* Empty State or Days */}
        {!hasAnyActivities ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>NO PLANS YET</Text>
            <Text style={styles.emptySubtitle}>
              Start building your itinerary by adding trip{'\n'}details or let AI generate one for you
            </Text>
          </View>
        ) : null}

        {/* Day Sections */}
        {days.map((day) => (
          <DaySection
            key={day.dayPlan.id}
            day={day}
            onAddActivity={() => openAddModal(day.dayPlan.id)}
            onDeleteItem={deleteItem}
          />
        ))}

        {/* Add Day Button */}
        <TouchableOpacity style={styles.addDayButton}>
          <Text style={styles.addDayText}>+ ADD DAY</Text>
        </TouchableOpacity>

        {/* AI Assistant Section */}
        <AIAssistantSection
          onGenerateItinerary={handleGenerateItinerary}
          onFillBlanks={handleFillBlanks}
          isGenerating={isGenerating}
          isModelDownloaded={modelStatus.isDownloaded}
          isDownloading={modelStatus.isDownloading}
          downloadProgress={modelStatus.downloadProgress}
          onDownloadModel={modelStatus.downloadModel}
        />

        {/* Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { tripId })}
          activeOpacity={0.8}
        >
          <Text style={styles.chatButtonIcon}>🧠</Text>
          <Text style={styles.chatButtonText}>Ask Trip Assistant</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Activity Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={handleCloseModal}
          />
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
              <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
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
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
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
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  itineraryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  addDayButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    gap: 8,
  },
  chatButtonIcon: {
    fontSize: 18,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal styles
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
  },
  modalTitle: {
    fontSize: 20,
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

