import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';

const Badge = ({ text, color }: { text: string, color: 'blue' | 'green' }) => (
  <View style={[
    styles.badgeContainer,
    color === 'blue' ? styles.badgeBlue : styles.badgeGreen
  ]}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

export interface Match {
  id: number;
  status: string;
  playerCount: string;
  title: string;
  date: string;
  location: string;
  // (Home.tsx에서 확장된 타입을 사용할 예정이지만 기본 인터페이스 유지)
  [key: string]: any; 
}

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void; // onStartGame -> onPress 로 변경 및 매개변수 추가
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(match)}
      style={styles.cardContainer}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Image
          source={require('../assets/images/card-logo.png')}
          style={styles.cardLogo}
        />

        <Badge text={match.status} color="blue" />
        <Badge text={match.playerCount} color="green" />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{match.title}</Text>

        <View style={styles.infoRow}>
          <Calendar size={16} color="#10B981" />
          <Text style={styles.infoText}>{match.date}</Text>
        </View>

        <View style={styles.infoRow}>
          <MapPin size={16} color="#10B981" />
          <Text style={styles.infoText}>{match.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
  },
  cardBody: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  badgeContainer: {
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  badgeBlue: {
    backgroundColor: '#38BDF8',
  },
  badgeGreen: {
    backgroundColor: '#34D399',
  },
});