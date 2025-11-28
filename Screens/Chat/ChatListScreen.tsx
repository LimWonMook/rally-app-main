import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Users } from 'lucide-react-native'; // [수정] 친구 아이콘 import

// (임시) 채팅방 데이터
const chatRooms = [
  {
    id: 1,
    matchTitle: '호계체육관 정모',
    lastMessage: '네, 6시에 뵙겠습니다!',
    time: '오후 2:30',
    unreadCount: 1,
    avatar: require('../../assets/images/card-logo.png'),
  },
  {
    id: 2,
    matchTitle: '안양 배드민턴 클럽',
    lastMessage: '복식 가능하신가요?',
    time: '오전 11:15',
    unreadCount: 0,
    avatar: require('../../assets/images/card-logo.png'),
  },
];

export default function ChatListScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>대화</Text>
        {/* [수정] 우측 상단 아이콘을 친구(Users) 아이콘으로 변경 */}
        <TouchableOpacity style={styles.headerRightButton}>
          <Users size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* 채팅 목록 */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {chatRooms.map((room) => (
          <TouchableOpacity
            key={room.id}
            style={styles.chatItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ChatRoom', { title: room.matchTitle })}
          >
            <Image source={room.avatar} style={styles.avatar} />
            <View style={styles.chatContent}>
              <Text style={styles.chatTitle}>{room.matchTitle}</Text>
              <Text style={styles.chatMessage} numberOfLines={1}>{room.lastMessage}</Text>
            </View>
            <View style={styles.chatMeta}>
              <Text style={styles.chatTime}>{room.time}</Text>
              {room.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{room.unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  headerRightButton: {
    padding: 4,
  },
  listContainer: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#374151',
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    includeFontPadding: false,
  },
  chatMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    includeFontPadding: false,
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  unreadBadge: {
    backgroundColor: '#34D399',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});