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
  Image,
  Dimensions
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
  X,
  Footprints,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  Circle,
  RotateCw,
  Crosshair, // 타점 표시용 (없을 경우 RefreshCcw 등으로 대체 가능)
  Target     // 타겟 아이콘
} from 'lucide-react-native';
import { htmlContent } from './poseHtml';

// ---------------- [설정값] ----------------
const ANALYSIS_DURATION = 20;
const FOOTWORK_DURATION = 60;
const SMOOTHING_FACTOR = 0.5;
const SPEED_BUFFER_SIZE = 3;
const USER_HEIGHT_CM = 175;
const ARM_LENGTH_RATIO = 0.45;
const PIXEL_TO_REAL_SCALE = (USER_HEIGHT_CM * ARM_LENGTH_RATIO) / 200;

const MIN_SWING_DISTANCE_PX = 0.3;
const SWING_TRIGGER_SPEED = 40;
const ESTIMATED_FPS = 30;

export type AnalysisMode = 'SWING' | 'LUNGE' | 'FOOTWORK';
type FootworkDirection = 'CENTER' | 'FRONT_LEFT' | 'FRONT_RIGHT' | 'BACK_LEFT' | 'BACK_RIGHT';

interface ResultData {
  value: number;
  subValue?: number;
  isGood: boolean;
  type: AnalysisMode;
  grade?: string;
  score?: number;
  unit?: string;
}

export interface AnalysisReport {
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mode, setMode] = useState<AnalysisMode>('SWING');

  const [swingSpeed, setSwingSpeed] = useState(0);
  const [currentElbowAngle, setCurrentElbowAngle] = useState(0);
  const [currentKneeAngle, setCurrentKneeAngle] = useState(0);
  
  // [고도화] 신규 분석 지표 상태
  const [currentXFactor, setCurrentXFactor] = useState(0); // 파워
  const [currentCOG, setCurrentCOG] = useState(0);         // 무게중심
  const [heightEfficiency, setHeightEfficiency] = useState(0); // 타점 효율
  const [headTilt, setHeadTilt] = useState(0);             // 시선 안정성

  const [swingScore, setSwingScore] = useState(0);

  const [currentLungeHoldTime, setCurrentLungeHoldTime] = useState(0);
  const [maxLungeHoldTime, setMaxLungeHoldTime] = useState(0);
  const [lungeStability, setLungeStability] = useState(0);

  const [targetDirection, setTargetDirection] = useState<FootworkDirection>('CENTER');
  const [currentFootworkPose, setCurrentFootworkPose] = useState<FootworkDirection>('CENTER');
  const [footworkScore, setFootworkScore] = useState(0);
  const [footworkCombo, setFootworkCombo] = useState(0);
  const [lastActionTime, setLastActionTime] = useState(0);

  const [timeLeft, setTimeLeft] = useState(ANALYSIS_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisReport[]>([]);

  const [lastResult, setLastResult] = useState<ResultData | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;

  // [고도화] 데이터 수집 Refs 확장
  const sessionDataRef = useRef({
    // Swing Data
    swingSpeeds: [] as number[],
    swingAngles: [] as number[],
    swingKnnScores: [] as number[],
    swingXFactors: [] as number[], // 파워 데이터
    swingCOGDeltas: [] as number[], // 체중 이동량
    swingHeights: [] as number[],   // 타점 데이터
    
    // Lunge Data
    lungeHoldTimes: [] as number[],
    lungeKnnScores: [] as number[],
    lungeHeadTilts: [] as number[], // 시선 데이터
    
    // Footwork Data
    footworkReactionTimes: [] as number[],
    footworkSuccessCount: 0,
    count: 0
  });

  const prevPos = useRef<{ x: number; y: number; time: number; speed: number } | null>(null);
  const speedBuffer = useRef<number[]>([]);
  const webviewRef = useRef<WebView>(null);

  const isSwingingRef = useRef(false);
  const tempMaxSpeedRef = useRef(0);
  const angleAtMaxRef = useRef(0);
  const knnAtMaxRef = useRef(0);
  const xFactorAtMaxRef = useRef(0); 
  const swingDistanceRef = useRef(0);
  
  // COG(무게중심) 추적용
  const startCOGRef = useRef(0);

  const isLungingRef = useRef(false);
  const lungeStartTimeRef = useRef(0);

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

  useEffect(() => {
    if (countdown !== null) {
      countdownAnim.setValue(1.5);
      Animated.spring(countdownAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      }).start();

      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else if (countdown === 0) {
        setCountdown(null);
        startActualTimer();
      }
    }
  }, [countdown]);

  useEffect(() => {
    let interval: any;
    if (isAnalyzing && isTimerRunning && mode !== 'LUNGE' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isAnalyzing && isTimerRunning && mode !== 'LUNGE' && timeLeft === 0) {
      finishAnalysis();
    }
    return () => clearInterval(interval);
  }, [isAnalyzing, isTimerRunning, timeLeft, mode]);

  useEffect(() => {
    if (mode === 'FOOTWORK' && isTimerRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(arrowAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      arrowAnim.setValue(1);
    }
  }, [mode, isTimerRunning, targetDirection]);

  useEffect(() => {
    if (mode !== 'FOOTWORK' || !isTimerRunning) return;

    if (targetDirection === 'CENTER' && currentFootworkPose === 'CENTER') {
      const directions: FootworkDirection[] = ['FRONT_LEFT', 'FRONT_RIGHT', 'BACK_LEFT', 'BACK_RIGHT'];
      const nextDir = directions[Math.floor(Math.random() * directions.length)];

      setTimeout(() => {
        setTargetDirection(nextDir);
        setLastActionTime(Date.now());
        Vibration.vibrate(50);
      }, 500);
    }
    else if (targetDirection !== 'CENTER' && currentFootworkPose === targetDirection) {
      const reactionTime = (Date.now() - lastActionTime) / 1000;
      sessionDataRef.current.footworkReactionTimes.push(reactionTime);
      sessionDataRef.current.footworkSuccessCount += 1;

      const points = Math.max(10, Math.floor(100 - reactionTime * 30));
      setFootworkScore(prev => prev + points);
      setFootworkCombo(prev => prev + 1);

      triggerResultAnimation();
      setLastResult({
        value: points,
        isGood: true,
        type: 'FOOTWORK',
        grade: reactionTime < 1.0 ? 'PERFECT' : 'GOOD',
        score: points,
        unit: '점'
      });

      setTargetDirection('CENTER');
    }
  }, [currentFootworkPose, targetDirection, isTimerRunning, mode]);

  const enterAnalysisMode = () => {
    if (hasPermission) {
      const duration = mode === 'FOOTWORK' ? FOOTWORK_DURATION : ANALYSIS_DURATION;
      setTimeLeft(duration);
      setIsTimerRunning(false);
      setCountdown(null);

      setSwingSpeed(0);
      setSwingScore(0);
      setCurrentElbowAngle(0);
      setCurrentKneeAngle(0);
      
      // 초기화
      setCurrentXFactor(0);
      setCurrentCOG(0);
      setHeightEfficiency(0);
      setHeadTilt(0);

      setCurrentLungeHoldTime(0);
      setMaxLungeHoldTime(0);
      setLungeStability(0);

      setFootworkScore(0);
      setFootworkCombo(0);
      setTargetDirection('CENTER');

      setLastResult(null);

      sessionDataRef.current = {
        swingSpeeds: [], swingAngles: [], swingKnnScores: [], 
        swingXFactors: [], swingCOGDeltas: [], swingHeights: [],
        lungeHoldTimes: [], lungeKnnScores: [], lungeHeadTilts: [],
        footworkReactionTimes: [], footworkSuccessCount: 0,
        count: 0
      };

      setIsAnalyzing(true);
      setShowHelp(true);

      setTimeout(() => {
        webviewRef.current?.postMessage(JSON.stringify({ type: 'setMode', mode: mode }));
      }, 500);
    } else {
      Alert.alert('알림', '카메라 권한이 필요합니다.');
    }
  };

  const onPlayPress = () => {
    setCountdown(3);
    setShowHelp(false);
  };

  const startActualTimer = () => {
    setIsTimerRunning(true);
    Vibration.vibrate(100);
    if (mode === 'FOOTWORK') setTargetDirection('CENTER');
  };

  const finishAnalysis = () => {
    setIsAnalyzing(false);
    setIsTimerRunning(false);
    setCountdown(null);
    const newReport = createReport();
    setHistory((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setShowReport(true);
  };

  const getGradeColor = (grade?: string) => {
    if (grade === 'PERFECT') return '#FFD700';
    switch (grade) {
      case 'SS': return '#FFD700';
      case 'S': return '#A78BFA';
      case 'A': return '#60A5FA';
      case 'B': return '#34D399';
      default: return '#9CA3AF';
    }
  };

  // [고도화된 리포트 생성 로직]
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
      totalCount: 0,
      maxRecord: 0
    };

    if (mode === 'SWING') {
      if (data.count === 0) {
        report.training = '측정된 데이터가 없습니다. 동작을 다시 수행해주세요.';
        return report;
      }
      const maxSpeed = Math.floor(Math.max(...data.swingSpeeds));
      const avgKnn = data.swingKnnScores.reduce((a, b) => a + b, 0) / (data.swingKnnScores.length || 1);
      const avgSpeed = data.swingSpeeds.reduce((a,b)=>a+b,0) / (data.swingSpeeds.length || 1);
      
      // 고도화 지표 평균 계산
      const avgXFactor = data.swingXFactors.reduce((a,b)=>a+b,0) / (data.swingXFactors.length || 1);
      const avgHeight = data.swingHeights.reduce((a,b)=>a+b,0) / (data.swingHeights.length || 1);
      const avgCOGDelta = data.swingCOGDeltas.reduce((a,b)=>a+b,0) / (data.swingCOGDeltas.length || 1);

      report.totalCount = data.count;
      report.maxRecord = maxSpeed;

      // [점수 계산 고도화]
      // 속도(30) + 폼(20) + X-Factor(20) + 타점(15) + 체중이동(15)
      const speedScore = Math.min(100, avgSpeed * 0.8) * 0.3;
      const formScore = avgKnn * 0.2;
      const powerScore = Math.min(100, avgXFactor * 2.5) * 0.2; // 40도 이상이면 만점
      const heightScore = Math.min(100, avgHeight) * 0.15; // 100% 비율이면 만점
      const weightScore = Math.min(100, avgCOGDelta * 1000) * 0.15; // 이동량 0.1 이상이면 만점

      report.avgScore = Math.floor(speedScore + formScore + powerScore + heightScore + weightScore);

      if (maxSpeed >= 110) report.pros.push('상급자 수준의 강력한 스매시 파워를 보유하고 계십니다.');
      if (avgXFactor >= 35) report.pros.push('상하체 꼬임(X-Factor)이 완벽하여 강력한 토크를 생성합니다.');
      if (avgHeight >= 90) report.pros.push('타점이 매우 높습니다. 이상적인 공격 각도를 만들고 있습니다.');

      if (avgXFactor < 20) {
          report.cons.push('몸통 회전이 부족합니다. 백스윙 시 어깨를 더 깊이 넣어주세요.');
          report.training = '라켓 없이 골반을 고정한 채 어깨만 90도 회전하는 스트레칭을 반복하세요.';
      } else if (avgHeight < 75) {
          report.cons.push('타점이 낮아 네트에 걸릴 확률이 높습니다. 팔을 끝까지 뻗으세요.');
          report.training = '셔틀콕을 천장에 매달고, 점프하여 가장 높은 지점에서 타격하는 연습을 하세요.';
      } else if (avgCOGDelta < 0.03) {
          report.cons.push('제자리에서 팔로만 치고 있습니다. 체중을 앞발로 확실히 실어주세요.');
          report.training = '스윙 후 뒷발이 앞발 위치까지 따라나오는 런닝 스텝 스매시를 연습하세요.';
      } else {
          report.training = '폼과 파워가 완벽합니다. 이제 풋워크와 결합하여 실전 경기에서의 득점력을 높여보세요.';
      }

    } else if (mode === 'LUNGE') {
      const maxHold = maxLungeHoldTime;
      const totalAttempts = data.lungeHoldTimes.length;
      const avgHeadTilt = data.lungeHeadTilts.reduce((a,b)=>a+b,0) / (data.lungeHeadTilts.length || 1);

      report.maxRecord = maxHold;
      report.totalCount = totalAttempts;

      // [준비자세 점수 고도화]
      // 버티기(40) + 자세안정성(30) + 시선안정성(30)
      const holdScore = Math.min(100, (maxHold / 60) * 100) * 0.4;
      const stabilityScore = lungeStability * 0.3;
      const headScore = Math.max(0, 100 - (avgHeadTilt * 10)) * 0.3; // 기울기 0이면 100점

      report.avgScore = Math.floor(holdScore + stabilityScore + headScore);

      if (maxHold >= 45) report.pros.push('매우 안정적인 하체 밸런스를 유지하고 있습니다.');
      if (avgHeadTilt < 3) report.pros.push('시선 처리가 매우 안정적입니다. 상대의 움직임을 놓치지 않겠네요.');

      if (avgHeadTilt > 10) report.cons.push('버티는 동안 머리가 한쪽으로 기울어집니다. 턱을 당기고 수평을 유지하세요.');
      if (maxHold < 15) report.cons.push('하체 근력이 부족하여 자세가 금방 무너집니다.');

      report.training = maxHold < 30
        ? '벽에 등을 기대고 투명의자 자세로 버티는 훈련을 매일 1분씩 3세트 수행하세요.'
        : '준비 자세를 유지한 채 날아오는 셔틀콕의 색깔이나 회전을 식별하는 훈련을 추가하세요.';

    } else if (mode === 'FOOTWORK') {
      const totalSuccess = data.footworkSuccessCount;
      if (totalSuccess === 0) {
        report.training = '성공한 스텝이 없습니다. 화면의 화살표를 보고 천천히 다시 시도하세요.';
        return report;
      }
      const avgReaction = data.footworkReactionTimes.reduce((a,b)=>a+b,0) / totalSuccess;

      report.totalCount = totalSuccess;
      report.maxRecord = avgReaction;
      report.avgScore = footworkScore;

      if (avgReaction < 0.8) report.pros.push('반사 신경이 매우 빠릅니다.');
      else if (avgReaction < 1.2) report.pros.push('준수한 반응 속도입니다. 스텝 리듬이 좋습니다.');

      if (avgReaction > 1.5) report.cons.push('반응 후 첫 발을 떼는 속도가 느립니다.');

      report.training = '줄넘기 2단 뛰기와 사이드 스텝 왕복 달리기가 순발력 향상에 큰 도움이 됩니다.';
    }

    if (report.pros.length === 0) report.pros.push('꾸준한 연습이 가장 큰 무기입니다! 조금만 더 노력해보세요.');
    if (report.cons.length === 0) report.cons.push('특별한 단점이 발견되지 않았습니다. 정말 훌륭합니다!');

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
    let newMode: AnalysisMode = 'SWING';
    if (mode === 'SWING') newMode = 'LUNGE';
    else if (mode === 'LUNGE') newMode = 'FOOTWORK';
    else newMode = 'SWING';

    setMode(newMode);

    const duration = newMode === 'FOOTWORK' ? FOOTWORK_DURATION : ANALYSIS_DURATION;
    setTimeLeft(duration);
    setLastResult(null);
    popAnim.setValue(0);
    setSwingScore(0);
    setCurrentLungeHoldTime(0);
    setMaxLungeHoldTime(0);
    setFootworkScore(0);

    // 초기화
    setCurrentXFactor(0);
    setCurrentCOG(0);
    setHeightEfficiency(0);
    setHeadTilt(0);

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

  const handleMessage = (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data);
      if (parsed.type === 'log') return;

      if (parsed.type === 'poseData') {
        if (countdown !== null) return;

        const rawX = parsed.x;
        const rawY = parsed.y;
        const currentTime = parsed.timestamp;
        const elbowAngle = Number(parsed.elbowAngle || 0);
        const kneeAngle = Number(parsed.kneeAngle || 0);
        const swingKnnScore = Number(parsed.swingKnnScore || 0);
        const readyKnnScore = Number(parsed.readyKnnScore || 0);
        
        // [고도화] 신규 데이터 수신
        const xFactor = Number(parsed.xFactor || 0);
        const cogX = Number(parsed.cogX || 0);
        const hEff = Number(parsed.heightEfficiency || 0);
        const hTilt = Number(parsed.headTilt || 0);

        const footworkPoseRaw = parsed.footworkPose;
        const footworkPose = (footworkPoseRaw === 'UNKNOWN') ? 'CENTER' : (footworkPoseRaw as FootworkDirection);

        setCurrentElbowAngle(elbowAngle);
        setCurrentKneeAngle(kneeAngle);
        // 상태 업데이트
        setCurrentXFactor(xFactor);
        setCurrentCOG(cogX);
        setHeightEfficiency(hEff);
        setHeadTilt(hTilt);

        if (mode === 'FOOTWORK') {
            if(footworkPoseRaw !== 'UNKNOWN') {
                setCurrentFootworkPose(footworkPose);
            }
        }

        if (mode === 'SWING') {
          if (!prevPos.current) {
            prevPos.current = { x: rawX, y: rawY, time: currentTime, speed: 0 };
            return;
          }
          const dx = rawX - prevPos.current.x;
          const dy = rawY - prevPos.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // ... (기존 스무딩 및 속도 계산 로직)
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

          // [점수 계산 고도화] 실시간 점수 반영
          let tempScore = (avgSpeed * 0.3) + (swingKnnScore * 0.2) + 
                          (elbowAngle > 160 ? 10 : 0) + 
                          (xFactor > 30 ? 20 : xFactor * 0.5) +
                          (hEff > 80 ? 20 : hEff * 0.2);
          
          if (tempScore > 100) tempScore = 100;
          setSwingScore(Math.floor(tempScore));

          // 스윙 감지 로직
          if (avgSpeed > SWING_TRIGGER_SPEED && isTimerRunning) {
            if (!isSwingingRef.current) {
              isSwingingRef.current = true;
              tempMaxSpeedRef.current = 0;
              swingDistanceRef.current = 0;
              knnAtMaxRef.current = 0;
              xFactorAtMaxRef.current = 0;
              startCOGRef.current = cogX; // 스윙 시작 시 무게중심 기록
            }
            if (avgSpeed > tempMaxSpeedRef.current) {
              tempMaxSpeedRef.current = avgSpeed;
              angleAtMaxRef.current = elbowAngle;
              knnAtMaxRef.current = swingKnnScore;
              xFactorAtMaxRef.current = xFactor;
            }
            swingDistanceRef.current += distance;
          } else {
            if (isSwingingRef.current) {
              isSwingingRef.current = false;
              if (tempMaxSpeedRef.current > 30 && swingDistanceRef.current > MIN_SWING_DISTANCE_PX) {
                const maxSpeed = tempMaxSpeedRef.current;
                const bestXFactor = xFactorAtMaxRef.current;
                const cogDelta = Math.abs(startCOGRef.current - cogX); // 이동 거리

                // 데이터 저장
                sessionDataRef.current.swingSpeeds.push(maxSpeed);
                sessionDataRef.current.swingAngles.push(angleAtMaxRef.current);
                sessionDataRef.current.swingKnnScores.push(knnAtMaxRef.current);
                sessionDataRef.current.swingXFactors.push(bestXFactor); 
                sessionDataRef.current.swingHeights.push(hEff);
                sessionDataRef.current.swingCOGDeltas.push(cogDelta);
                sessionDataRef.current.count += 1;

                if (maxSpeed >= 90) triggerSmashEffect();

                let grade = 'C';
                if (maxSpeed >= 140) grade = 'SS';
                else if (maxSpeed >= 110) grade = 'S';
                else if (maxSpeed >= 90) grade = 'A';
                else if (maxSpeed >= 60) grade = 'B';

                // 최종 스윙 점수 (단건)
                const finalScore = Math.min(
                  100,
                  Math.floor((maxSpeed * 0.3) + (knnAtMaxRef.current * 0.2) + (bestXFactor * 0.3) + (hEff * 0.2))
                );

                setLastResult({
                  value: Math.floor(maxSpeed),
                  subValue: angleAtMaxRef.current,
                  isGood: angleAtMaxRef.current >= 165,
                  type: 'SWING',
                  grade: grade,
                  score: finalScore,
                  unit: 'km/h'
                });
                triggerResultAnimation();
              }
            }
          }
          prevPos.current = { x: smoothX, y: smoothY, time: currentTime, speed: currentSpeed };
        }

        if (mode === 'LUNGE') {
          const READY_START_THRESHOLD = 155;
          const READY_END_THRESHOLD = 165;
          setLungeStability(readyKnnScore);

          if (kneeAngle < READY_START_THRESHOLD) {
            if (!isLungingRef.current) {
              isLungingRef.current = true;
              lungeStartTimeRef.current = currentTime;
            }
            const duration = (currentTime - lungeStartTimeRef.current) / 1000;
            const currentHold = Number(duration.toFixed(1));
            setCurrentLungeHoldTime(currentHold);

            if (isTimerRunning) {
                if (currentHold > maxLungeHoldTime) setMaxLungeHoldTime(currentHold);
                sessionDataRef.current.lungeKnnScores.push(readyKnnScore);
                sessionDataRef.current.lungeHeadTilts.push(hTilt); // 시선 데이터 수집
            }

          } else if (kneeAngle > READY_END_THRESHOLD) {
            if (isLungingRef.current) {
              isLungingRef.current = false;
              if (currentLungeHoldTime > 1.0 && isTimerRunning) {
                sessionDataRef.current.lungeHoldTimes.push(currentLungeHoldTime);
                setLastResult({
                  value: Math.floor(currentLungeHoldTime),
                  subValue: readyKnnScore,
                  isGood: currentLungeHoldTime >= 30,
                  type: 'LUNGE',
                  score: readyKnnScore,
                  unit: '초'
                });
                triggerResultAnimation();
              }
              setCurrentLungeHoldTime(0);
            }
          }
        }
      }
    } catch (e) {}
  };

  // [UI] 통계 오버레이 렌더링
  const renderStatsOverlay = () => {
    if (mode === 'FOOTWORK') return renderFootworkOverlay();

    return (
        <View style={styles.statsOverlay}>
            {mode === 'SWING' ? (
              <>
                <View style={styles.statBox}><Activity size={20} color="#F472B6" /><View style={styles.statContent}><Text style={styles.statLabel}>속도</Text><Text style={styles.statValue}>{swingSpeed}</Text></View></View>
                <View style={styles.divider} />
                {/* 회전(X-Factor) */}
                <View style={styles.statBox}><RotateCw size={20} color="#60A5FA" /><View style={styles.statContent}><Text style={styles.statLabel}>회전(X-F)</Text><Text style={styles.statValue}>{Math.floor(currentXFactor)}°</Text></View></View>
                <View style={styles.divider} />
                {/* 타점 효율 */}
                <View style={styles.statBox}><Crosshair size={20} color="#34D399" /><View style={styles.statContent}><Text style={styles.statLabel}>타점</Text><Text style={styles.statValue}>{Math.floor(heightEfficiency)}%</Text></View></View>
              </>
            ) : (
              <>
                <View style={styles.statBox}><Move size={20} color="#60A5FA" /><View style={styles.statContent}><Text style={styles.statLabel}>무릎각도</Text><Text style={styles.statValue}>{Math.floor(currentKneeAngle)}°</Text></View></View>
                <View style={styles.divider} />
                {/* 시선 안정성 */}
                <View style={styles.statBox}><User size={20} color="#FCD34D" /><View style={styles.statContent}><Text style={styles.statLabel}>시선</Text><Text style={styles.statValue}>{headTilt < 5 ? '좋음' : '주의'}</Text></View></View>
                <View style={styles.divider} />
                <View style={styles.statBox}><Clock size={20} color="#34D399" /><View style={styles.statContent}><Text style={styles.statLabel}>버티기</Text><Text style={styles.statValue}>{currentLungeHoldTime}s</Text></View></View>
              </>
            )}
        </View>
    );
  };

  const renderFootworkOverlay = () => {
    const getArrowColor = (dir: FootworkDirection) => targetDirection === dir ? '#FCD34D' : 'rgba(255,255,255,0.2)';
    const getArrowScale = (dir: FootworkDirection) => targetDirection === dir ? arrowAnim : 1;

    return (
        <View style={styles.footworkOverlay}>
            <View style={styles.arrowRow}>
                <Animated.View style={{ transform: [{ scale: getArrowScale('FRONT_LEFT') }] }}>
                    <ArrowUpLeft size={80} color={getArrowColor('FRONT_LEFT')} />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: getArrowScale('FRONT_RIGHT') }] }}>
                    <ArrowUpRight size={80} color={getArrowColor('FRONT_RIGHT')} />
                </Animated.View>
            </View>
            <View style={styles.centerIndicator}>
                <Animated.View style={{ transform: [{ scale: getArrowScale('CENTER') }] }}>
                    {/* Circle 아이콘 weight 오류 수정 -> fill 속성 사용 */}
                    <Circle size={60} color={getArrowColor('CENTER')} fill={targetDirection === 'CENTER' ? '#FCD34D' : 'transparent'} />
                </Animated.View>
                <Text style={styles.commandText}>
                    {targetDirection === 'CENTER' ? '중앙 복귀!' : targetDirection === 'FRONT_RIGHT' ? '전방 우측!' : targetDirection === 'FRONT_LEFT' ? '전방 좌측!' : targetDirection === 'BACK_RIGHT' ? '후방 우측!' : '후방 좌측!'}
                </Text>
            </View>
            <View style={styles.arrowRow}>
                <Animated.View style={{ transform: [{ scale: getArrowScale('BACK_LEFT') }] }}>
                    <ArrowDownLeft size={80} color={getArrowColor('BACK_LEFT')} />
                </Animated.View>
                <Animated.View style={{ transform: [{ scale: getArrowScale('BACK_RIGHT') }] }}>
                    <ArrowDownRight size={80} color={getArrowColor('BACK_RIGHT')} />
                </Animated.View>
            </View>
        </View>
    );
  };

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

  if (isAnalyzing) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashAnim, zIndex: 5 }]} pointerEvents="none" />
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

        {countdown !== null && (
          <View style={styles.countdownOverlay}>
             <Animated.Text style={[styles.countdownText, { transform: [{ scale: countdownAnim }] }]}>
               {countdown === 0 ? 'START!' : countdown}
             </Animated.Text>
             <Text style={styles.countdownSubText}>준비하세요!</Text>
          </View>
        )}

        <View style={styles.topControlContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={toggleMode} style={styles.modeBadge}>
              {mode === 'SWING' ? <Zap size={14} color="#F472B6" /> : mode === 'LUNGE' ? <Move size={14} color="#60A5FA" /> : <Footprints size={14} color="#FCD34D" />}
              <Text style={styles.modeText}>{mode === 'SWING' ? '스윙 모드' : mode === 'LUNGE' ? '준비 자세' : '풋워크 게임'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHelp(true)} style={styles.helpButton}><HelpCircle size={20} color="white" /></TouchableOpacity>
          </View>
          <View style={styles.timerBadge}>
            <Clock size={14} color={isTimerRunning ? '#FCD34D' : '#9CA3AF'} />
            <Text style={[styles.timerText, { color: isTimerRunning ? '#FCD34D' : '#9CA3AF' }]}>
              {mode === 'LUNGE' ? (isTimerRunning ? '기록 측정 중' : '대기') : `${timeLeft}초 ${isTimerRunning ? '진행중' : '대기'}`}
            </Text>
          </View>
        </View>

        {/* 오버레이 통합 렌더링 함수 사용 */}
        {renderStatsOverlay()}

        {mode === 'FOOTWORK' && (
            <View style={{ position: 'absolute', top: 120, right: 20, alignItems:'flex-end' }}>
                <Text style={{ color: '#FCD34D', fontSize: 32, fontWeight: 'bold' }}>{footworkScore}</Text>
                <Text style={{ color: 'white', fontSize: 14 }}>COMBO: {footworkCombo}</Text>
            </View>
        )}

        {lastResult && (
          <Animated.View style={[styles.feedbackCard, { borderColor: mode === 'SWING' ? getGradeColor(lastResult.grade) : lastResult.isGood ? '#34D399' : '#EF4444', transform: [{ scale: popAnim }], opacity: popAnim }]}>
            <View style={styles.feedbackHeader}>
              <Text style={[styles.feedbackTitle, { color: mode === 'SWING' ? getGradeColor(lastResult.grade) : 'white' }]}>
                {lastResult.grade ? `${lastResult.grade} CLASS` : lastResult.isGood ? 'GOOD!' : 'BAD'}
              </Text>
              <Text style={{ color: 'white', fontSize: 16 }}>
                {mode === 'SWING' ? `최고속도: ${lastResult.value}km/h` : mode === 'LUNGE' ? `기록: ${lastResult.value}초` : `+${lastResult.score}점`}
              </Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomControlContainer}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}><RefreshCcw size={24} color="white" /></TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#EF4444', paddingHorizontal: 20 }]} onPress={finishAnalysis}>
            <Square size={20} color="white" fill="white" /><Text style={styles.controlButtonText}>종료</Text>
          </TouchableOpacity>
          {!isTimerRunning && countdown === null && (
            <TouchableOpacity style={[styles.controlButton, { backgroundColor: '#FCD34D' }]} onPress={onPlayPress}><Play size={24} color="black" fill="black" /></TouchableOpacity>
          )}
        </View>

        <Modal animationType="fade" transparent visible={showHelp} onRequestClose={() => setShowHelp(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.modalTitle}>
                    {mode === 'SWING' ? '💥 스윙 모드 가이드' : mode === 'LUNGE' ? '🛡️ 준비 자세 모드 가이드' : '👣 풋워크 게임 가이드'}
                </Text>
                <TouchableOpacity onPress={() => setShowHelp(false)}><X size={24} color="white" /></TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
                {mode === 'SWING' ? (
                  <View>
                    <Text style={styles.helpSectionTitle}>📊 점수 산정 기준 (고도화)</Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>속도 (30%)</Text>: 임팩트 순간의 가속도
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>회전력 (20%)</Text>: <Text style={{color:'#60A5FA'}}>X-Factor</Text> (상하체 꼬임)
                    </Text>
                    <Text style={styles.helpText}>
                      • <Text style={styles.boldWhite}>타점 (15%)</Text>: 신장 대비 타격 높이 효율
                    </Text>
                    
                    <Image source={require('../../assets/images/smash_perfect.png')} style={styles.referenceImage} />
                    <Text style={styles.imageCaption}>▲ 올바른 스매시 자세 참고</Text>
                  </View>
                ) : mode === 'LUNGE' ? (
                  <View>
                    <Text style={styles.helpSectionTitle}>🎯 분석 요소</Text>
                    <Text style={styles.helpText}>• <Text style={styles.boldWhite}>최대 버티기 시간</Text>: 자세 유지 시간</Text>
                    <Text style={styles.helpText}>• <Text style={styles.boldWhite}>시선 안정성</Text>: 머리의 수평 유지 여부</Text>

                    <Image source={require('../../assets/images/ready_perfect.png')} style={styles.referenceImage} />
                    <Text style={styles.imageCaption}>▲ 올바른 준비 자세 참고</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.helpSectionTitle}>🎮 게임 규칙</Text>
                    <Text style={styles.helpText}>1. 중앙에서 시작하여 지시 방향으로 스텝을 밟으세요.</Text>
                    <Text style={styles.helpText}>2. 정확하고 빠른 반응속도를 측정합니다.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.logoSection}>
          <Bot size={60} color="#34D399" style={{marginBottom:16}} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={styles.mainTitle}>AI 영상 분석</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(true)}><HelpCircle size={24} color="#9CA3AF" /></TouchableOpacity>
          </View>
          <Text style={styles.mainSubTitle}>스윙 속도, 자세, 풋워크를 분석하여{'\n'}전문적인 피드백을 제공합니다.</Text>
        </View>

        <TouchableOpacity style={styles.mainStartButton} onPress={enterAnalysisMode} activeOpacity={0.8}>
          <Text style={styles.mainStartButtonText}>분석 시작</Text>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>📌 정확한 분석을 위한 가이드</Text>
          <View style={styles.stepItem}><View style={styles.iconBox}><Smartphone size={24} color="#34D399" /></View><Text style={styles.stepText}>삼각대를 이용해 휴대폰을 <Text style={styles.boldWhite}>고정</Text>해 주세요.</Text></View>
          <View style={styles.stepItem}><View style={styles.iconBox}><User size={24} color="#60A5FA" /></View><Text style={styles.stepText}>머리부터 발끝까지 <Text style={styles.boldWhite}>전신</Text>이 화면에 나와야 합니다.</Text></View>
          <View style={styles.stepItem}><View style={styles.iconBox}><Eye size={24} color="#A78BFA" /></View><Text style={styles.stepText}>정면보다는 <Text style={styles.boldWhite}>측면</Text>에서 촬영할 때 가장 정확합니다.</Text></View>
          <View style={styles.stepItem}><View style={styles.iconBox}><Clock size={24} color="#FCD34D" /></View><Text style={styles.stepText}><Text style={styles.boldWhite}>시작 후 3초간</Text> 준비 자세를 취해주세요.</Text></View>
        </View>

        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>📜 최근 분석 내역</Text>
          {history.length > 0 ? (
            history.map((item) => (
              <View key={item.id} style={styles.historyItemCard}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedReport(item); setShowReport(true); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.mode === 'SWING' ? <Zap size={16} color="#F472B6" /> : item.mode === 'LUNGE' ? <Move size={16} color="#60A5FA" /> : <Footprints size={16} color="#FCD34D" />}
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 12 }}>
                    <Text style={styles.historyScore}>{item.avgScore}점</Text>
                    <Text style={styles.historyCount}>
                        {item.mode === 'SWING' ? `${item.maxRecord}km/h` : item.mode === 'LUNGE' ? `${item.maxRecord}초` : `${item.totalCount}회`}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteHistory(item.id)}><Trash2 size={18} color="#EF4444" /></TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.historyPlaceholder}><FileText size={24} color="#4B5563" style={{ marginBottom: 8 }} /><Text style={{ color: '#6B7280' }}>아직 저장된 기록이 없습니다.</Text></View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent visible={showInfoModal} onRequestClose={() => setShowInfoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>AI 분석 가이드</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}><X size={24} color="white" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.helpSectionTitle}>⚡ 스윙 모드</Text>
              <Text style={styles.helpText}>스매시 동작의 속도와 타점을 분석합니다.</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 }} />
              <Text style={styles.helpSectionTitle}>🛡️ 준비 자세 모드</Text>
              <Text style={styles.helpText}>수비 및 리시브 준비 자세의 안정성을 분석합니다.</Text>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 }} />
              <Text style={styles.helpSectionTitle}>👣 풋워크 모드</Text>
              <Text style={styles.helpText}>지시 방향으로 움직이는 게임형 훈련입니다.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#111827', paddingHorizontal: 24, paddingTop: 40 },
  logoSection: { alignItems: 'center', marginBottom: 30 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  mainSubTitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  mainStartButton: { backgroundColor: '#34D399', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 30 },
  mainStartButtonText: { color: '#111827', fontSize: 18, fontWeight: 'bold' },
  tipCard: { backgroundColor: '#1F2937', padding: 20, borderRadius: 20, marginBottom: 30 },
  tipTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 20 },
  stepItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stepTextBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  stepText: { color: '#D1D5DB', fontSize: 14, flex: 1, lineHeight: 20 },
  boldWhite: { fontWeight: 'bold', color: 'white' },
  historySection: { marginBottom: 40 },
  historyTitle: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  historyPlaceholder: { backgroundColor: '#1F2937', height: 100, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#374151' },
  historyItemCard: { backgroundColor: '#1F2937', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { color: '#D1D5DB', fontSize: 14, fontWeight: 'bold' },
  historyScore: { color: '#34D399', fontSize: 18, fontWeight: 'bold' },
  historyCount: { color: '#9CA3AF', fontSize: 14 },
  deleteButton: { padding: 8 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  topControlContainer: { position: 'absolute', top: 50, alignSelf: 'center', alignItems: 'center', gap: 12, zIndex: 10 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(31, 41, 55, 0.9)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 8 },
  modeText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  helpButton: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 20 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, gap: 6 },
  timerText: { color: '#9CA3AF', fontWeight: 'bold', fontSize: 14 },
  statsOverlay: { position: 'absolute', top: 150, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(31, 41, 55, 0.85)', borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statContent: { alignItems: 'center' },
  statLabel: { color: '#9CA3AF', fontSize: 11, marginBottom: 4 },
  statValue: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  divider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.2)' },
  feedbackCard: { position: 'absolute', bottom: 150, alignSelf: 'center', width: '70%', backgroundColor: 'rgba(17, 24, 39, 0.95)', borderRadius: 20, padding: 20, borderWidth: 3, alignItems: 'center' },
  feedbackHeader: { alignItems: 'center', gap: 5 },
  feedbackTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  bottomControlContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, zIndex: 20 },
  controlButton: { backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: 14, borderRadius: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  controlButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#1F2937', borderRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginTop: 10 },
  helpSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FCD34D', marginBottom: 8 },
  helpText: { color: '#D1D5DB', fontSize: 14, marginBottom: 4, lineHeight: 20 },
  helpSubText: { color: '#9CA3AF', fontSize: 13, marginBottom: 2, paddingLeft: 10 },
  closeReportButton: { backgroundColor: '#3B82F6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  closeReportText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  reportContainer: { flex: 1, backgroundColor: '#111827', padding: 24 },
  reportHeader: { marginTop: 40, marginBottom: 30 },
  reportTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  reportDate: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  scoreCard: { backgroundColor: '#34D399', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 },
  scoreLabel: { color: '#064E3B', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  scoreValue: { color: '#064E3B', fontSize: 48, fontWeight: 'bold' },
  countBadge: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  sectionContainer: { backgroundColor: '#1F2937', borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 16 },
  listItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  listText: { color: '#D1D5DB', fontSize: 15, flex: 1, lineHeight: 22 },
  emptyText: { color: '#6B7280', fontStyle: 'italic' },
  trainingText: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },
  referenceImage: { width: '100%', height: 250, resizeMode: 'contain', marginTop: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  imageCaption: { color: '#aaaaaa', fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  modalScrollViewContent: { paddingBottom: 20 },
  footworkOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  arrowRow: { flexDirection: 'row', justifyContent: 'space-between', width: '80%', marginVertical: 40 },
  centerIndicator: { alignItems: 'center', justifyContent: 'center', height: 100 },
  commandText: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 10, textShadowColor: 'black', textShadowRadius: 10 },
  countdownOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  countdownText: { color: '#FCD34D', fontSize: 100, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  countdownSubText: { color: 'white', fontSize: 24, marginTop: 20, fontWeight: 'bold' },
});