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
  Dimensions
} from 'react-native';
import { RotateCcw, Play, Pause, ArrowLeft } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';

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
    pointLogs: PointLog[];
    team1Name: string;
    team2Name: string;
  }) => void;
  onCancel: () => void;
}

export function ScoreTracker({ onComplete, onCancel }: ScoreTrackerProps) {
  // --- 상태 관리 ---
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');

  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1SetWins, setTeam1SetWins] = useState(0);
  const [team2SetWins, setTeam2SetWins] = useState(0);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointTimeRef = useRef<number>(0);

  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);

  // --- 경기 시작 알림 ---
  useEffect(() => {
    if (!isSetupMode) {
      const timer = setTimeout(() => {
        Alert.alert(
          "경기 기록 시작",
          "지금부터 경기 기록과 타이머가 시작됩니다.",
          [
            {
              text: "취소",
              onPress: () => setIsSetupMode(true),
              style: "cancel",
            },
            {
              text: "계속하기",
              onPress: () => {
                setIsTimerRunning(true);
                lastPointTimeRef.current = Date.now();
              }
            },
          ]
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSetupMode]);

  // --- 타이머 ---
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

  // --- 핸들러 ---
  const handleStartGame = () => {
    // 이름이 비어있으면 기본값 설정
    if (!team1Name.trim()) setTeam1Name("TEAM 1");
    if (!team2Name.trim()) setTeam2Name("TEAM 2");
    Keyboard.dismiss();
    setIsSetupMode(false);
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

    let setWinner = null;
    if ((newT1 >= 21 || newT2 >= 21) && Math.abs(newT1 - newT2) >= 2) {
       if (newT1 > newT2) setWinner = 'team1'; else setWinner = 'team2';
    }
    if (newT1 === 30) setWinner = 'team1';
    if (newT2 === 30) setWinner = 'team2';

    if (setWinner) {
      if (setWinner === 'team1') newSet1++; else newSet2++;
      newT1 = 0; newT2 = 0;
      setScoreHistory([]);
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
    Alert.alert("점수 되돌리기", "직전 점수를 취소하시겠습니까?", [
        { text: "취소", style: "cancel" },
        {
            text: "확인",
            onPress: () => {
                const last = scoreHistory[scoreHistory.length - 1];
                setTeam1Score(last.t1Score); setTeam2Score(last.t2Score);
                setTeam1SetWins(last.t1Wins); setTeam2SetWins(last.t2Wins);
                setScoreHistory(scoreHistory.slice(0, -1));
                setPointLogs(pointLogs.slice(0, -1));
            }
        }
    ]);
  };

  const handleExit = () => {
    const wasRunning = isTimerRunning;
    setIsTimerRunning(false);
    Alert.alert(
      "경기 종료",
      "정말로 경기 모드를 종료하시겠습니까? 기록이 저장되지 않을 수 있습니다.",
      [
        { text: "취소", onPress: () => { if (wasRunning) setIsTimerRunning(true); }, style: "cancel" },
        { text: "종료", onPress: () => onComplete({
              duration: elapsedTime, team1Wins: team1SetWins, team2Wins: team2SetWins,
              isForced: true, pointLogs: pointLogs,
              team1Name: team1Name || "TEAM 1", team2Name: team2Name || "TEAM 2"
            }), style: "destructive" },
      ]
    );
  };

  // --- 화면 1: 매치 설정 (레이아웃 수정) ---
  if (isSetupMode) {
    return (
      <View style={{flex: 1, backgroundColor: '#0f172a'}}>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" translucent={false} />
        <LinearGradient colors={['#1e293b', '#0f172a']} style={{flex: 1}}>
            <SafeAreaView style={{flex: 1}}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{flex: 1}}
                >
                    <ScrollView contentContainerStyle={{flexGrow: 1, padding: 24}}>
                        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
                            <ArrowLeft size={28} color="#94a3b8" />
                        </TouchableOpacity>

                        {/* 메인 컨텐츠 (헤더 + 폼) - 화면 중앙보다 살짝 위쪽 배치 */}
                        <View style={{flex: 1, justifyContent: 'center', paddingBottom: 60}}>
                            <View style={styles.setupHeader}>
                                <Text style={styles.setupTitle}>MATCH SETUP</Text>
                                <Text style={styles.setupSubtitle}>경기 참가자를 입력해주세요</Text>
                                <View style={styles.noticeContainer}>
                                    <Text style={styles.noticeText}>📌 위쪽 입력란이 상대편, 아래쪽 입력란이 내 편입니다.</Text>
                                </View>
                            </View>

                            <View style={styles.formCard}>
                                <View style={styles.inputGroup}>
                                    <View style={[styles.colorDot, { backgroundColor: '#34D399' }]} />
                                    <View style={{flex: 1}}>
                                        <Text style={[styles.label, {color:'#34D399'}]}>TEAM 1 (상대)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="팀 이름"
                                            placeholderTextColor="#64748b"
                                            value={team1Name}
                                            onChangeText={setTeam1Name}
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>

                                <View style={styles.vsDivider}>
                                    <View style={styles.line} />
                                    <Text style={styles.vsText}>VS</Text>
                                    <View style={styles.line} />
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={[styles.colorDot, { backgroundColor: '#38BDF8' }]} />
                                    <View style={{flex: 1}}>
                                        <Text style={[styles.label, {color:'#38BDF8'}]}>TEAM 2 (나)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="팀 이름"
                                            placeholderTextColor="#64748b"
                                            value={team2Name}
                                            onChangeText={setTeam2Name}
                                            autoCorrect={false}
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* 버튼 하단 고정 */}
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={handleStartGame}
                        >
                            <Text style={styles.startButtonText}>설정 완료</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // --- 화면 2: 경기 모드 ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

      <View style={styles.gameContainer}>
        {/* 1팀 영역 (상단) */}
        <LinearGradient colors={['#6EE7B7', '#34D399']} style={styles.scoreArea}>
            <View style={styles.inGameHeader}>
                <TouchableOpacity onPress={handleExit} style={styles.iconButton}>
                    <ArrowLeft size={24} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <View style={styles.timerBadge}>
                    <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                </View>
                <View style={{width: 24}} />
            </View>

            <TouchableOpacity
                style={styles.scoreTouchArea}
                onPress={() => handleScore('team1')}
                activeOpacity={0.8}
            >
                <View style={styles.playerBadge}>
                    <Text style={styles.playerName}>{team1Name || "TEAM 1"}</Text>
                </View>
                <Text style={styles.bigScore}>{team1Score}</Text>
                <View style={styles.setScoreContainer}>
                    <Text style={styles.setScoreLabel}>SET SCORE</Text>
                    <Text style={styles.setScoreValue}>{team1SetWins}</Text>
                </View>
            </TouchableOpacity>
        </LinearGradient>

        {/* 2팀 영역 (하단) */}
        <LinearGradient colors={['#38BDF8', '#22D3EE']} style={styles.scoreArea}>
            <TouchableOpacity
                style={styles.scoreTouchArea}
                onPress={() => handleScore('team2')}
                activeOpacity={0.8}
            >
                <View style={styles.setScoreContainerTop}>
                    <Text style={styles.setScoreLabel}>SET SCORE</Text>
                    <Text style={styles.setScoreValue}>{team2SetWins}</Text>
                </View>
                <Text style={styles.bigScore}>{team2Score}</Text>
                <View style={styles.playerBadge}>
                    <Text style={styles.playerName}>{team2Name || "TEAM 2"}</Text>
                </View>
            </TouchableOpacity>

            <View style={styles.controlsBar}>
                <TouchableOpacity
                    onPress={handleUndo}
                    style={styles.controlButtonSide}
                    disabled={scoreHistory.length === 0}
                >
                    <RotateCcw size={28} color={scoreHistory.length === 0 ? "rgba(255,255,255,0.4)" : "white"} />
                    <Text style={[styles.controlLabel, scoreHistory.length === 0 && {opacity: 0.4}]}>되돌리기</Text>
                </TouchableOpacity>

                <View style={{flex: 1}} />

                <TouchableOpacity
                    onPress={() => setIsTimerRunning(!isTimerRunning)}
                    style={styles.controlButtonSide}
                >
                    {isTimerRunning ? (
                        <Pause size={32} color="white" fill="white" />
                    ) : (
                        <Play size={32} color="white" fill="white" />
                    )}
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
  setupHeader: { marginBottom: 30, alignItems: 'center', marginTop: 20 }, // margin 조정
  setupTitle: { fontSize: 32, fontWeight: '900', color: 'white', letterSpacing: 2 },
  setupSubtitle: { fontSize: 16, color: '#94a3b8', marginTop: 8 },
  noticeContainer: { marginTop: 12, backgroundColor: 'rgba(51, 65, 85, 0.5)', padding: 8, borderRadius: 8 },
  noticeText: { color: '#cbd5e1', fontSize: 13, textAlign: 'center' },

  formCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  inputGroup: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  input: {
    backgroundColor: '#0f172a', borderRadius: 12, padding: 16, color: 'white', fontSize: 18,
    borderWidth: 1, borderColor: '#334155'
  },
  vsDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#334155' },
  vsText: { color: '#64748b', fontWeight: 'bold', marginHorizontal: 16, fontSize: 14 },

  // 버튼 스타일 수정 (하단 고정 느낌)
  startButton: {
    backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center',
    marginTop: 20, // 여백
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8,
  },
  startButtonText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },

  // Game Styles
  scoreArea: { flex: 1 },

  inGameHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, marginBottom: 10
  },
  iconButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20 },
  timerBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20
  },
  timerText: { color: 'white', fontSize: 20, fontWeight: 'bold', fontVariant: ['tabular-nums'] },

  scoreTouchArea: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  playerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 100, marginBottom: 10
  },
  playerName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  bigScore: { fontSize: 140, fontWeight: '800', color: 'white', lineHeight: 140, marginVertical: -10 },
  setScoreContainer: { marginTop: 20, alignItems: 'center', opacity: 0.9 },
  setScoreContainerTop: { marginBottom: 20, alignItems: 'center', opacity: 0.9 },
  setScoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  setScoreValue: { color: 'white', fontSize: 32, fontWeight: 'bold' },

  controlsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 30, paddingBottom: 20, paddingTop: 10
  },
  controlButtonSide: { alignItems: 'center', gap: 4, minWidth: 60 },
  controlLabel: { color: 'white', fontSize: 12, fontWeight: '600' },
});