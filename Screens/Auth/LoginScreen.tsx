import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Mail, Lock } from 'lucide-react-native';

// App.tsx로부터 받을 props 타입 정의
interface LoginScreenProps {
  onGoToSignUp: () => void;
  onLogin: () => void; // (임시) 로그인 성공 처리
}

export default function LoginScreen({ onGoToSignUp, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // (추후) 여기에 Firebase/백엔드 로그인 로직 구현
    if (!email || !password) {
      Alert.alert('오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    console.log('로그인 시도:', email);
    // (임시) 로그인 성공 처리
    onLogin();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* 1. 로고 */}
        <Image
          source={require('../../assets/images/rally-logo.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>Rally</Text>
        <Text style={styles.subtitle}>로그인하여 랠리를 시작하세요</Text>

        {/* 2. 이메일 입력 */}
        <View style={styles.inputContainer}>
          <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="이메일"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* 3. 비밀번호 입력 */}
        <View style={styles.inputContainer}>
          <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="비밀번호"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry // 비밀번호 숨김
          />
        </View>

        {/* 4. 로그인 버튼 */}
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>

        {/* 5. 하단 링크 */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => Alert.alert('알림', '비밀번호 찾기 (구현 필요)')}>
            <Text style={styles.linkText}>비밀번호 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onGoToSignUp}>
            <Text style={styles.linkTextHighlight}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // 어두운 배경
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF', // 회색
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151', // Home 검색창과 동일
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
  },
  button: {
    backgroundColor: '#34D399', // 랠리 녹색
    borderRadius: 8,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#111827', // 어두운 텍스트
    fontSize: 16,
    fontWeight: 'bold',
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  linkTextHighlight: {
    fontSize: 14,
    color: '#34D399', // 랠리 녹색
    fontWeight: 'bold',
  },
});