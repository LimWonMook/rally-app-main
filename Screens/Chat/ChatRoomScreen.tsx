import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Send } from 'lucide-react-native';

// 1. 모달 컴포넌트 import (경로 확인해주세요)
import OpponentProfileModal from './OpponentProfileModal';

export default function ChatRoomScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title } = route.params || { title: '채팅방' };

  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // 2. 모달 상태 관리 추가 (보임 여부, 선택된 유저 정보)
  const [isModalVisible, setModalVisible] = useState(false);

  // (임시) 상대방 프로필 데이터 - 실제로는 API로 받아오거나 route params로 받아야 함
  const opponentProfile = {
    id: 'opponent_1',
    name: title, // 채팅방 이름을 상대방 이름으로 사용
    location: '안양시 만안구',
    tier: 'Silver 3',
    win: 5,
    loss: 3,
    mannerScore: 4.6,
    // 이미지가 없으므로 모달 내부에서 기본 이미지 처리가 필요하거나 require로 로컬 이미지 지정
    // avatar: require('../../assets/images/default_avatar.png'), // 경로에 맞는 이미지 필요 (없으면 모달쪽에서 예외처리 필요)
    avatar: { uri: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' },
  };

  const [messages, setMessages] = useState([
    { id: '1', text: '안녕하세요! 배드민턴 치러 오시나요?', sender: 'other' },
    { id: '2', text: '네! 6시까지 갈게요.', sender: 'me' },
  ]);

  const sendMessage = () => {
    if (text.trim().length === 0) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'me' }]);
    setText('');
  };

  useEffect(() => {
    setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // 3. 프로필 클릭 핸들러
  const handleProfilePress = () => {
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowRight : styles.msgRowLeft]}>
        {/* 상대방일 때만 프로필 이미지 표시 */}
        {!isMe && (
          <TouchableOpacity onPress={handleProfilePress}>
            <Image
              source={opponentProfile.avatar} // 아까 설정한 URL 이미지 사용
              style={styles.avatarCircle}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="메시지 보내기"
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
            <Send color="white" size={20} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 5. 모달 컴포넌트를 화면 최상위에 렌더링 */}
      <OpponentProfileModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        userProfile={opponentProfile}
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleLeft: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#34D399',
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 20,
  },
  msgTextLeft: {
    color: 'white',
  },
  msgTextRight: {
    color: '#064E3B',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: 'white',
    marginRight: 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
});