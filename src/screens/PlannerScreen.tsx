import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { generateItinerary } from '../utils/gemini';
import { saveItinerary } from '../utils/storage';

type PlannerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Planner'>;
};

export const PlannerScreen: React.FC<PlannerScreenProps> = ({ navigation }) => {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [interests, setInterests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!destination.trim() || !days.trim()) {
      setError('Please fill in destination and number of days');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const itinerary = await generateItinerary({
        destination: destination.trim(),
        days: parseInt(days),
        interests: interests.trim(),
      });

      const saved = await saveItinerary(itinerary);
      setLoading(false);
      navigation.replace('Itinerary', { itineraryId: saved.id });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Plan Trip</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g., Tokyo, Japan"
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Number of Days</Text>
          <TextInput
            style={styles.input}
            value={days}
            onChangeText={setDays}
            placeholder="e.g., 3"
            placeholderTextColor="#999999"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interests (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={interests}
            onChangeText={setInterests}
            placeholder="e.g., food, museums, hiking"
            placeholderTextColor="#999999"
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Itinerary</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: Requires internet connection to generate itinerary
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  generateButton: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF0000',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
});

