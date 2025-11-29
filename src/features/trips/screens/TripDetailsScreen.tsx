/**
 * Trip Details Screen - Edit trip metadata
 * Destination, budget, trip type, travelers, notes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../../types';
import type { Trip, TripType } from '../../../domain/models';
import { useServices } from '../../../app/providers';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TripDetails'>;
  route: RouteProp<RootStackParamList, 'TripDetails'>;
};

const TRIP_TYPES: { value: TripType; label: string }[] = [
  { value: 'business', label: 'BUSINESS' },
  { value: 'leisure', label: 'LEISURE' },
  { value: 'family', label: 'FAMILY' },
  { value: 'solo', label: 'SOLO' },
];

export function TripDetailsScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { tripRepository } = useServices();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [budget, setBudget] = useState('');
  const [tripType, setTripType] = useState<TripType>('leisure');
  const [travelers, setTravelers] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadTrip() {
      try {
        const loadedTrip = await tripRepository.getTrip(tripId);
        if (loadedTrip) {
          setTrip(loadedTrip);
          setName(loadedTrip.name);
          setDestination(loadedTrip.destination ?? '');
          setStartDate(new Date(loadedTrip.startDate));
          setEndDate(new Date(loadedTrip.endDate));
          setBudget(loadedTrip.budget?.toString() ?? '');
          setTripType(loadedTrip.tripType);
          setTravelers(loadedTrip.travelers);
          setNotes(loadedTrip.notes ?? '');
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadTrip();
  }, [tripId, tripRepository]);

  const handleSave = async () => {
    if (!trip) return;
    
    setIsSaving(true);
    try {
      const updatedTrip: Trip = {
        ...trip,
        name: name.trim() || 'Untitled Trip',
        destination: destination.trim() || undefined,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        budget: budget ? parseFloat(budget) : undefined,
        tripType,
        travelers,
        notes: notes.trim() || undefined,
        updatedAt: Date.now(),
      };
      
      await tripRepository.saveTrip(updatedTrip);
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  const incrementTravelers = () => setTravelers((prev) => prev + 1);
  const decrementTravelers = () => setTravelers((prev) => Math.max(1, prev - 1));

  if (isLoading) {
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={styles.checkButton}>✓</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Trip Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TRIP NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter trip name"
            placeholderTextColor="#999999"
          />
        </View>

        {/* Destination */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DESTINATION</Text>
          <View style={styles.inputWithIcon}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              value={destination}
              onChangeText={setDestination}
              placeholder="Where are you going?"
              placeholderTextColor="#999999"
            />
            <Text style={styles.locationIcon}>📍</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>DATES</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>START</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDateForDisplay(startDate)}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      if (selectedDate > endDate) {
                        setEndDate(selectedDate);
                      }
                    }
                  }}
                />
              )}
            </View>
            <View style={styles.dateInput}>
              <Text style={styles.dateLabel}>END</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {formatDateForDisplay(endDate)}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  minimumDate={startDate}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Budget */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>BUDGET</Text>
          <View style={styles.inputWithIcon}>
            <Text style={styles.currencyIcon}>$</Text>
            <TextInput
              style={[styles.input, styles.inputFlex, styles.budgetInput]}
              value={budget}
              onChangeText={setBudget}
              placeholder="0.00"
              placeholderTextColor="#999999"
              keyboardType="decimal-pad"
            />
            <Text style={styles.chevron}>⌃</Text>
          </View>
        </View>

        {/* Trip Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TRIP TYPE</Text>
          <View style={styles.tripTypeGrid}>
            {TRIP_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.tripTypeButton,
                  tripType === type.value && styles.tripTypeButtonActive,
                ]}
                onPress={() => setTripType(type.value)}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    tripType === type.value && styles.tripTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Number of Travelers */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>NUMBER OF TRAVELERS</Text>
          <View style={styles.travelerRow}>
            <TouchableOpacity
              style={styles.travelerButton}
              onPress={decrementTravelers}
            >
              <Text style={styles.travelerButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.travelerCount}>{travelers}</Text>
            <TouchableOpacity
              style={styles.travelerButton}
              onPress={incrementTravelers}
            >
              <Text style={styles.travelerButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>NOTES</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional details..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE TRIP DETAILS</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 60, // Increased for status bar
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  backButton: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  checkButton: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0, // Sharp corners
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    fontWeight: '500',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
  },
  locationIcon: {
    fontSize: 18,
    paddingRight: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateInput: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dateButton: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  currencyIcon: {
    fontSize: 16,
    color: '#000000',
    paddingLeft: 16,
    fontWeight: '700',
  },
  budgetInput: {
    paddingLeft: 8,
  },
  chevron: {
    fontSize: 12,
    color: '#000000',
    paddingRight: 16,
    transform: [{ rotate: '180deg' }],
  },
  tripTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tripTypeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tripTypeButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  tripTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tripTypeTextActive: {
    color: '#FFFFFF',
  },
  travelerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
  },
  travelerButton: {
    width: 40,
    height: 40,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  travelerButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 28,
  },
  travelerCount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  notesInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
