/**
 * Trip Settings Screen - Edit trip details
 * Includes destination field per mockup
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';
import type { Trip } from '../../../domain/models';
import { useServices } from '../../../app/providers';

type Props = NativeStackScreenProps<RootStackParamList, 'TripSettings'>;

export function TripSettingsScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { tripRepository } = useServices();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [homeAirport, setHomeAirport] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadTrip() {
      const loaded = await tripRepository.getTrip(tripId);
      if (loaded) {
        setTrip(loaded);
        setName(loaded.name);
        setDestination(loaded.destination ?? '');
        setStartDate(loaded.startDate);
        setEndDate(loaded.endDate);
        setHomeAirport(loaded.homeAirport ?? '');
      }
    }
    loadTrip();
  }, [tripId, tripRepository]);

  const handleSave = async () => {
    if (!trip || !name.trim() || !startDate || !endDate) return;

    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const updated: Trip = {
        ...trip,
        name: name.trim(),
        destination: destination.trim() || undefined,
        startDate,
        endDate,
        homeAirport: homeAirport.trim() || undefined,
        updatedAt: Date.now(),
      };
      await tripRepository.saveTrip(updated);
      navigation.goBack();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await tripRepository.deleteTrip(tripId);
            navigation.navigate('MainTabs');
          },
        },
      ]
    );
  };

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TRIP SETTINGS</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Summer Vacation"
              placeholderTextColor="#999999"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination</Text>
            <TextInput
              style={styles.input}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g., Tokyo, Japan"
              placeholderTextColor="#999999"
              returnKeyType="next"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Start Date</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999999"
                returnKeyType="next"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>End Date</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999999"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Home Airport (Optional)</Text>
            <TextInput
              style={styles.input}
              value={homeAirport}
              onChangeText={setHomeAirport}
              placeholder="e.g., YYZ, LAX, JFK"
              placeholderTextColor="#999999"
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={styles.helperText}>
              Used for flight suggestions and logistics
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Trip</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
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
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfInput: {
    flex: 1,
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
  helperText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 32,
  },
  deleteButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  bottomPadding: {
    height: 40,
  },
});
