import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Settings, Shield, LogOut, ChevronRight, History } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { getRmrTier } from '../../utils/rmrCalculator'; // [추가] 유틸리티 import

interface ProfileScreenProps {
  onLogout: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<any>();

  const user = {
    name: '배드민턴 마스터',
    location: '안양시 동안구',
    // [수정] 티어는 RMR에 기반하여 동적으로 계산하도록 변경 (또는 하드코딩 제거)
    // tier: 'Gold 3',
    rmr: 1100,
    wins: 15,
    losses: 8,
    avatar: require('../../assets/images/card-logo.png'),
  };

  // [추가] RMR 기반 티어 계산
  const tier = getRmrTier(user.rmr);

  const handleHistoryPress = () => {
    navigation.navigate('MatchHistory');
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>내 정보</Text>

        <TouchableOpacity onPress={handleHistoryPress} style={styles.historyButton}>
          <History size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* 프로필 요약 */}
        <View style={styles.profileSection}>
          <Image source={user.avatar} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.location}>{user.location}</Text>
        </View>

        {/* RMR 카드 */}
        <View style={styles.rmrCard}>
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>티어</Text>
            {/* [수정] 계산된 tier 사용 */}
            <Text style={styles.rmrValueTier}>{tier}</Text>
          </View>
          <View style={styles.rmrSeparator} />
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>승/패</Text>
            <Text style={styles.rmrValue}>{user.wins}승 {user.losses}패</Text>
          </View>
          <View style={styles.rmrSeparator} />
          <View style={styles.rmrItem}>
            <Text style={styles.rmrLabel}>매너 점수</Text>
            <Text style={styles.rmrValue}>4.8 / 5.0</Text>
          </View>
        </View>

        {/* 메뉴 리스트 */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Settings size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>계정 설정</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <Shield size={22} color="#9CA3AF" />
            <Text style={styles.menuText}>개인정보 및 보안</Text>
            <ChevronRight size={20} color="#9CA3AF" style={styles.menuArrow} />
          </TouchableOpacity>
        </View>

        {/* 로그아웃 버튼 */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <LogOut size={22} color="#EF4444" />
            <Text style={[styles.menuText, styles.logoutText]}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    includeFontPadding: false,
  },
  historyButton: {
    padding: 4,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#374151',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  location: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  rmrCard: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    justifyContent: 'space-around',
  },
  rmrItem: {
    alignItems: 'center',
  },
  rmrLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  rmrValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  rmrValueTier: {
    fontSize: 16,
    color: '#34D399',
    fontWeight: 'bold',
  },
  rmrSeparator: {
    width: 1,
    backgroundColor: '#374151',
  },
  menuSection: {
    marginTop: 24,
    backgroundColor: '#1F2937',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginLeft: 16,
  },
  menuArrow: {
    marginLeft: 'auto',
  },
  logoutText: {
    color: '#EF4444',
  },
});