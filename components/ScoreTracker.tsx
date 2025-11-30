import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Modal,
  Animated,
  ActivityIndicator
} from 'react-native';
import { RotateCcw, Play, Pause, ArrowLeft, XCircle, AlertTriangle, Timer, TrendingUp, Activity, Flame, Trophy, Zap, ShieldAlert, Lightbulb } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

// --- Types ---
export interface PointLog {
  scorer: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  setIndex: number;
  timestamp: number;
  duration: number;
}

interface ScoreTrackerProps {
  onComplete: (result: {
    duration: number;
    team1Wins: number;
    team2Wins: number;
    isForced: boolean;
    stopReason?: 'injury' | 'etc';
    pointLogs: PointLog[];
    team1Name: string;
    team2Name: string;
  }) => void;
  onCancel: () => void;
}

// --- INTERNAL COMPONENT: GameLoadingScreen ---
const TIPS = [
   {
     icon: <Trophy size={32} color="#FBBF24" />,
     title: "RMR은 단순 승패가 아닙니다",
     desc: "단순 결과가 아닌 경기 내용을 평가합니다. 졌더라도 좋은 플레이는 점수 하락을 막아줍니다."
   },
  {
    icon: <Zap size={32} color="#34D399" />,
    title: "지구력 점수 올리기",
    desc: "30초 이상 긴 랠리를 이겨보세요. '지구력' 수치가 올라가 RMR을 높여줍니다."
  },
  {
      icon: <Timer size={32} color="#F472B6" />,
      title: "속도전의 묘미",
      desc: "30초 미만의 짧고 강한 랠리 승부는 '속도' 능력치를 올려줍니다. 빠른 공격을 시도해보세요!"
  },
  {
    icon: <ShieldAlert size={32} color="#EF4444" />,
    title: "중도 포기는 금물!",
    desc: "경기를 강제로 종료하면 패배보다 더 큰 페널티를 받게 됩니다. 끝까지 매너있는 플레이를 보여주세요."
  },
  {
    icon: <Lightbulb size={32} color="#60A5FA" />,
    title: "위기관리 능력",
    desc: "20:20 듀스 상황에서의 득점은 일반 득점보다 가치가 높습니다. 중요한 순간에 강한 모습을 보여주세요."
  },
  {
    icon: <Flame size={32} color="#F97316" />, // 아이콘 변경 (집중력/열정)
    title: "후반 집중력",
    desc: "끝까지 집중하세요! 1세트보다 마지막 세트 성적이 좋으면 추가 점수를 받습니다."
  },
  {
    icon: <TrendingUp size={32} color="#A78BFA" />, // 아이콘 변경 (역전승)
    title: "역전의 짜릿함",
    desc: "3점 차 이상 뒤지고 있어도 포기하지 마세요. 역전에 성공하면 RMR이 더 많이 오릅니다."
  },
];

function InternalGameLoadingScreen({ visible, onFinish }: { visible: boolean; onFinish: () => void }) {
  const [tipIndex, setTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setTipIndex(Math.floor(Math.random() * TIPS.length));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onFinish());
      }, 5000); // 3.5초 로딩
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;
  const currentTip = TIPS[tipIndex];

  return (
    <Modal visible={visible} transparent={true} animationType="none">
      <View style={loadingStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <Animated.View style={[loadingStyles.card, { opacity: fadeAnim }]}>
          <View style={loadingStyles.iconContainer}>{currentTip.icon}</View>
          <Text style={loadingStyles.loadingText}>경기 분석 준비 중...</Text>
          <ActivityIndicator size="large" color="#34D399" style={{ marginVertical: 20 }} />
          <View style={loadingStyles.tipBox}>
            <Text style={loadingStyles.tipLabel}>💡 RMR TIP</Text>
            <Text style={loadingStyles.tipTitle}>{currentTip.title}</Text>
            <Text style={loadingStyles.tipDesc}>{currentTip.desc}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const loadingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.98)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', alignItems: 'center' },
  iconContainer: { marginBottom: 16, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 50 },
  loadingText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  tipBox: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  tipLabel: { color: '#34D399', fontWeight: 'bold', fontSize: 12, marginBottom: 8, letterSpacing: 1 },
  tipTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  tipDesc: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});

// --- MAIN COMPONENT: ScoreTracker ---
export function ScoreTracker({ onComplete, onCancel }: ScoreTrackerProps) {
  // Setup State
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');

  // Game State
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1SetWins, setTeam1SetWins] = useState(0);
  const [team2SetWins, setTeam2SetWins] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointTimeRef = useRef<number>(0);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);

  // Timer Logic
  useEffect(() => {
    if (isTimerRunning) {
      if (lastPointTimeRef.current === 0) lastPointTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // --- Handlers ---
  const handleStartButtonPress = () => {
    if (!team1Name.trim()) setTeam1Name("TEAM 1");
    if (!team2Name.trim()) setTeam2Name("TEAM 2");
    Keyboard.dismiss();
    setIsLoading(true); // 로딩 시작
  };

  const handleLoadingFinish = () => {
    setIsLoading(false);
    setIsSetupMode(false); // 게임 화면 진입
    setIsTimerRunning(true);
    lastPointTimeRef.current = Date.now();
  };

  const handleScore = (team: 'team1' | 'team2') => {
    if (!isTimerRunning) return;

    setScoreHistory([...scoreHistory, { t1Score: team1Score, t2Score: team2Score, t1Wins: team1SetWins, t2Wins: team2SetWins }]);

    const now = Date.now();
    const duration = (now - lastPointTimeRef.current) / 1000;
    lastPointTimeRef.current = now;

    let newT1 = team === 'team1' ? team1Score + 1 : team1Score;
    let newT2 = team === 'team2' ? team2Score + 1 : team2Score;
    let newSet1 = team1SetWins;
    let newSet2 = team2SetWins;

    const currentSet = newSet1 + newSet2 + 1;
    const newLog: PointLog = {
      scorer: team === 'team1' ? 'A' : 'B',
      scoreA: newT1, scoreB: newT2,
      setIndex: currentSet,
      timestamp: now,
      duration: duration
    };
    const updatedLogs = [...pointLogs, newLog];
    setPointLogs(updatedLogs);

    // 세트 승리 조건 (21점 이상, 2점차, 혹은 30점 도달)
    let setWinner = null;
    if ((newT1 >= 21 || newT2 >= 21) && Math.abs(newT1 - newT2) >= 2) {
       if (newT1 > newT2) setWinner = 'team1'; else setWinner = 'team2';
    }
    if (newT1 === 30) setWinner = 'team1';
    if (newT2 === 30) setWinner = 'team2';

    if (setWinner) {
      if (setWinner === 'team1') newSet1++; else newSet2++;
      newT1 = 0; newT2 = 0;
      setScoreHistory([]); // 세트 종료 시 되돌리기 초기화
    }

    setTeam1Score(newT1); setTeam2Score(newT2);
    setTeam1SetWins(newSet1); setTeam2SetWins(newSet2);

    if (newSet1 === 2 || newSet2 === 2) {
      setIsTimerRunning(false);
      onComplete({
        duration: elapsedTime, team1Wins: newSet1, team2Wins: newSet2, isForced: false,
        pointLogs: updatedLogs, team1Name: team1Name || "TEAM 1", team2Name: team2Name || "TEAM 2"
      });
    }
  };

  const handleUndo = () => {
    if (scoreHistory.length === 0) return;
    const last = scoreHistory[scoreHistory.length - 1];
    setTeam1Score(last.t1Score); setTeam2Score(last.t2Score);
    setTeam1SetWins(last.t1Wins); setTeam2SetWins(last.t2Wins);
    setScoreHistory(scoreHistory.slice(0, -1));
    setPointLogs(pointLogs.slice(0, -1));
  };

  const handleExitPress = () => {
    setIsTimerRunning(false);
    setShowExitModal(true);
  };

  const handleExitConfirm = (reason: 'injury' | 'etc' | 'cancel') => {
    setShowExitModal(false);
    if (reason === 'cancel') {
        onCancel();
        return;
    }
    onComplete({
      duration: elapsedTime, team1Wins: team1SetWins, team2Wins: team2SetWins,
      isForced: true, stopReason: reason, pointLogs: pointLogs,
      team1Name: team1Name || "TEAM 1", team2Name: team2Name || "TEAM 2"
    });
  };

  const handleResume = () => {
    setShowExitModal(false);
    setIsTimerRunning(true);
  };

  // --- Render Setup ---
  if (isSetupMode) {
    return (
      <View style={{flex: 1, backgroundColor: '#0f172a'}}>
        <InternalGameLoadingScreen visible={isLoading} onFinish={handleLoadingFinish} />

        <StatusBar barStyle="light-content" backgroundColor="#1e293b" translucent={false} />
        <LinearGradient colors={['#1e293b', '#0f172a']} style={{flex: 1}}>
            <SafeAreaView style={{flex: 1}}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
                    <ScrollView contentContainerStyle={{flexGrow: 1, padding: 24}}>
                        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                            <ArrowLeft size={28} color="#94a3b8" />
                        </TouchableOpacity>
                        <View style={{flex: 1, justifyContent: 'center', paddingBottom: 60}}>
                            <View style={styles.setupHeader}>
                                <Text style={styles.setupTitle}>MATCH SETUP</Text>
                                <Text style={styles.setupSubtitle}>경기 참가자를 입력해주세요</Text>
                                <View style={styles.noticeContainer}><Text style={styles.noticeText}>📌 위쪽 입력란이 상대편, 아래쪽 입력란이 내 편입니다.</Text></View>
                            </View>
                            <View style={styles.formCard}>
                                <View style={styles.inputGroup}>
                                    <View style={[styles.colorDot, { backgroundColor: '#34D399' }]} />
                                    <View style={{flex: 1}}>
                                        <Text style={[styles.label, {color:'#34D399'}]}>TEAM 1 (상대)</Text>
                                        <TextInput style={styles.input} placeholder="팀 이름" placeholderTextColor="#64748b" value={team1Name} onChangeText={setTeam1Name} autoCorrect={false} />
                                    </View>
                                </View>
                                <View style={styles.vsDivider}><View style={styles.line} /><Text style={styles.vsText}>VS</Text><View style={styles.line} /></View>
                                <View style={styles.inputGroup}>
                                    <View style={[styles.colorDot, { backgroundColor: '#38BDF8' }]} />
                                    <View style={{flex: 1}}>
                                        <Text style={[styles.label, {color:'#38BDF8'}]}>TEAM 2 (나)</Text>
                                        <TextInput style={styles.input} placeholder="팀 이름" placeholderTextColor="#64748b" value={team2Name} onChangeText={setTeam2Name} autoCorrect={false} />
                                    </View>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.startButton} onPress={handleStartButtonPress}>
                            <Text style={styles.startButtonText}>설정 완료</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // --- Render Game ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      <Modal visible={showExitModal} transparent={true} animationType="fade" onRequestClose={handleResume}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <AlertTriangle size={32} color="#EF4444" style={{marginBottom: 8}}/>
                <Text style={styles.modalTitle}>경기 중단</Text>
                <Text style={styles.modalSubtitle}>중단 사유를 선택해주세요.</Text>
            </View>
            <View style={styles.modalButtonContainer}>
                <TouchableOpacity style={[styles.reasonButton, {borderColor: '#F59E0B'}]} onPress={() => handleExitConfirm('injury')}>
                    <Activity size={20} color="#F59E0B" />
                    <View style={styles.reasonTextContainer}><Text style={[styles.reasonTitle, {color: '#F59E0B'}]}>부상/기권</Text><Text style={styles.reasonDesc}>부상 등으로 경기를 포기합니다.</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reasonButton, {borderColor: '#EF4444'}]} onPress={() => handleExitConfirm('etc')}>
                    <XCircle size={20} color="#EF4444" />
                    <View style={styles.reasonTextContainer}><Text style={[styles.reasonTitle, {color: '#EF4444'}]}>기타 중단</Text><Text style={styles.reasonDesc}>개인 사정으로 경기를 중단합니다.</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.reasonButton, {borderColor: '#94a3b8'}]} onPress={() => handleExitConfirm('cancel')}>
                    <View style={styles.reasonTextContainer}><Text style={[styles.reasonTitle, {color: '#94a3b8'}]}>기록 삭제 및 나가기</Text><Text style={styles.reasonDesc}>이 경기는 기록되지 않습니다.</Text></View>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}><Text style={styles.resumeButtonText}>취소 (경기 계속하기)</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.gameContainer}>
        {/* Team 1 Area */}
        <LinearGradient colors={['#6EE7B7', '#34D399']} style={styles.scoreArea}>
            <View style={styles.inGameHeader}>
                <TouchableOpacity onPress={handleExitPress} style={styles.iconButton}><ArrowLeft size={24} color="rgba(255,255,255,0.8)" /></TouchableOpacity>
                <View style={styles.timerBadge}><Text style={styles.timerText}>{formatTime(elapsedTime)}</Text></View>
                <View style={{width: 24}} />
            </View>
            <TouchableOpacity style={styles.scoreTouchArea} onPress={() => handleScore('team1')} activeOpacity={0.8}>
                <View style={styles.playerBadge}><Text style={styles.playerName}>{team1Name || "TEAM 1"}</Text></View>
                <Text style={styles.bigScore}>{team1Score}</Text>
                <View style={styles.setScoreContainer}><Text style={styles.setScoreLabel}>SET SCORE</Text><Text style={styles.setScoreValue}>{team1SetWins}</Text></View>
            </TouchableOpacity>
        </LinearGradient>

        {/* Team 2 Area */}
        <LinearGradient colors={['#38BDF8', '#22D3EE']} style={styles.scoreArea}>
            <TouchableOpacity style={styles.scoreTouchArea} onPress={() => handleScore('team2')} activeOpacity={0.8}>
                <View style={styles.setScoreContainerTop}><Text style={styles.setScoreLabel}>SET SCORE</Text><Text style={styles.setScoreValue}>{team2SetWins}</Text></View>
                <Text style={styles.bigScore}>{team2Score}</Text>
                <View style={styles.playerBadge}><Text style={styles.playerName}>{team2Name || "TEAM 2"}</Text></View>
            </TouchableOpacity>
            <View style={styles.controlsBar}>
                <TouchableOpacity onPress={handleUndo} style={styles.controlButtonSide} disabled={scoreHistory.length === 0}>
                    <RotateCcw size={28} color={scoreHistory.length === 0 ? "rgba(255,255,255,0.4)" : "white"} />
                    <Text style={[styles.controlLabel, scoreHistory.length === 0 && {opacity: 0.4}]}>되돌리기</Text>
                </TouchableOpacity>
                <View style={{flex: 1}} />
                <TouchableOpacity onPress={() => setIsTimerRunning(!isTimerRunning)} style={styles.controlButtonSide}>
                    {isTimerRunning ? <Pause size={32} color="white" fill="white" /> : <Play size={32} color="white" fill="white" />}
                    <Text style={styles.controlLabel}>{isTimerRunning ? "일시정지" : "계속하기"}</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  gameContainer: { flex: 1 },
  // Setup Styles
  backButton: { position: 'absolute', top: 20, left: 20, padding: 8, zIndex: 10 },
  setupHeader: { marginBottom: 30, alignItems: 'center', marginTop: 20 },
  setupTitle: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: 2 },
  setupSubtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8 },
  noticeContainer: { marginTop: 12, backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: 8, borderRadius: 8 },
  noticeText: { color: '#cbd5e1', fontSize: 13, textAlign: 'center' },
  formCard: { backgroundColor: 'rgba(30, 41, 59, 0.8)', borderRadius: 24, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inputGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, color: 'white', fontSize: 18, borderWidth: 1, borderColor: '#334155' },
  vsDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#334155' },
  vsText: { color: '#64748b', fontWeight: 'bold', marginHorizontal: 16, fontSize: 14 },
  startButton: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8 },
  startButtonText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  // Game Styles
  scoreArea: { flex: 1 },
  inGameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 10 },
  iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20 },
  timerBadge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  timerText: { color: 'white', fontSize: 20, fontWeight: 'bold', fontVariant: ['tabular-nums'] },
  scoreTouchArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  playerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 100, marginBottom: 10 },
  playerName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  bigScore: { fontSize: 140, fontWeight: '800', color: 'white', lineHeight: 140, marginVertical: -10 },
  setScoreContainer: { marginTop: 20, alignItems: 'center', opacity: 0.9 },
  setScoreContainerTop: { marginBottom: 20, alignItems: 'center', opacity: 0.9 },
  setScoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  setScoreValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  controlsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 30, paddingBottom: 20, paddingTop: 10 },
  controlButtonSide: { alignItems: 'center', gap: 4, minWidth: 60 },
  controlLabel: { color: 'white', fontSize: 12, fontWeight: '600' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e293b', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  modalSubtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  modalButtonContainer: { gap: 12 },
  reasonButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#0f172a', borderWidth: 1, gap: 12 },
  reasonTextContainer: { flex: 1 },
  reasonTitle: { fontSize: 16, fontWeight: 'bold' },
  reasonDesc: { fontSize: 12, color: '#64748b' },
  resumeButton: { marginTop: 20, padding: 16, alignItems: 'center', backgroundColor: '#334155', borderRadius: 12 },
  resumeButtonText: { color: 'white', fontWeight: 'bold' }
});