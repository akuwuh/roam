import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { loadItineraries, Itinerary } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadSavedItineraries();
    }, [])
  );

  const loadSavedItineraries = async () => {
    const saved = await loadItineraries();
    setItineraries(saved);
  };

  const renderItinerary = ({ item }: { item: Itinerary }) => (
    <TouchableOpacity
      style={styles.itineraryCard}
      onPress={() => navigation.navigate('Itinerary', { itineraryId: item.id })}
      activeOpacity={0.7}
    >
      <Text style={styles.itineraryTitle}>{item.destination}</Text>
      <Text style={styles.itineraryDate}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Travel Planner</Text>
      </View>

      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate('Planner')}
        activeOpacity={0.8}
      >
        <Text style={styles.newButtonText}>+ New Itinerary</Text>
      </TouchableOpacity>

      {itineraries.length > 0 ? (
        <FlatList
          data={itineraries}
          renderItem={renderItinerary}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No itineraries yet</Text>
          <Text style={styles.emptySubtext}>Create your first travel plan</Text>
        </View>
      )}
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
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
  newButton: {
    margin: 24,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
  },
  itineraryCard: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  itineraryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  itineraryDate: {
    fontSize: 14,
    color: '#666666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
  },
});

