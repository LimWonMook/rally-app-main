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
  Activity,
  PieChart
} from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, G, Polygon, Line, Text as SvgText } from 'react-native-svg';

import { calculateRMR, GameResult } from '../utils/rmrCalculator';
import { PointLog } from './ScoreTracker';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Responsive Utils ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const normalize = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios'
    ? Math.round(PixelRatio.roundToNearestPixel(newSize))
    : Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
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

// --- Hexagon Chart ---
const HexagonChart = ({ data }: { data: any }) => {
  const chartViewSize = normalize(200);
  const chartSize = normalize(140);
  const center = chartViewSize / 2;
  const radius = chartSize / 2;

  const labels = ["위기관리", "속도전", "지구력", "집중력", "안정성", "역전능력"];
  const keys = ['clutch', 'tempo', 'endurance', 'focus', 'cons', 'com'];

  const getPoint = (value: number, index: number, r: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const x = center + Math.cos(angle) * r * value;
    const y = center + Math.sin(angle) * r * value;
    return `${x},${y}`;
  };

  const bgPoints = [1, 0.66, 0.33].map(scale =>
    labels.map((_, i) => getPoint(1 * scale, i, radius)).join(' ')
  );

  const dataPoints = keys.map((key, i) => {
    const rawVal = data[key] || 0.5;
    const val = Math.max(0.2, Math.min(1.0, rawVal));
    return getPoint(val, i, radius);
  }).join(' ');

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: chartViewSize }}>
      <Svg width={chartViewSize} height={chartViewSize}>
        {bgPoints.map((points, i) => (
          <Polygon key={i} points={points} stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="transparent" />
        ))}
        {labels.map((_, i) => {
          const [x, y] = getPoint(1, i, radius).split(',');
          return <Line key={`line-${i}`} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
        })}
        <Polygon points={dataPoints} fill="rgba(52, 211, 153, 0.4)" stroke="#34D399" strokeWidth="2" />
        {labels.map((label, i) => {
          const [x, y] = getPoint(1.2, i, radius).split(',').map(Number);
          return (
            <SvgText
              key={`label-${i}`}
              x={x}
              y={y}
              fill="#9CA3AF"
              fontSize={normalize(10)}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

// --- Animated Ring ---
const AnimatedActivityRing = ({ startRMR, endRMR }: { startRMR: number, endRMR: number }) => {
  const radiusOuter = normalize(60);
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
      toValue: 1, duration: 2000, easing: Easing.out(Easing.exp), useNativeDriver: false,
    }).start();

    const listener = animValue.addListener(({ value }) => {
      setDisplayRMR(Math.round(startRMR + (rmrDiff * value)));
    });
    return () => animValue.removeListener(listener);
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
          <AnimatedCircle cx={center} cy={center} r={radiusOuter} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={`${circumferenceOuter} ${circumferenceOuter}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </G>
      </Svg>
      <View style={styles.ringTextContainer}>
        <Text style={styles.ringLabelText}>RMR Point</Text>
        <Text style={styles.ringScoreText}>{displayRMR}</Text>
        <View style={[styles.diffBadge, { backgroundColor: bgStroke }]}>
          <Text style={[styles.diffText, { color }]}>{isPositive ? `▲ ${Math.abs(rmrDiff)}` : `▼ ${Math.abs(rmrDiff)}`}</Text>
        </View>
      </View>
    </View>
  );
};

export function GameSummary({ onNext, result }: GameSummaryProps) {
  const [activeTab, setActiveTab] = useState<'rmr' | 'chart'>('rmr');
  const today = new Date();
  const formattedDate = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

  const analysisResult = useMemo(() => {
    const mockGameData: GameResult = {
      playerA: { rmr: 1000, rd: 300, name: result.team1Name },
      playerB: { rmr: 1000, rd: 300, name: result.team2Name },
      team1Wins: result.team1Wins, team2Wins: result.team2Wins, pointLogs: result.pointLogs, isAbnormal: result.isForced
    };
    return calculateRMR(mockGameData);
  }, [result]);

  const { newRMR_B, analysis } = analysisResult;
  const oldRMR = 1000;
  const isUserWinner = result.team2Wins > result.team1Wins;
  const isDraw = result.team2Wins === result.team1Wins;
  const caloriesBurned = (result.duration * 0.13).toFixed(0);

  let resultText = "패배";
  if (isUserWinner) resultText = "승리!";
  else if (isDraw) resultText = "무승부";
  if (result.isForced) resultText = "중단됨";

  const scoreText = `${result.team2Wins} : ${result.team1Wins}`;

  const myStats = useMemo(() => {
    const winnerStats = analysis.flowDetails;
    if (isUserWinner) return winnerStats;

    return {
      clutch: 1.0 - winnerStats.clutch,
      tempo: 1.0 - winnerStats.tempo,
      endurance: 1.0 - winnerStats.endurance,
      focus: 1.0 - winnerStats.focus,
      cons: 1.0 - winnerStats.cons,
      com: 1.0 - winnerStats.com,
    };
  }, [analysis, isUserWinner]);

  const generateComment = () => {
      const { flowDetails } = analysis;
      if (result.isForced) return "경기가 중단되어 분석이 제한적이에요.";

      const metrics = [
          { key: 'endurance', val: myStats.endurance, label: "지구력", winMsg: "지치지 않는 강철 체력을 보여줬어요! 💪", loseMsg: "지구력 싸움에서 조금 밀렸네요. 끈기가 필요해요!" },
          { key: 'clutch', val: myStats.clutch, label: "위기관리", winMsg: "위기 상황에서 빛나는 승부사 기질! 🔥", loseMsg: "듀스 상황에서의 집중력이 아쉬웠어요." },
          { key: 'tempo', val: myStats.tempo, label: "속도", winMsg: "빠른 템포로 상대를 압도했어요! ⚡️", loseMsg: "상대의 빠른 템포에 말리지 않도록 주의하세요." },
          { key: 'focus', val: myStats.focus, label: "집중력", winMsg: "경기 후반 엄청난 집중력을 발휘했어요! 🧠", loseMsg: "후반 집중력이 조금 떨어졌어요. 끝까지 파이팅!" },
          { key: 'com', val: myStats.com, label: "역전능력", winMsg: "불리한 상황을 뒤집는 저력! 대역전승! 🏆", loseMsg: "초반 실점을 만회하지 못해 아쉬워요." }
      ];

      metrics.sort((a, b) => b.val - a.val);
      const bestMetric = metrics[0];
      const worstMetric = metrics[metrics.length - 1];

      if (isUserWinner) {
          if (bestMetric.val > 0.6) return bestMetric.winMsg;
          return "안정적인 경기 운용으로 승리했어요! 🎉";
      } else {
          if (bestMetric.val > 0.5) {
              return `아쉽게 졌지만, ${bestMetric.label}만큼은 훌륭했어요! 👍`;
          } else {
              // [수정] "다음엔 이길 수 있어요!" 문구 삭제
              return `${worstMetric.loseMsg}`;
          }
      }
  };

  const getPlayStyleTitle = () => {
    const details = myStats;
    const maxKey = Object.keys(details).reduce((a, b) => details[a as keyof typeof details] > details[b as keyof typeof details] ? a : b);

    const winTitles: any = {
        clutch: "강심장 승부사 🔥",
        tempo: "전광석화 스피드스타 ⚡️",
        endurance: "지칠 줄 모르는 에너자이저 💪",
        focus: "후반 집중형 승부사 🧠",
        cons: "흔들리지 않는 편안함 🛡",
        com: "기적의 역전승 메이커 🌟"
    };

    const loseTitles: any = {
        clutch: "위기 속에서 빛난 침착함 🛡",
        tempo: "상대를 긴장시킨 스피드 ⚡️",
        endurance: "쉽게 지치지 않는 끈기 💪",
        focus: "끝까지 포기하지 않는 집중력 🧠",
        cons: "안정적인 경기 운영 능력 ⚖️",
        com: "매서운 추격 본능 🔥"
    };

    const titles = isUserWinner ? winTitles : loseTitles;
    return titles[maxKey] || "가능성이 보이는 챌린저 🌱";
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

              <View style={styles.pillTabContainer}>
                <TouchableOpacity
                  onPress={() => setActiveTab('rmr')}
                  style={[styles.pillTab, activeTab === 'rmr' && styles.activePillTab]}
                >
                  <Activity size={12} color={activeTab === 'rmr' ? '#34D399' : '#9CA3AF'} />
                  <Text style={[styles.pillTabText, activeTab === 'rmr' && styles.activePillTabText]}>RMR Analysis</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('chart')}
                  style={[styles.pillTab, activeTab === 'chart' && styles.activePillTab]}
                >
                  <PieChart size={12} color={activeTab === 'chart' ? '#34D399' : '#9CA3AF'} />
                  <Text style={[styles.pillTabText, activeTab === 'chart' && styles.activePillTabText]}>Chart Analysis</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contentArea}>
                {activeTab === 'rmr' ? (
                  <>
                    <View style={styles.textReportContainer}>
                      <Text style={styles.reportTitle}>한 줄 리포트</Text>
                      <Text style={styles.reportBody}>{generateComment()}</Text>
                    </View>

                    <View style={styles.visualSectionRMR}>
                      <AnimatedActivityRing startRMR={oldRMR} endRMR={newRMR_B} />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.textReportContainer}>
                      <Text style={styles.reportTitle}>{getPlayStyleTitle()}</Text>
                    </View>

                    <View style={styles.visualSectionChart}>
                      <HexagonChart data={myStats} />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Trophy size={20} color={isUserWinner ? "#38BDF8" : "#9CA3AF"} />
                  <Text style={styles.statText}>{resultText} ({scoreText})</Text>
                </View>
                <View style={styles.statItem}><Flame size={20} color="#F97316" /><Text style={styles.statText}>{caloriesBurned} Kcal</Text></View>
                <View style={styles.statItem}><Clock size={20} color="#34D399" /><Text style={styles.statText}>{formatTime(result.duration)}</Text></View>
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
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 40, paddingTop: 40, justifyContent: 'space-between' },

  topSection: { width: '100%', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: normalize(28), fontWeight: 'bold', color: 'white', marginBottom: 8 },
  headerSubtitle: { fontSize: normalize(16), color: 'rgba(255, 255, 255, 0.9)' },

  card: { backgroundColor: '#1F2937', borderRadius: 24, padding: 32, marginBottom: 24, alignItems: 'center', width: '100%', maxWidth: 480 },

  pillTabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, padding: 4, marginBottom: 12, alignSelf: 'center' },
  pillTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, gap: 4 },

  activePillTab: { backgroundColor: 'rgba(52, 211, 153, 0.15)' },

  pillTabText: { color: '#9CA3AF', fontSize: normalize(12), fontWeight: '600' },

  activePillTabText: { color: '#34D399', fontWeight: 'bold' },

  contentArea: { width: '100%', alignItems: 'center', height: normalize(270), justifyContent: 'flex-start' },
  textReportContainer: { alignItems: 'center', marginBottom: 8, height: 40, justifyContent: 'center' },
  reportTitle: { fontSize: normalize(18), fontWeight: 'bold', color: 'white', marginBottom: 4, textAlign: 'center' },
  reportBody: { fontSize: normalize(16), color: '#E5E7EB', lineHeight: 22, textAlign: 'center' },

  visualSectionRMR: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  visualSectionChart: { justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: -10, marginBottom: 10 },

  ringContainer: { alignItems: 'center', justifyContent: 'center' },
  ringTextContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringLabelText: { fontSize: normalize(12), color: '#9CA3AF', marginBottom: 4 },
  ringScoreText: { fontSize: normalize(36), fontWeight: '900', color: 'white' },
  diffBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: normalize(14), fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, width: '100%', marginTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  statText: { color: 'white', fontSize: normalize(14), fontWeight: '600' },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 0, marginBottom: 20 },
  socialButton: { alignItems: 'center', gap: 8 },
  socialIconBg: { width: 50, height: 50, backgroundColor: 'rgba(31, 41, 55, 0.6)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  socialLabel: { color: 'white', fontSize: normalize(12), opacity: 0.9 },

  bottomSection: { width: '100%', alignItems: 'center' },
  nextButton: { backgroundColor: '#1F2937', paddingVertical: 18, borderRadius: 16, alignItems: 'center', width: '100%', maxWidth: 480 },
  nextButtonText: { color: 'white', fontSize: normalize(18), fontWeight: 'bold' },
});