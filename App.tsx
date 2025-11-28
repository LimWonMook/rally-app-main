import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
} from 'react-native';

// 네비게이션 필수 라이브러리
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// 안드로이드 안전 영역 처리
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// 컴포넌트 임포트
import { Home } from './components/Home';
import { BottomNav } from './components/BottomNav';
import { ScoreTracker } from './components/ScoreTracker';
import { GameSummary } from './components/GameSummary';
import AIAnalysis from './Screens/AI/AIAnalysis';

import LoginScreen from './Screens/Auth/LoginScreen';
import SignUpScreen from './Screens/Auth/SignUpScreen';
import ChatListScreen from './Screens/Chat/ChatListScreen';
import ChatRoomScreen from './Screens/Chat/ChatRoomScreen';
import ProfileScreen from './Screens/Profile/ProfileScreen';
import MatchHistoryScreen from './Screens/Profile/MatchHistoryScreen';

// 네비게이터 정의
const Stack = createNativeStackNavigator();

export type Screen =
  | 'home'
  | 'chat'
  | 'ai'
  | 'match'
  | 'profile'
  | 'score'
  | 'summary';

// ==========================================
// [MainScreen] 로그인 후 보이는 메인 탭 화면들
// ==========================================
function MainScreen({ navigation, route }: any) {
  const { handleLogout } = route.params || {};

  const [currentScreen, setCurrentScreen] = useState<Screen>('match');
  const [gameResult, setGameResult] = useState({
    duration: 0,
    team1Wins: 0,
    team2Wins: 0,
    isForced: false,
    team1Name: '',
    team2Name: '',
  });

  const handleTabChange = (tab: Screen) => {
    setCurrentScreen(tab);
  };

  const goToSummary = useCallback((result: any) => {
    setGameResult(result);
    setCurrentScreen('summary');
  }, []);

  const goToScore = useCallback(() => {
    setCurrentScreen('score');
  }, []);

  const goToMatch = useCallback(() => {
    setCurrentScreen('match');
  }, []);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'match':
        // [수정] Home 컴포넌트에 onGoToChat prop 전달
        // 알림 수락 시 'chat' 탭으로 이동하도록 연결
        return (
          <Home
            onStartGame={goToScore}
            onGoToChat={() => handleTabChange('chat')}
          />
        );
      case 'score':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'summary':
        return <GameSummary onNext={goToMatch} result={gameResult} />;
      case 'ai':
        return <AIAnalysis />;
      case 'chat':
        return <ChatListScreen />;
      case 'profile':
        return <ProfileScreen onLogout={handleLogout} />;
      default:
        return (
          <View style={stubStyles.stubContainer}>
            <Text style={stubStyles.stubText}>{currentScreen} 화면</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {renderScreen()}

      {/* 탭바 표시 조건 */}
      {currentScreen !== 'home' &&
        currentScreen !== 'score' &&
        currentScreen !== 'summary' && (
          <BottomNav
            currentTab={currentScreen}
            onTabChange={handleTabChange}
          />
        )}
    </SafeAreaView>
  );
}

// ==========================================
// [App] 전체 앱 진입점 (네비게이션 & 인증 관리)
// ==========================================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthScreen('login');
  };

  // 1. 로그인 전 화면
  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#111827" />
          {authScreen === 'login' ? (
            <LoginScreen
              onGoToSignUp={() => setAuthScreen('signup')}
              onLogin={() => setIsLoggedIn(true)}
            />
          ) : (
            <SignUpScreen
              onGoToLogin={() => setAuthScreen('login')}
              onSignUp={() => setIsLoggedIn(true)}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 2. 로그인 후 화면 (Stack Navigation)
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <Stack.Navigator
          initialRouteName="Main"
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
          }}
        >
          {/* 메인 탭 화면 */}
          <Stack.Screen
            name="Main"
            component={MainScreen}
            initialParams={{ handleLogout }}
          />

          {/* 채팅방 상세 화면 */}
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
          />

          {/* 경기 기록 화면 */}
          <Stack.Screen
            name="MatchHistory"
            component={MatchHistoryScreen}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});

const stubStyles = StyleSheet.create({
  stubContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  stubText: {
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
});