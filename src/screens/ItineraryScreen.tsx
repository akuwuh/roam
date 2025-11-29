import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { loadItinerary, Itinerary } from '../utils/storage';

type ItineraryScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Itinerary'>;
  route: RouteProp<RootStackParamList, 'Itinerary'>;
};

export const ItineraryScreen: React.FC<ItineraryScreenProps> = ({ navigation, route }) => {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  useEffect(() => {
    loadData();
  }, [route.params.itineraryId]);

  const loadData = async () => {
    const data = await loadItinerary(route.params.itineraryId);
    setItinerary(data);
  };

  if (!itinerary) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{itinerary.destination}</Text>
        <Text style={styles.subtitle}>{itinerary.date}</Text>
      </View>

      <ScrollView style={styles.content}>
        {itinerary.days.map((day, index) => (
          <View key={index} style={styles.dayCard}>
            <Text style={styles.dayTitle}>Day {day.day}</Text>
            {day.activities.map((activity, actIndex) => (
              <View key={actIndex} style={styles.activity}>
                <Text style={styles.activityTime}>{activity.time}</Text>
                <Text style={styles.activityName}>{activity.name}</Text>
                {activity.description && (
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('Chat', { itinerary })}
        activeOpacity={0.8}
      >
        <Text style={styles.chatButtonText}>Ask AI About This Trip</Text>
      </TouchableOpacity>
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
  dayCard: {
    marginBottom: 32,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  activity: {
    marginBottom: 16,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  chatButton: {
    margin: 24,
    paddingVertical: 16,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#666666',
  },
});

