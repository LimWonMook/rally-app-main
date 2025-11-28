import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Platform,
  Dimensions,
  PixelRatio
} from 'react-native';
import {
  Trophy,
  Flame,
  Clock,
  Instagram,
  MessageCircle,
  Send,
  Facebook,
  Activity
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';

import { calculateRMR, GameResult, printRMRLog } from '../utils/rmrCalculator';
import { PointLog } from './ScoreTracker';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Responsive Utils ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const normalize = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

interface GameSummaryProps {
  onNext: () => void;
  result: {
    duration: number;
    team1Wins: number;
    team2Wins: number;
    isForced: boolean;
    pointLogs: PointLog[];
    team1Name: string;
    team2Name: string;
  };
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

// --- Animated Ring ---
const AnimatedActivityRing = ({ startRMR, endRMR }: { startRMR: number, endRMR: number }) => {
  const radiusOuter = normalize(60); // 반응형 반지름
  const strokeWidth = normalize(12);
  const circumferenceOuter = 2 * Math.PI * radiusOuter;

  const containerSize = (radiusOuter * 2) + (strokeWidth * 2) + 20;
  const center = containerSize / 2;

  const MAX_RMR = 3000;

  const animValue = useRef(new Animated.Value(0)).current;
  const [displayRMR, setDisplayRMR] = useState(startRMR);

  const rmrDiff = endRMR - startRMR;
  const isPositive = rmrDiff >= 0;
  const color = isPositive ? "#34D399" : "#EF4444";
  const bgStroke = isPositive ? "rgba(52, 211, 153, 0.2)" : "rgba(239, 68, 68, 0.2)";

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value }) => {
      const currentScore = startRMR + (rmrDiff * value);
      setDisplayRMR(Math.round(currentScore));
    });

    return () => {
      animValue.removeListener(listener);
    };
  }, [startRMR, endRMR]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [
      circumferenceOuter * (1 - (startRMR / MAX_RMR)),
      circumferenceOuter * (1 - (endRMR / MAX_RMR))
    ],
  });

  return (
    <View style={[styles.ringContainer, { width: containerSize, height: containerSize }]}>
      <Svg width={containerSize} height={containerSize} viewBox={`0 0 ${containerSize} ${containerSize}`}>
        <G transform={`rotate(-90, ${center}, ${center})`}>
          <Circle cx={center} cy={center} r={radiusOuter} fill="none" stroke={bgStroke} strokeWidth={strokeWidth} />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radiusOuter}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumferenceOuter} ${circumferenceOuter}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <View style={styles.ringTextContainer}>
           <Text style={styles.ringLabelText}>RMR Point</Text>
           <Text style={styles.ringScoreText}>{displayRMR}</Text>
           <View style={[styles.diffBadge, { backgroundColor: isPositive ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <Text style={[styles.diffText, { color: color }]}>
                {isPositive ? `▲ ${Math.abs(rmrDiff)}` : `▼ ${Math.abs(rmrDiff)}`}
              </Text>
           </View>
      </View>
    </View>
  );
};

export function GameSummary({ onNext, result }: GameSummaryProps) {
  const today = new Date();
  const formattedDate = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#000000');
        StatusBar.setTranslucent(false);
      }
      StatusBar.setBarStyle('light-content');
    };
  }, []);

  const analysisResult = useMemo(() => {
    const mockGameData: GameResult = {
        playerA: { rmr: 1000, rd: 300, name: result.team1Name },
        playerB: { rmr: 1000, rd: 300, name: result.team2Name },
        team1Wins: result.team1Wins,
        team2Wins: result.team2Wins,
        pointLogs: result.pointLogs,
        isAbnormal: result.isForced
    };
    return calculateRMR(mockGameData);
  }, [result]);

  useEffect(() => {
    printRMRLog({
        playerA: { rmr: 1000, rd: 300, name: result.team1Name },
        playerB: { rmr: 1000, rd: 300, name: result.team2Name },
        team1Wins: result.team1Wins,
        team2Wins: result.team2Wins,
        pointLogs: result.pointLogs,
        isAbnormal: result.isForced
    }, analysisResult);
  }, [analysisResult]);

  const { newRMR_B, analysis } = analysisResult;
  const oldRMR = 1000;

  const myScore = result.team2Wins;
  const oppScore = result.team1Wins;
  const isUserWinner = myScore > oppScore;
  const isDraw = myScore === oppScore;

  const scoreText = `${myScore} : ${oppScore}`;

  let resultText = "패배";
  if (isUserWinner) resultText = "승리!";
  else if (isDraw) resultText = "무승부";
  if (result.isForced) resultText = "중단됨";

  const caloriesBurned = (result.duration * 0.13).toFixed(0);

  const generateComment = () => {
      const { flowDetails } = analysis;
      if (result.isForced) return "경기가 중단되어 분석이 제한적이에요.";

      const metrics = [
          { key: 'endurance', val: flowDetails.endurance, label: "지구력", msg: "지치지 않는 강철 체력을 보여줬어요! 💪" },
          { key: 'clutch', val: flowDetails.clutch, label: "위기관리", msg: "위기 상황에서 빛나는 승부사 기질! 🔥" },
          { key: 'tempo', val: flowDetails.tempo, label: "속도", msg: "빠른 템포로 상대를 압도했어요! ⚡️" },
          { key: 'focus', val: flowDetails.focus, label: "집중력", msg: "경기 후반 엄청난 집중력을 발휘했어요! 🧠" },
          { key: 'com', val: flowDetails.com, label: "역전능력", msg: "불리한 상황을 뒤집는 저력! 대역전승! 🏆" }
      ];

      metrics.sort((a, b) => b.val - a.val);
      const bestMetric = metrics[0];
      const worstMetric = metrics[metrics.length - 1];

      if (isUserWinner) {
          if (bestMetric.val > 0.6) return bestMetric.msg;
          return "안정적인 경기 운용으로 승리했어요! 🎉";
      } else {
          if (bestMetric.val > 0.4) {
              return `아쉽게 졌지만, ${bestMetric.label}만큼은 훌륭했어요! 👍`;
          } else {
              return `수고하셨어요! 다음엔 ${worstMetric.label}을 보완해보는 건 어떨까요?`;
          }
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#22D3EE" translucent={false} />
      <LinearGradient colors={['#22D3EE', '#34D399']} style={styles.gradientContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

            <View style={styles.topSection}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>오늘도 랠리하셨군요!</Text>
                <Text style={styles.headerSubtitle}>{formattedDate} • {result.team2Name} (나) vs {result.team1Name}</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.reportHeader}>
                    <View style={styles.aiBadge}>
                        <Activity size={14} color="#34D399" />
                        <Text style={styles.aiBadgeText}>AI Analysis</Text>
                    </View>
                    <Text style={styles.reportTitle}>한 줄 리포트</Text>
                    <Text style={styles.reportBody}>{generateComment()}</Text>
                </View>

                <View style={styles.ringSection}>
                    <AnimatedActivityRing
                      startRMR={oldRMR}
                      endRMR={newRMR_B}
                    />
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Trophy size={20} color={isUserWinner ? "#38BDF8" : "#9CA3AF"} />
                      <Text style={styles.statText}>{resultText} ({scoreText})</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Flame size={20} color="#F97316" />
                      <Text style={styles.statText}>{caloriesBurned} Kcal</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Clock size={20} color="#34D399" />
                      <Text style={styles.statText}>{formatTime(result.duration)}</Text>
                    </View>
                </View>
              </View>

              <View style={styles.socialRow}>
                  <TouchableOpacity style={styles.socialButton}>
                      <View style={styles.socialIconBg}><Instagram size={24} color="white" /></View>
                      <Text style={styles.socialLabel}>Instagram</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                      <View style={styles.socialIconBg}><MessageCircle size={24} color="white" /></View>
                      <Text style={styles.socialLabel}>Kakaotalk</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                      <View style={styles.socialIconBg}><Send size={24} color="white" /></View>
                      <Text style={styles.socialLabel}>Messenger</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                      <View style={styles.socialIconBg}><Facebook size={24} color="white" /></View>
                      <Text style={styles.socialLabel}>Facebook</Text>
                  </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomSection}>
                <TouchableOpacity style={styles.nextButton} onPress={onNext}>
                <Text style={styles.nextButtonText}>확인</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#22D3EE' },
  gradientContainer: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
    paddingTop: 40,
    justifyContent: 'space-between'
  },

  topSection: {
    width: '100%',
    alignItems: 'center'
  },

  header: { alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: normalize(28), fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSubtitle: { fontSize: normalize(16), color: 'rgba(255, 255, 255, 0.9)' },

  card: {
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 480
  },

  reportHeader: { alignItems: 'center', marginBottom: 24, width: '100%' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  aiBadgeText: { color: '#34D399', fontSize: normalize(12), fontWeight: 'bold', marginLeft: 4 },
  reportTitle: { fontSize: normalize(18), fontWeight: 'bold', color: 'white', marginBottom: 8 },
  reportBody: { fontSize: normalize(16), color: '#E5E7EB', lineHeight: 24, textAlign: 'center' },

  ringSection: { marginBottom: 32 },
  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  ringTextContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center'
  },
  ringLabelText: { fontSize: normalize(12), color: '#9CA3AF', marginBottom: 4 },
  ringScoreText: { fontSize: normalize(36), fontWeight: '900', color: 'white' },

  diffBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: normalize(14), fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, width: '100%' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 },
  statText: { color: 'white', fontSize: normalize(14), fontWeight: '600' },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10, marginBottom: 20 },
  socialButton: { alignItems: 'center', gap: 8 },
  socialIconBg: { width: 50, height: 50, backgroundColor: 'rgba(31, 41, 55, 0.6)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  socialLabel: { color: 'white', fontSize: normalize(12), opacity: 0.9 },

  bottomSection: { width: '100%', alignItems: 'center' },
  nextButton: {
    backgroundColor: '#1F2937', paddingVertical: 18, borderRadius: 16, alignItems: 'center',
    width: '100%', maxWidth: 480
  },
  nextButtonText: { color: 'white', fontSize: normalize(18), fontWeight: 'bold' },
});