import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  StatusBar,
  Alert,
  Animated,
  Vibration,
  ScrollView,
  Modal,
  Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  Bot,
  Activity,
  Maximize2,
  Move,
  Zap,
  RefreshCcw,
  Square,
  History,
  Clock,
  CheckCircle,
  XCircle,
  Dumbbell,
  Play,
  Trash2,
  FileText,
  Smartphone,
  User,
  Eye,
  HelpCircle,
  Info,
  X
} from 'lucide-react-native';
import { htmlContent } from './poseHtml';

// ---------------- [설정값] ----------------
const ANALYSIS_DURATION = 20;
const SMOOTHING_FACTOR = 0.5;
const SPEED_BUFFER_SIZE = 3;
const USER_HEIGHT_CM = 175;
const ARM_LENGTH_RATIO = 0.45;
const PIXEL_TO_REAL_SCALE = (USER_HEIGHT_CM * ARM_LENGTH_RATIO) / 200;

const MIN_SWING_DISTANCE_PX = 0.3;
const SWING_TRIGGER_SPEED = 40;

type AnalysisMode = 'SWING' | 'LUNGE';

interface ResultData {
  value: number;
  subValue?: number;
  isGood: boolean;
  type: AnalysisMode;
  grade?: string;
  score?: number;
}

interface AnalysisReport {
  id: string;
  date: string;
  mode: AnalysisMode;
  avgScore: number;
  pros: string[];
  cons: string[];
  training: string;
  totalCount: number;
  maxRecord: number;
}

export default function AIAnalysis() {
  // --- State: 기본 상태 ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('SWING');

  // --- State: 실시간 데이터 ---
  const [swingSpeed, setSwingSpeed] = useState(0);
  const [currentElbowAngle, setCurrentElbowAngle] = useState(0);
  const [currentKneeAngle, setCurrentKneeAngle] = useState(0);

  // --- State: 측정 요소 ---
  const [swingScore, setSwingScore] = useState(0);
  const [lungeTime, setLungeTime] = useState(0);
  const [lungeStability, setLungeStability] = useState(0);

  // --- State: 타이머 및 UI ---
  const [timeLeft, setTimeLeft] = useState(ANALYSIS_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);

  // --- Refs: 애니메이션 및 로직 ---
  const [lastResult, setLastResult] = useState<ResultData | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;

  const sessionDataRef = useRef({
    swingSpeeds: [] as number[],
    swingAngles: [] as number[],
    swingKnnScores: [] as number[],
    lungeAngles: [] as number[],
    lungeKnnScores: [] as number[],
    count: 0
  });

  const prevPos = useRef<{ x: number; y: number; time: number; speed: number } | null>(null);
  const speedBuffer = useRef<number[]>([]);
  const webviewRef = useRef<WebView>(null);

  const isSwingingRef = useRef(false);
  const tempMaxSpeedRef = useRef(0);
  const angleAtMaxRef = useRef(0);
  const knnAtMaxRef = useRef(0);
  const swingDistanceRef = useRef(0);

  const isLungingRef = useRef(false);
  const lungeStartTimeRef = useRef(0);

  // --- 1. 권한 요청 ---
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          if (granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED) {
            setHasPermission(true);
          }
        } catch (err) {
          console.warn(err);
        }
      } else {
        setHasPermission(true);
      }
    };
    requestPermission();
  }, []);

  // --- 2. 타이머 로직 ---
  useEffect(() => {
    let interval: any;
    if (isAnalyzing && isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isAnalyzing && isTimerRunning && timeLeft === 0) {
      finishAnalysis();
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isTimerRunning, timeLeft]);

  // --- 3. 기능 함수들 ---
  const enterAnalysisMode = () => {
    if (hasPermission) {
      // 초기화
      setTimeLeft(ANALYSIS_DURATION);
      setIsTimerRunning(false);
      setSwingSpeed(0);
      setSwingScore(0);
      setCurrentElbowAngle(0);
      setCurrentKneeAngle(0);
      setLungeTime(0);
      setLungeStability(0);
      setLastResult(null);
      
      sessionDataRef.current = {
        swingSpeeds: [],
        swingAngles: [],
        swingKnnScores: [],
        lungeAngles: [],
        lungeKnnScores: [],
        count: 0
      };

      setIsAnalyzing(true);
      setShowHelp(true); // 자동 가이드 팝업

      setTimeout(() => {
        webviewRef.current?.postMessage(JSON.stringify({ type: 'setMode', mode: mode }));
      }, 500);
    } else {
      Alert.alert('알림', '카메라 권한이 필요합니다.');
    }
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    Vibration.vibrate(100);
  };

  const finishAnalysis = () => {
    setIsAnalyzing(false);
    setIsTimerRunning(false);
    const newReport = createReport();
    setHistory((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setShowReport(true);
  };

  const getGradeColor = (grade?: string) => {
    switch (grade) {
      case 'SS': return '#FFD700';
      case 'S': return '#A78BFA';
      case 'A': return '#60A5FA';
      case 'B': return '#34D399';
      default: return '#9CA3AF';
    }
  };

  const createReport = (): AnalysisReport => {
    const data = sessionDataRef.current;

    let report: AnalysisReport = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      mode: mode,
      avgScore: 0,
      pros: [],
      cons: [],
      training: '',
      totalCount: data.count,
      maxRecord: 0
    };

    if (data.count === 0) {
      report.training = '측정된 데이터가 없습니다. 동작을 다시 수행해주세요.';
      return report;
    }

    if (mode === 'SWING') {
      const maxSpeed = Math.max(...data.swingSpeeds);
      const avgSpeed = data.swingSpeeds.reduce((a, b) => a + b, 0) / data.swingSpeeds.length;
      const avgAngle = data.swingAngles.reduce((a, b) => a + b, 0) / data.swingAngles.length;
      const avgKnn = data.swingKnnScores.length > 0
        ? data.swingKnnScores.reduce((a, b) => a + b, 0) / data.swingKnnScores.length
        : 0;

      report.maxRecord = maxSpeed;
      const speedScore = Math.min(100, avgSpeed * 0.8);
      const formScore = avgKnn;
      const angleScore = avgAngle >= 160 ? 100 : (avgAngle / 180) * 100;

      report.avgScore = Math.floor(speedScore * 0.5 + formScore * 0.3 + angleScore * 0.2);

      if (maxSpeed >= 110) report.pros.push('상급자 수준의 강력한 스매시 파워입니다.');
      else if (maxSpeed >= 90) report.pros.push('동호인 평균 이상의 스윙 스피드입니다.');

      if (avgKnn >= 80) report.pros.push('프로 선수와 매우 흡사한 완벽한 폼입니다.');
      else if (avgKnn >= 60) report.pros.push('스윙 자세가 안정적입니다.');

      if (avgSpeed < 60) report.cons.push('스윙 속도가 다소 느립니다. 손목 스냅을 더 활용하세요.');
      if (avgKnn < 50) report.cons.push('임팩트 자세가 불안정합니다. 팔을 더 뻗어보세요.');

      if (avgKnn < 60) report.training = '💡 [자세 교정] 쉐도우 스윙으로 프로 선수의 폼을 따라하는 이미지 트레이닝을 하세요.';
      else if (avgSpeed < 90) report.training = '💡 [파워 강화] 라켓 커버를 씌우고 빈 스윙 연습을 하여 손목 근력을 키우세요.';
      else report.training = '💡 [실전 감각] 폼이 완벽합니다. 이제 풋워크와 연결하는 복합 훈련을 추천합니다.';
    } else {
      const avgStab = data.lungeKnnScores.length > 0
        ? data.lungeKnnScores.reduce((a, b) => a + b, 0) / data.lungeKnnScores.length
        : 0;
      const avgAngle = data.lungeAngles.reduce((a, b) => a + b, 0) / data.lungeAngles.length;

      report.maxRecord = avgStab;
      report.avgScore = Math.floor(avgStab);

      if (avgStab >= 85) report.pros.push('프로 선수급의 완벽한 준비 자세입니다.');
      else if (avgStab >= 70) report.pros.push('안정적인 밸런스를 유지하고 있습니다.');

      if (avgAngle >= 120 && avgAngle <= 160) report.pros.push('무릎 각도가 이상적입니다.');

      if (avgAngle < 110) report.cons.push('무릎을 너무 깊게 굽혔습니다. 체력 소모가 클 수 있습니다.');
      else if (avgAngle > 165) report.cons.push('무릎이 너무 서있습니다. 조금 더 낮춰야 반응이 빠릅니다.');

      if (avgStab < 60) report.cons.push('자세가 프로 선수 폼과 차이가 큽니다. 상체를 조금 더 세워보세요.');

      if (avgStab < 70) report.training = '💡 [코어] 플랭크와 스쿼트로 코어 및 하체 지구력을 키우세요.';
      else report.training = '💡 [반응 속도] 제자리에서 잔발을 구르다 출발하는 스플릿 스텝을 연습하세요.';
    }

    if (report.pros.length === 0) report.pros.push('꾸준한 연습이 가장 큰 무기입니다!');
    if (report.cons.length === 0) report.cons.push('특별한 단점이 발견되지 않았습니다. 훌륭합니다!');

    return report;
  };

  const deleteHistory = (id: string) => {
    Alert.alert('삭제', '이 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => setHistory((prev) => prev.filter((item) => item.id !== id)) },
    ]);
  };

  const toggleCamera = () => {
    webviewRef.current?.postMessage(JSON.stringify({ type: 'switchCamera' }));
  };

  const toggleMode = () => {
    if (isTimerRunning) {
      Alert.alert('알림', '분석 중에는 모드를 변경할 수 없습니다.\n먼저 종료해 주세요.');
      return;
    }
    const newMode = mode === 'SWING' ? 'LUNGE' : 'SWING';
    setMode(newMode);
    setLastResult(null);
    popAnim.setValue(0);
    setSwingScore(0);
    setLungeTime(0);
    setLungeStability(0);
    setSwingSpeed(0);
    setCurrentElbowAngle(0);
    setCurrentKneeAngle(0);
    webviewRef.current?.postMessage(JSON.stringify({ type: 'setMode', mode: newMode }));
  };

  const triggerResultAnimation = () => {
    popAnim.setValue(0);
    Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
  };

  const triggerSmashEffect = () => {
    Vibration.vibrate(100);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  };

  // --- 4. WebView 메시지 핸들러 ---
  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'log') return;

      if (parsed.type === 'poseData') {
        const rawX = parsed.x;
        const rawY = parsed.y;
        const currentTime = parsed.timestamp;
        const elbowAngle = Number(parsed.elbowAngle || 0);
        const kneeAngle = Number(parsed.kneeAngle || 0);
        const swingKnnScore = Number(parsed.swingKnnScore || 0);
        const readyKnnScore = Number(parsed.readyKnnScore || 0);

        setCurrentElbowAngle(elbowAngle);
        setCurrentKneeAngle(kneeAngle);

        // ---------------- [SWING MODE] ----------------
        if (mode === 'SWING') {
          if (!prevPos.current) {
            prevPos.current = { x: rawX, y: rawY, time: currentTime, speed: 0 };
            return;
          }
          const dx = rawX - prevPos.current.x;
          const dy = rawY - prevPos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          let dynamicSmoothing = 0.7;
          if (distance > 0.05) dynamicSmoothing = 0.1;
          else if (distance > 0.02) dynamicSmoothing = 0.4;

          const smoothX = prevPos.current.x * dynamicSmoothing + rawX * (1 - dynamicSmoothing);
          const smoothY = prevPos.current.y * dynamicSmoothing + rawY * (1 - dynamicSmoothing);
          let timeDiff = (currentTime - prevPos.current.time) / 1000;
          if (timeDiff < 0.03) timeDiff = 0.03;

          let currentSpeed = 0;
          if (timeDiff < 0.5) {
            const pixelSpeed = distance / timeDiff;
            currentSpeed = pixelSpeed * 40 * PIXEL_TO_REAL_SCALE;
            if (currentSpeed > 350) currentSpeed = 350;
          }
          speedBuffer.current.push(currentSpeed);
          if (speedBuffer.current.length > SPEED_BUFFER_SIZE) speedBuffer.current.shift();
          const avgSpeed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;
          setSwingSpeed(Math.floor(avgSpeed));

          let tempScore = avgSpeed * 0.5 + (elbowAngle > 160 ? 20 : (elbowAngle / 180) * 10) + swingKnnScore * 0.3;
          if (tempScore > 100) tempScore = 100;
          setSwingScore(Math.floor(tempScore));

          if (avgSpeed > SWING_TRIGGER_SPEED && isTimerRunning) {
            if (!isSwingingRef.current) {
              isSwingingRef.current = true;
              tempMaxSpeedRef.current = 0;
              swingDistanceRef.current = 0;
              knnAtMaxRef.current = 0;
            }
            if (avgSpeed > tempMaxSpeedRef.current) {
              tempMaxSpeedRef.current = avgSpeed;
              angleAtMaxRef.current = elbowAngle;
              knnAtMaxRef.current = swingKnnScore;
            }
            swingDistanceRef.current += distance;
          } else {
            if (isSwingingRef.current) {
              isSwingingRef.current = false;
              if (tempMaxSpeedRef.current > 30 && swingDistanceRef.current > MIN_SWING_DISTANCE_PX) {
                const maxSpeed = tempMaxSpeedRef.current;
                sessionDataRef.current.swingSpeeds.push(maxSpeed);
                sessionDataRef.current.swingAngles.push(angleAtMaxRef.current);
                sessionDataRef.current.swingKnnScores.push(knnAtMaxRef.current);
                sessionDataRef.current.count += 1;

                if (maxSpeed >= 90) triggerSmashEffect();
                let grade = 'C';
                if (maxSpeed >= 140) grade = 'SS';
                else if (maxSpeed >= 110) grade = 'S';
                else if (maxSpeed >= 90) grade = 'A';
                else if (maxSpeed >= 60) grade = 'B';

                const finalScore = Math.min(
                  100,
                  Math.floor(maxSpeed * 0.5 + (angleAtMaxRef.current >= 165 ? 20 : 10) + knnAtMaxRef.current * 0.3)
                );

                setLastResult({
                  value: Math.floor(maxSpeed),
                  subValue: angleAtMaxRef.current,
                  isGood: angleAtMaxRef.current >= 165,
                  type: 'SWING',
                  grade: grade,
                  score: finalScore
                });
                triggerResultAnimation();
              }
            }
          }
          prevPos.current = { x: smoothX, y: smoothY, time: currentTime, speed: currentSpeed };
        }

        // ---------------- [READY STANCE MODE] ----------------
        if (mode === 'LUNGE') {
          const READY_START_THRESHOLD = 170;
          const READY_END_THRESHOLD = 175;
          setLungeStability(readyKnnScore);

          if (kneeAngle < READY_START_THRESHOLD) {
            if (!isLungingRef.current) {
              isLungingRef.current = true;
              lungeStartTimeRef.current = currentTime;
            }
            const duration = (currentTime - lungeStartTimeRef.current) / 1000;
            setLungeTime(Number(duration.toFixed(1)));
          } else if (kneeAngle > READY_END_THRESHOLD) {
            if (isLungingRef.current) {
              isLungingRef.current = false;
              if (lungeTime > 1.0 && isTimerRunning) {
                sessionDataRef.current.lungeAngles.push(kneeAngle);
                sessionDataRef.current.lungeKnnScores.push(readyKnnScore);
                sessionDataRef.current.count += 1;
                // GOOD 기준: 40점 이상이면 굿
                const isGoodStance = kneeAngle >= 120 && kneeAngle <= 160 && readyKnnScore >= 40;
                setLastResult({
                  value: Math.floor(kneeAngle),
                  subValue: lungeTime,
                  isGood: isGoodStance,
                  type: 'LUNGE',
                  score: readyKnnScore
                });
                triggerResultAnimation();
              }
              setLungeTime(0);
            }
          }
        }
      }
    } catch (e) {}
  };

  // --- 5. 렌더링 (Render) ---
  if (isAnalyzing) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashAnim, zIndex: 5 }]}
          pointerEvents="none"
        />
        <WebView
          ref={webviewRef}
          style={styles.webview}
          source={{ html: htmlContent, baseUrl: 'https://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          onMessage={handleMessage}
        />

        <View style={styles.topControlContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={toggleMode} style={styles.modeBadge}>
              {mode === 'SWING' ? <Zap size={14} color="#F472B6" /> : <Move size={14} color="#60A5FA" />}
              <Text style={styles.modeText}>{mode === 'SWING' ? '스윙 모드' : '준비 자세 모드'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHelp(true)} style={styles.helpButton}>
              <HelpCircle size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.timerBadge,
              isTimerRunning && {
                borderColor: '#FCD34D',
                borderWidth: 1,
                backgroundColor: 'rgba(252, 211, 77, 0.2)'
              }
            ]}
          >
            <Clock size={14} color={isTimerRunning ? '#FCD34D' : '#9CA3AF'} />
            <Text style={[styles.timerText, { color: isTimerRunning ? '#FCD34D' : '#9CA3AF' }]}>
              {timeLeft}초 {isTimerRunning ? '측정중' : '대기'}
            </Text>
          </View>
        </View>

        <View style={styles.statsOverlay}>
          {mode === 'SWING' ? (
            <>
              <View style={styles.statBox}>
                <Activity size={20} color="#F472B6" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>속도</Text>
                  <Text style={styles.statValue}>{swingSpeed}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Maximize2 size={20} color="#A78BFA" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>각도</Text>
                  <Text style={styles.statValue}>{Math.floor(currentElbowAngle)}°</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <History size={20} color="#FCD34D" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>점수</Text>
                  <Text style={styles.statValue}>{swingScore}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statBox}>
                <Move size={20} color="#60A5FA" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>각도</Text>
                  <Text style={styles.statValue}>{Math.floor(currentKneeAngle)}°</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <History size={20} color="#A78BFA" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>시간</Text>
                  <Text style={styles.statValue}>
                    {lungeTime}
                    <Text style={{ fontSize: 14 }}>s</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Activity size={20} color="#34D399" />
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>안정성</Text>
                  <Text style={styles.statValue}>{lungeStability}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {lastResult && (
          <Animated.View
            style={[
              styles.feedbackCard,
              {
                borderColor:
                  mode === 'SWING'
                    ? getGradeColor(lastResult.grade)
                    : lastResult.isGood
                    ? '#34D399'
                    : '#EF4444',
                transform: [{ scale: popAnim }],
                opacity: popAnim
              }
            ]}
          >
            <View style={styles.feedbackHeader}>
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: mode === 'SWING' ? getGradeColor(lastResult.grade) : 'white' }
                ]}
              >
                {lastResult.grade
                  ? `${lastResult.grade} CLASS`
                  : lastResult.isGood
                  ? 'GOOD!'
                  : 'BAD'}
              </Text>
              <Text style={{ color: 'white', fontSize: 16 }}>
                점수: {lastResult.score || lastResult.value}점
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomControlContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
            <RefreshCcw size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: '#EF4444', paddingHorizontal: 20 }]}
            onPress={() => {
              setIsAnalyzing(false);
              setIsTimerRunning(false);
              setSwingSpeed(0);
              setLastResult(null);
            }}
          >
            <Square size={20} color="white" fill="white" />
            <Text style={styles.controlButtonText}>종료</Text>
          </TouchableOpacity>

          {!isTimerRunning && (
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: '#FCD34D' }]}
              onPress={startTimer}
            >
              <Play size={24} color="black" fill="black" />
            </TouchableOpacity>
          )}
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={showHelp}
          onRequestClose={() => setShowHelp(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20
                }}
              >
                <Text style={styles.modalTitle}>
                  {mode === 'SWING' ? '💥 스윙 모드 가이드' : '🛡️ 준비 자세 모드 가이드'}
                </Text>
                <TouchableOpacity onPress={() => setShowHelp(false)}>
                  <X size={24} color="white" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
                {mode === 'SWING' ? (
                  <View>
                    <Text style={styles.helpSectionTitle}>📊 점수 산정 기준</Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>속도 (50%)</Text>: 임팩트 순간의 손목 가속도
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>폼 유사도 (30%)</Text>: 프로 선수의 폼과 비교 (KNN)
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>타점 각도 (20%)</Text>: 팔꿈치 펴짐 확인
                    </Text>

                    {/* ✅ 스매시 이미지 */}
                    <Image 
                      source={require('../../assets/images/smash_perfect.png')} 
                      style={styles.referenceImage} 
                    />
                    <Text style={styles.imageCaption}>▲ 올바른 스매시 자세 참고</Text>

                    <View style={{height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:16}} />

                    <Text style={styles.helpSectionTitle}>🏆 등급 기준 (속도)</Text>
                    <Text style={styles.helpText}>
                      • <Text style={{ color: '#FFD700' }}>SS</Text>: 140km/h 이상 (선수급)
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={{ color: '#A78BFA' }}>S</Text>: 110km/h 이상 (상급자)
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={{ color: '#60A5FA' }}>A</Text>: 90km/h 이상 (중급자)
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={{ color: '#34D399' }}>B</Text>: 60km/h 이상 (초급자)
                    </Text>

                    <View style={{height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:16}} />

                    {/* ✅ 측정 팁 */}
                    <Text style={styles.helpSectionTitle}>💡 측정 팁</Text>
                    <Text style={styles.helpText}>• 전신이 나오도록 2~3m 뒤에서 촬영하세요.</Text>
                    <Text style={styles.helpText}>• <Text style={styles.boldWhite}>측면</Text>에서 촬영해야 정확합니다.</Text>
                    <Text style={styles.helpText}>• 실제 스매시를 하듯 힘차게 휘두르세요.</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.helpSectionTitle}>🎯 분석 요소</Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>안정성 (KNN)</Text>: 프로 선수의 자세와 유사도 비교
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>무릎 각도</Text>: 120°~160° 유지
                    </Text>

                    {/* ✅ 준비 자세 이미지 */}
                    <Image 
                      source={require('../../assets/images/ready_perfect.png')} 
                      style={styles.referenceImage} 
                    />
                    <Text style={styles.imageCaption}>▲ 올바른 준비 자세 참고</Text>

                    <View style={{height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:16}} />

                    {/* ✅ GOOD / BAD 판정 기준 */}
                    <Text style={styles.helpSectionTitle}>⚖️ 판정 기준 (GOOD / BAD)</Text>
                    <Text style={styles.helpText}>
                      • <Text style={{color:'#34D399', fontWeight:'bold'}}>GOOD</Text>: 
                      무릎 각도 <Text style={styles.boldWhite}>120°~160°</Text> 유지 + 
                      안정성 <Text style={styles.boldWhite}>40점</Text> 이상
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={{color:'#EF4444', fontWeight:'bold'}}>BAD</Text>: 
                      무릎이 너무 굽혀지거나(<Text style={styles.boldWhite}>120° 미만</Text>) 
                      너무 서있을 때(<Text style={styles.boldWhite}>160° 초과</Text>)
                    </Text>

                    <View style={{height:1, backgroundColor:'rgba(255,255,255,0.1)', marginVertical:16}} />

                    <Text style={styles.helpSectionTitle}>💡 측정 방법</Text>
                    <Text style={styles.helpText}>1. 재생 버튼을 누릅니다.</Text>
                    <Text style={styles.helpText}>2. 무릎을 굽혀 기마 자세를 취합니다.</Text>
                    <Text style={styles.helpText}>3. 타이머가 올라가는 동안 버티세요.</Text>
                    <Text style={styles.helpText}>4. 흔들림이 없어야 높은 점수를 받습니다.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- 6. 결과 리포트 모달 ---
  if (showReport && selectedReport) {
    return (
      <Modal animationType="slide" transparent={false} visible={showReport}>
        <View style={styles.reportContainer}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>AI 분석 리포트</Text>
              <Text style={styles.reportDate}>
                {selectedReport.date} ({selectedReport.mode === 'SWING' ? '스윙' : '준비자세'})
              </Text>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>종합 점수</Text>
              <Text style={styles.scoreValue}>
                {selectedReport.avgScore}
                <Text style={{ fontSize: 30 }}>점</Text>
              </Text>
              <View style={styles.countBadge}>
                <Text style={{ color: '#111827', fontWeight: 'bold' }}>
                  {selectedReport.mode === 'SWING'
                    ? `${selectedReport.totalCount}회 수행`
                    : `평균 안정성 ${selectedReport.avgScore}점`
                  }
                  {' | '}
                  최고기록: {Math.floor(selectedReport.maxRecord)}
                  {selectedReport.mode === 'SWING' ? 'km/h' : '점'}
                </Text>
              </View>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>🔥 장점 (Pros)</Text>
              {selectedReport.pros.length > 0 ? (
                selectedReport.pros.map((item, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <CheckCircle size={20} color="#34D399" />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>노력이 필요합니다.</Text>
              )}
            </View>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>⚠️ 보완점 (Cons)</Text>
              {selectedReport.cons.length > 0 ? (
                selectedReport.cons.map((item, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <XCircle size={20} color="#EF4444" />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>완벽합니다.</Text>
              )}
            </View>
            <View
              style={[
                styles.sectionContainer,
                { backgroundColor: '#1F2937', borderColor: '#FCD34D', borderWidth: 1 }
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Dumbbell size={24} color="#FCD34D" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: '#FCD34D', marginBottom: 0, marginLeft: 8 }
                  ]}
                >
                  추천 트레이닝
                </Text>
              </View>
              <Text style={styles.trainingText}>{selectedReport.training}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeReportButton}
              onPress={() => setShowReport(false)}
            >
              <Text style={styles.closeReportText}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // --- 7. 메인 화면 ---
  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={styles.logoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Bot size={60} color="#34D399" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={styles.mainTitle}>AI 영상 분석</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(true)}>
              <HelpCircle size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.mainSubTitle}>
            스윙 속도, 각도, 자세를 실시간으로 분석하여{'\n'}전문적인 피드백을 제공합니다.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mainStartButton}
          onPress={enterAnalysisMode}
          activeOpacity={0.8}
        >
          <Text style={styles.mainStartButtonText}>분석 시작</Text>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>📌 정확한 분석을 위한 가이드</Text>

          <View style={styles.stepItem}>
            <View style={styles.iconBox}>
              <Smartphone size={24} color="#34D399" />
            </View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText} numberOfLines={1} adjustsFontSizeToFit>
                삼각대를 이용해 휴대폰을 <Text style={styles.boldWhite}>고정</Text>해 주세요.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.iconBox}>
              <User size={24} color="#60A5FA" />
            </View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText} numberOfLines={1} adjustsFontSizeToFit>
                머리부터 발끝까지 <Text style={styles.boldWhite}>전신</Text>이 화면에 나와야
                합니다.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.iconBox}>
              <Eye size={24} color="#A78BFA" />
            </View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText} numberOfLines={1} adjustsFontSizeToFit>
                정면보다는 <Text style={styles.boldWhite}>측면</Text>에서 촬영할 때 가장 정확합니다.
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <View style={styles.iconBox}>
              <Clock size={24} color="#FCD34D" />
            </View>
            <View style={styles.stepTextBox}>
              <Text style={styles.stepText}>
                <Text style={styles.boldWhite}>재생 버튼</Text>을 누르면{'\n'}
                <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>20초간 측정</Text>이
                시작됩니다.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>📜 최근 분석 내역</Text>
          {history.length > 0 ? (
            history.map((item) => (
              <View key={item.id} style={styles.historyItemCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setSelectedReport(item);
                    setShowReport(true);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.mode === 'SWING' ? (
                      <Zap size={16} color="#F472B6" />
                    ) : (
                      <Move size={16} color="#60A5FA" />
                    )}
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}
                  >
                    <Text style={styles.historyScore}>{item.avgScore}점</Text>
                    <Text style={styles.historyCount}>{item.totalCount}회 수행</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteHistory(item.id)}
                >
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.historyPlaceholder}>
              <FileText size={24} color="#4B5563" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#6B7280' }}>아직 저장된 기록이 없습니다.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ✅ [메인 화면에서 뜨는 가이드 Modal] 핵심 기술 설명 삭제 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showInfoModal}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20
              }}
            >
              {/* 제목 변경: 기술 소개 -> 가이드 */}
              <Text style={styles.modalTitle}>AI 분석 가이드</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              
              {/* ⚠️ 핵심 기술(MediaPipe, KNN) 설명 삭제됨 */}

              <Text style={styles.helpSectionTitle}>⚡ 스윙 모드</Text>
              <Text style={styles.helpText}>스매시 동작의 속도와 타점을 분석합니다.</Text>
              <Text style={styles.helpSubText}>- 손목 가속도 기반 속도 측정</Text>
              <Text style={styles.helpSubText}>- 팔꿈치 각도 및 폼 유사도 채점</Text>

              <View
                style={{
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  marginVertical: 16
                }}
              />

              <Text style={styles.helpSectionTitle}>🛡️ 준비 자세 모드</Text>
              <Text style={styles.helpText}>수비 및 리시브 준비 자세의 안정성을 봅니다.</Text>
              <Text style={styles.helpSubText}>- 기마 자세 유지 시간 측정</Text>
              <Text style={styles.helpSubText}>- 상체 흔들림 및 무릎 각도 분석</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingTop: 40
  },
  logoSection: { alignItems: 'center', marginBottom: 30 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  mainSubTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22
  },
  mainStartButton: {
    backgroundColor: '#34D399',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 30
  },
  mainStartButtonText: { color: '#111827', fontSize: 18, fontWeight: 'bold' },
  tipCard: { backgroundColor: '#1F2937', padding: 20, borderRadius: 20, marginBottom: 30 },
  tipTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  stepTextBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepText: { color: '#D1D5DB', fontSize: 14, flex: 1, lineHeight: 20 },
  boldWhite: { fontWeight: 'bold', color: 'white' },
  historySection: { marginBottom: 40 },
  historyTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  historyPlaceholder: {
    backgroundColor: '#1F2937',
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#374151'
  },
  historyItemCard: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  historyDate: { color: '#D1D5DB', fontSize: 14, fontWeight: 'bold' },
  historyScore: { color: '#34D399', fontSize: 18, fontWeight: 'bold' },
  historyCount: { color: '#9CA3AF', fontSize: 14 },
  deleteButton: { padding: 8 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  topControlContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 8
  },
  modeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  helpButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6
  },
  timerText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 14 },
  statsOverlay: {
    position: 'absolute',
    top: 150,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statContent: { alignItems: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  divider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.2)' },
  feedbackCard: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    width: '70%',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    alignItems: 'center'
  },
  feedbackHeader: { alignItems: 'center', gap: 5 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  bottomControlContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  controlButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%' // 모달 높이 제한 추가
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginTop: 10 },
  helpSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FCD34D',
    marginBottom: 8
  },
  helpText: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20
  },
  helpSubText: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 2,
    paddingLeft: 10
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  reportContainer: { flex: 1, backgroundColor: '#111827', padding: 24 },
  reportHeader: { marginTop: 40, marginBottom: 30 },
  reportTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  reportDate: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  scoreCard: {
    backgroundColor: '#34D399',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24
  },
  scoreLabel: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  scoreValue: { color: '#064E3B', fontSize: 48, fontWeight: 'bold' },
  countBadge: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8
  },
  sectionContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16
  },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  closeReportButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10
  },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // ✅ 이미지 스타일
  referenceImage: {
    width: '100%',
    height: 250, 
    resizeMode: 'contain',
    marginTop: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  imageCaption: {
    color: '#aaaaaa',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalScrollViewContent: {
    paddingBottom: 20,
  }
});