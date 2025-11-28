import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Screen } from '../App';
import {
  MessageCircleMore, // 1. (수정) MessageCircle -> MessageCircleMore
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
  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore }, // 2. (수정) 아이콘 교체
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: User },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const iconColor = isActive ? (tab.id === 'ai' ? '#34D399' : '#FFFFFF') : '#6B7280';
        const tabStyle = [
          styles.tabButton,
          isActive && (tab.id === 'ai' ? styles.tabButtonActiveAi : styles.tabButtonActive),
        ];

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={tabStyle}
          >
            <tab.Icon color={iconColor} size={28} />

            <Text
              style={[
                styles.tabLabel,
                isActive && (tab.id === 'ai' ? styles.tabLabelActiveAi : styles.tabLabelActive),
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
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
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
  tabButtonActive: { // '경기 모드', '매칭' 등 활성 (녹색 배경)
    backgroundColor: '#34D399',
  },
  tabButtonActiveAi: { // 'AI 분석' 탭 활성 (배경 없음)
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280', // 비활성 텍스트
  },
  tabLabelActive: { // '경기 모드', '매칭' 등 활성 텍스트 (흰색)
    color: '#FFFFFF',
  },
  tabLabelActiveAi: { // 'AI 분석' 탭 활성 텍스트 (녹색)
    color: '#34D399',
  },
});