import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // [추가] 안전 영역 훅 임포트
import { Screen } from '../App';
import {
  MessageCircleMore,
  Search,
  User,
  Bot,
  Flame,
} from 'lucide-react-native';

interface BottomNavProps {
  currentTab: Screen;
  onTabChange: (tab: Screen) => void;
}

export function BottomNav({ currentTab, onTabChange }: BottomNavProps) {
  // [추가] 안전 영역 인셋 가져오기
  const insets = useSafeAreaInsets();

  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore },
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: User },
  ];

  return (
    <View
      style={[
        styles.container,
        // [수정] 하단 패딩에 안전 영역(insets.bottom)을 더해 시스템 내비게이션 바와 겹치지 않도록 처리
        { paddingBottom: 8 + insets.bottom }
      ]}
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const iconColor = isActive ? '#FFFFFF' : '#6B7280';

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={[
              styles.tabButton,
              isActive && styles.tabButtonActive,
            ]}
            activeOpacity={0.7}
          >
            <View>
              <tab.Icon color={iconColor} size={28} />

              {/* Beta 배지 (AI 탭 전용) */}
              {tab.id === 'ai' && (
                <View style={styles.betaBadge}>
                  <Text style={styles.betaText}>BETA</Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8, // [수정] paddingVertical을 분리하여 상단은 8 고정
    // paddingBottom은 인라인 스타일로 동적 처리
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    // 그림자 추가 (선택 사항 - 탭바 구분감 향상)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#34D399', // 녹색 배경
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#FFFFFF', // 흰색 텍스트
    fontWeight: '600',
  },

  // Beta 배지 스타일
  betaBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 10,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
});