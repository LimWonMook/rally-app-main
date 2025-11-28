import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react-native';

// (임시) 경기 기록 데이터
const historyData = [
  {
    id: '1',
    date: '2025.11.25',
    title: '호계체육관 정모 매치',
    result: 'WIN',
    score: '2 - 1',
    rmrChange: 15,
    opponent: '김철수 / 이영희',
  },
  {
    id: '2',
    date: '2025.11.24',
    title: '안양 클럽 교류전',
    result: 'LOSS',
    score: '0 - 2',
    rmrChange: -8,
    opponent: '박지성 / 손흥민',
  },
  {
    id: '3',
    date: '2025.11.20',
    title: '동호회 자체 랭킹전',
    result: 'WIN',
    score: '2 - 0',
    rmrChange: 12,
    opponent: '나달 / 페더러',
  },
  {
    id: '4',
    date: '2025.11.18',
    title: '퇴근 후 한판',
    result: 'WIN',
    score: '2 - 1',
    rmrChange: 5,
    opponent: '신유빈 / 안세영',
  },
  {
    id: '5',
    date: '2025.11.15',
    title: '주말 새벽 배드민턴',
    result: 'LOSS',
    score: '1 - 2',
    rmrChange: -10,
    opponent: '이용대 / 유연성',
  },
];

export default function MatchHistoryScreen() {
  const navigation = useNavigation();

  const renderItem = ({ item }: { item: any }) => {
    const isWin = item.result === 'WIN';

    return (
      <View style={styles.card}>
        {/* 날짜 및 구분 */}
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date}</Text>
          <View style={[styles.resultBadge, isWin ? styles.bgWin : styles.bgLoss]}>
            <Text style={[styles.resultText, isWin ? styles.textWin : styles.textLoss]}>
              {item.result}
            </Text>
          </View>
        </View>

        {/* 경기 내용 */}
        <View style={styles.cardBody}>
          <View style={styles.infoContainer}>
            <Text style={styles.matchTitle}>{item.title}</Text>
            <Text style={styles.opponentText}>vs {item.opponent}</Text>
          </View>

          {/* 점수 및 RMR 변동 */}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.score}</Text>
            <View style={styles.rmrContainer}>
              {isWin ? (
                <TrendingUp size={16} color="#34D399" />
              ) : (
                <TrendingDown size={16} color="#EF4444" />
              )}
              <Text style={[styles.rmrText, isWin ? styles.textWin : styles.textLoss]}>
                {isWin ? '+' : ''}{item.rmrChange}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>경기 기록</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* 리스트 */}
      <FlatList
        data={historyData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgWin: {
    backgroundColor: 'rgba(52, 211, 153, 0.2)', // Green background
  },
  bgLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', // Red background
  },
  resultText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textWin: {
    color: '#34D399',
  },
  textLoss: {
    color: '#EF4444',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  matchTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  opponentText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rmrContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rmrText: {
    fontSize: 14,
    fontWeight: '600',
  },
});