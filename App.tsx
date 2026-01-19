import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';

// 네비게이션 필수 라이브러리
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// 안드로이드 안전 영역 처리
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 아이콘 (BottomNav와 동일한 아이콘 사용)
import {
  MessageCircleMore,
  Search,
  User,
  Bot,
  Flame,
  ChevronDown,
  X
} from 'lucide-react-native';

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

// [중요] PointLog 타입 임포트 (rmrCalculator 충돌 방지)
import { PointLog } from './utils/rmrCalculator';

// 네비게이터 정의
const Stack = createNativeStackNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type Screen =
  | 'home'
  | 'chat'
  | 'ai'
  | 'match'
  | 'profile'
  | 'score'
  | 'summary';

// -------------------------------------------------------------------------
// [TutorialOverlay] 튜토리얼 오버레이 컴포넌트
// -------------------------------------------------------------------------
interface TutorialStep {
  id: string;
  title: string;
  desc: string;
  targetTab: Screen | null;
  highlightTabId?: Screen;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '랠리(Rally)에 오신 것을 환영합니다!',
    desc: '배드민턴 파트너 찾기부터 경기 분석까지,\n랠리의 주요 기능을 소개해 드릴게요.',
    targetTab: null,
  },
  {
    id: 'match',
    title: '매칭',
    desc: '가장 먼저, 내 주변의 경기 모임을 찾거나\n직접 방을 만들어 파트너를 모집해보세요.',
    targetTab: 'match',
    highlightTabId: 'match',
  },
  {
    id: 'chat',
    title: '대화',
    desc: '매칭된 파트너들과 채팅방에서\n일정과 장소를 조율할 수 있습니다.',
    targetTab: 'chat',
    highlightTabId: 'chat',
  },
  {
    id: 'home',
    title: '경기 모드',
    desc: '경기 당일, 점수판 기능을 사용해보세요.\n승패 기록과 플레이 데이터가 자동으로 저장됩니다.',
    targetTab: 'chat',
    highlightTabId: 'home',
  },
  {
    id: 'summary',
    title: '경기 결과 & RMR',
    desc: '경기가 끝나면 상세 기록과 함께\n나의 실력 지표를 확인할 수 있습니다.',
    targetTab: 'summary',
    highlightTabId: undefined,
  },
  {
    id: 'ai',
    title: 'AI 분석 (Beta)',
    desc: 'AI가 실시간으로\n자세 분석과 훈련을 도와줍니다.',
    targetTab: 'ai',
    highlightTabId: 'ai',
  },
  {
    id: 'profile',
    title: '내 정보',
    desc: '나의 티어, 매너 점수, 경기 전적을\n한눈에 관리하고 실력을 증명하세요!',
    targetTab: 'profile',
    highlightTabId: 'profile',
  },
];

const TutorialOverlay = ({ visible, stepIndex, onNext, onSkip }: {
  visible: boolean;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const step = TUTORIAL_STEPS[stepIndex];
  const isLastStep = stepIndex === TUTORIAL_STEPS.length - 1;

  const tabs: { id: Screen; label: string; Icon: React.ElementType }[] = [
    { id: 'home', label: '경기 모드', Icon: Flame },
    { id: 'chat', label: '대화', Icon: MessageCircleMore },
    { id: 'ai', label: 'AI 분석', Icon: Bot },
    { id: 'match', label: '매칭', Icon: Search },
    { id: 'profile', label: '정보', Icon: User },
  ];

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [stepIndex, visible]);

  useEffect(() => {
    if (visible && step.highlightTabId) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: 10, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [visible, step]);

  if (!visible) return null;

  const activeTabIndex = tabs.findIndex(t => t.id === step.highlightTabId);
  const tabWidth = SCREEN_WIDTH / tabs.length;

  // [수정] BottomNav 패딩 변경(top 8 + bottom 8 + insets)에 맞춰 화살표 위치 보정
  // 탭바 높이 근사치: paddingTop(8) + paddingBottom(8) + icon(28) + text(16) + gap + insets.bottom
  // 대략 60 + insets.bottom 정도가 탭바 높이임.
  const arrowBottomPos = (60 + insets.bottom) + 5;
  const arrowLeftPos = (activeTabIndex * tabWidth) + (tabWidth / 2) - 20;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.tutorialContainer}>
        <View style={styles.tutorialBackdrop} />

        <SafeAreaView style={styles.tutorialHeader}>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>건너뛰기</Text>
            <X size={20} color="white" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* id가 'summary'일 때만 하단 정렬 스타일 적용 */}
        <View style={[
          styles.contentWrapper,
          step.id === 'summary' && styles.contentWrapperBottom
        ]}>
          <Animated.View style={[styles.tutorialContent, { opacity: fadeAnim }]}>
            <Text style={styles.tutorialTitle}>{step.title}</Text>
            <Text style={styles.tutorialDesc}>{step.desc}</Text>

            <TouchableOpacity style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextButtonText}>{isLastStep ? '시작하기' : '다음'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {step.highlightTabId && (
          <Animated.View
            style={[
              styles.pointerContainer,
              {
                left: arrowLeftPos,
                bottom: arrowBottomPos,
                transform: [{ translateY: bounceAnim }]
              }
            ]}
          >
            <ChevronDown size={40} color="#34D399" />
          </Animated.View>
        )}

        {step.highlightTabId && (
          // [수정] BottomNav와 동일한 패딩 로직 적용 (paddingTop: 8, paddingBottom: 8 + insets.bottom)
          <View style={[styles.replicaContainer, { paddingBottom: 8 + insets.bottom }]}>
            {tabs.map((tab) => {
              const isHighlight = tab.id === step.highlightTabId;
              return (
                <View
                  key={tab.id}
                  style={[
                    styles.replicaTabButton,
                    isHighlight ? styles.tabButtonActive : { opacity: 0 }
                  ]}
                >
                  <View>
                    <tab.Icon color={isHighlight ? '#FFFFFF' : '#6B7280'} size={28} />
                    {tab.id === 'ai' && (
                      <View style={styles.betaBadge}>
                        <Text style={styles.betaText}>BETA</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[
                    styles.replicaTabLabel,
                    isHighlight && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
};

// ==========================================
// [MainScreen] 메인 탭 화면
// ==========================================
function MainScreen({ navigation, route }: any) {
  const { handleLogout, isFirstLogin } = route.params || {};

  const [currentScreen, setCurrentScreen] = useState<Screen>('match');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // 튜토리얼용 가짜 경기 데이터
  const tutorialDummyResult = {
    duration: 1540,
    team1Wins: 1,
    team2Wins: 2,
    isForced: false,
    team1Name: '상대팀',
    team2Name: '나 & 파트너',
    pointLogs: [
        { scorer: 'B', scoreA: 0, scoreB: 1, setIndex: 1, timestamp: Date.now(), duration: 10 },
        { scorer: 'B', scoreA: 0, scoreB: 2, setIndex: 1, timestamp: Date.now(), duration: 40 },
        { scorer: 'A', scoreA: 1, scoreB: 2, setIndex: 1, timestamp: Date.now(), duration: 15 },
        { scorer: 'B', scoreA: 1, scoreB: 21, setIndex: 1, timestamp: Date.now(), duration: 20 },
        { scorer: 'A', scoreA: 21, scoreB: 15, setIndex: 2, timestamp: Date.now(), duration: 25 },
        { scorer: 'B', scoreA: 20, scoreB: 20, setIndex: 3, timestamp: Date.now(), duration: 30 },
        { scorer: 'B', scoreA: 20, scoreB: 22, setIndex: 3, timestamp: Date.now(), duration: 10 },
    ] as PointLog[]
  };

  useEffect(() => {
    if (isFirstLogin) {
      setShowTutorial(true);
    }
  }, [isFirstLogin]);

  const handleTutorialNext = () => {
    const nextStepIndex = tutorialStep + 1;

    if (nextStepIndex >= TUTORIAL_STEPS.length) {
      setShowTutorial(false);
      setCurrentScreen('match');
      return;
    }

    setTutorialStep(nextStepIndex);

    const nextTab = TUTORIAL_STEPS[nextStepIndex].targetTab;
    if (nextTab) {
      setCurrentScreen(nextTab);
    }
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
    setCurrentScreen('match');
  };

  const [gameResult, setGameResult] = useState({
    duration: 0,
    team1Wins: 0,
    team2Wins: 0,
    isForced: false,
    team1Name: '',
    team2Name: '',
    pointLogs: [] as PointLog[],
  });

  const handleTabChange = (tab: Screen) => {
    if (!showTutorial) {
      setCurrentScreen(tab);
    }
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
        return (
          <Home
            onStartGame={goToScore}
            onGoToChat={() => handleTabChange('chat')}
          />
        );
      case 'score':
        return <ScoreTracker onComplete={goToSummary} onCancel={goToMatch} />;
      case 'summary':
        return (
          <GameSummary
            onNext={goToMatch}
            result={showTutorial && TUTORIAL_STEPS[tutorialStep].id === 'summary' ? tutorialDummyResult : gameResult}
          />
        );
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

      {currentScreen !== 'home' &&
        currentScreen !== 'score' &&
        currentScreen !== 'summary' && (
          <BottomNav
            currentTab={currentScreen}
            onTabChange={handleTabChange}
          />
        )}

      <TutorialOverlay
        visible={showTutorial}
        stepIndex={tutorialStep}
        onNext={handleTutorialNext}
        onSkip={handleTutorialSkip}
      />
    </SafeAreaView>
  );
}

// ==========================================
// [App] 전체 앱 진입점
// ==========================================
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthScreen('login');
    setIsFirstLogin(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#111827" />
          {authScreen === 'login' ? (
            <LoginScreen
              onGoToSignUp={() => setAuthScreen('signup')}
              onLogin={() => {
                setIsFirstLogin(false);
                setIsLoggedIn(true);
              }}
            />
          ) : (
            <SignUpScreen
              onGoToLogin={() => setAuthScreen('login')}
              onSignUp={() => {
                setIsFirstLogin(true);
                setIsLoggedIn(true);
              }}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

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
          <Stack.Screen
            name="Main"
            component={MainScreen}
            initialParams={{ handleLogout, isFirstLogin }}
          />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
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
  // --- Tutorial Overlay Styles ---
  tutorialContainer: {
    flex: 1,
  },
  tutorialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tutorialHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 20,
    width: '100%',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skipText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    paddingBottom: 100, // 기본: 탭바 위쪽
  },
  // 경기 결과 화면용 하단 배치
  contentWrapperBottom: {
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  tutorialContent: {
    width: '80%',
    backgroundColor: '#1F2937',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialDesc: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  nextButton: {
    backgroundColor: '#34D399',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointerContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,
  },

  // --- Replica Tab Bar Styles ---
  replicaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8, // [수정] paddingVertical 대신 paddingTop 8 고정
    // paddingBottom은 inline style로 8 + insets.bottom 동적 처리
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  replicaTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 2,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#34D399',
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  replicaTabLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2, // [수정] BottomNav와 레이아웃 일치
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600', // [수정] BottomNav와 폰트 두께 일치
  },
  betaBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderColor: '#FFFFFF',
    borderWidth: 1, // [수정] BottomNav와 스타일 일치
    zIndex: 10,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    includeFontPadding: false,
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