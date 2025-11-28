import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
// 1. 네이티브용 아이콘 import
import { Calendar, MapPin } from 'lucide-react-native';

// 2. 네이티브 Badge 컴포넌트 정의
const Badge = ({ text, color }: { text: string, color: 'blue' | 'green' }) => (
  <View style={[
    styles.badgeContainer,
    color === 'blue' ? styles.badgeBlue : styles.badgeGreen
  ]}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

interface Match {
  id: number;
  status: string;
  playerCount: string;
  title: string;
  date: string;
  location: string;
}

interface MatchCardProps {
  match: Match;
  onStartGame: () => void;
}

export function MatchCard({ match, onStartGame }: MatchCardProps) {
  return (
    // 3. <button> -> <TouchableOpacity>
    <TouchableOpacity
      onPress={onStartGame}
      style={styles.cardContainer} // 4. className -> style
    >
      <View style={styles.cardHeader}>
        {/* 5. (경로 수정) ../assets/ 로 상위 폴더 지정 */}
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

// 6. StyleSheet로 모든 스타일 정의
const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // 7. (수정) Home.tsx의 gap을 대체하기 위해 여백 추가
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // View 안의 gap은 대부분 잘 작동합니다.
    marginBottom: 12,
  },
  cardLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333', // 로고 이미지가 없을 경우를 대비한 임시 배경
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

