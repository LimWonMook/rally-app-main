// utils/rmrCalculator.ts

export interface PointLog {
  scorer: 'A' | 'B';
  scoreA: number;
  scoreB: number;
  setIndex: number;
  timestamp: number;
  duration: number;
}

export interface GameResult {
  playerA: { rmr: number; rd: number; name: string }; // Team 1 (상대)
  playerB: { rmr: number; rd: number; name: string }; // Team 2 (나)
  team1Wins: number;
  team2Wins: number;
  pointLogs: PointLog[];
  isAbnormal: boolean;
}

export interface RMRAnalysis {
  newRMR_A: number;
  newRMR_B: number;
  newRD_A: number;
  newRD_B: number;
  analysis: {
    m_total: number;
    m_flow: number;
    flowDetails: {
      clutch: number;
      com: number;
      cons: number;
      endurance: number;
      focus: number;
      tempo: number;
    };
  };
}

const RMR_CONSTANTS = {
  VOLATILITY_BASE: 12,
  VOLATILITY_MULTIPLIER: 0.08,
  FLOW_WEIGHTS: {
    CLUTCH: 0.25,
    COM: 0.20,
    CONS: 0.20,
    ENDURANCE: 0.15,
    FOCUS: 0.10,
    TEMPO: 0.05,
    MAX_RUN: 0.05,
  },
};

const tanh = (x: number) => (Math.exp(2 * x) - 1) / (Math.exp(2 * x) + 1);
const calculateExpectedScore = (rmrA: number, rmrB: number): number => 1 / (1 + Math.pow(10, (rmrB - rmrA) / 400));
const calculateVolatility = (rd: number): number => RMR_CONSTANTS.VOLATILITY_MULTIPLIER * rd + RMR_CONSTANTS.VOLATILITY_BASE;
const calculateNewRD = (currentRD: number): number => Math.max(currentRD - (currentRD * 0.05), 30);

// --- [상세] 로그 출력 함수 ---
export const printRMRLog = (data: GameResult, result: RMRAnalysis) => {
  const { playerA, playerB, team1Wins, team2Wins, pointLogs, isAbnormal } = data;
  const { newRMR_A, newRMR_B, analysis } = result;
  const { m_flow, flowDetails } = analysis;

  const totalScoreA = pointLogs.filter(l => l.scorer === 'A').length;
  const totalScoreB = pointLogs.filter(l => l.scorer === 'B').length;
  const winner = team1Wins > team2Wins ? 'A' : 'B';
  const winnerName = winner === 'A' ? playerA.name : playerB.name;

  // 상세 분석을 위한 카운트 계산
  const longRallies = pointLogs.filter(l => l.duration >= 30);
  const longRallyWins = longRallies.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;

  const clutchPoints = pointLogs.filter(l => l.scoreA >= 20 && l.scoreB >= 20);
  const clutchWins = clutchPoints.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;

  const shortRallies = pointLogs.filter(l => l.duration < 30);
  const shortRallyWins = shortRallies.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;

  // 세트별 승률 계산 (Focus)
  const set1Logs = pointLogs.filter(l => l.setIndex === 1);
  const lastSetLogs = pointLogs.filter(l => l.setIndex === Math.max(...pointLogs.map(p=>p.setIndex)));
  const getWinRate = (logs: PointLog[]) => logs.length ? (logs.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length / logs.length) * 100 : 0;
  const set1Rate = getWinRate(set1Logs);
  const lastSetRate = getWinRate(lastSetLogs);

  const E_A = calculateExpectedScore(playerA.rmr, playerB.rmr);
  const vol_A = calculateVolatility(playerA.rd);
  const vol_B = calculateVolatility(playerB.rd);

  console.log('\n========== 📊 RMR DETAILED ANALYSIS REPORT ==========');
  console.log(`📅 Match: ${playerA.name} (Team1) vs ${playerB.name} (Team2)`);
  console.log(`🏆 Winner: ${winner === 'A' ? 'Team 1 (Opponent)' : 'Team 2 (Me)'}`);
  console.log(`🔢 Score: ${team1Wins} : ${team2Wins} (Total Points: ${totalScoreA} : ${totalScoreB})`);
  console.log('---------------------------------------------');
  console.log(`[1] M_set (세트 스코어 보정)`);
  console.log(`    👉 ${analysis.m_set.toFixed(2)} (${team1Wins}:${team2Wins} 경기 결과 반영)`);

  console.log(`[2] M_pd (점수차 보정)`);
  console.log(`    👉 ${analysis.m_pd.toFixed(2)} (점수차 ${Math.abs(totalScoreA - totalScoreB)}점)`);

  console.log(`[3] M_flow (경기 흐름 보정) -> ${m_flow.toFixed(2)}`);
  console.log(`    💪 Endurance (지구력): ${flowDetails.endurance.toFixed(2)}`);
  console.log(`       └─ 30초 이상 랠리 ${longRallies.length}회 중 ${longRallyWins}회 승리 (${longRallies.length > 0 ? ((longRallyWins/longRallies.length)*100).toFixed(0) : 0}%)`);

  console.log(`    🔥 Clutch (위기관리): ${flowDetails.clutch.toFixed(2)}`);
  console.log(`       └─ 듀스 상황 ${clutchPoints.length}회 중 ${clutchWins}회 승리`);

  console.log(`    ⚡ Tempo (속도전): ${flowDetails.tempo.toFixed(2)}`);
  console.log(`       └─ 30초 미만 랠리 ${shortRallies.length}회 중 ${shortRallyWins}회 승리`);

  console.log(`    🧠 Focus (집중력): ${flowDetails.focus.toFixed(2)}`);
  console.log(`       └─ 1세트 승률(${set1Rate.toFixed(0)}%) 대비 마지막 세트 승률(${lastSetRate.toFixed(0)}%) 변화`);

  console.log(`    🛡 Integrity (무결성): ${isAbnormal ? '0.7 (강제종료 페널티)' : '1.0 (정상 종료)'}`);

  console.log('---------------------------------------------');
  console.log(`📈 M_total (최종 가중치): ${analysis.m_total.toFixed(3)}`);
  console.log(`🎲 Volatility (변동성 계수): A=${vol_A.toFixed(1)}, B=${vol_B.toFixed(1)}`);
  console.log(`🎯 Expected Win Rate (A승률): ${(E_A * 100).toFixed(1)}%`);
  console.log('---------------------------------------------');
  console.log(`✨ Final RMR Change:`);
  console.log(`   Team 1 (상대): ${playerA.rmr} -> ${newRMR_A} (${newRMR_A - playerA.rmr > 0 ? '+' : ''}${newRMR_A - playerA.rmr})`);
  console.log(`   Team 2 (나):   ${playerB.rmr} -> ${newRMR_B} (${newRMR_B - playerB.rmr > 0 ? '+' : ''}${newRMR_B - playerB.rmr})`);
  console.log('=============================================\n');
};

// --- 메인 계산 함수 ---
export const calculateRMR = (data: GameResult): RMRAnalysis => {
  const { playerA, playerB, team1Wins, team2Wins, pointLogs, isAbnormal } = data;

  // 1. M_set
  let m_set = 1.0;
  if ((team1Wins === 2 && team2Wins === 0) || (team1Wins === 0 && team2Wins === 2)) m_set = 1.25;

  // 2. M_pd
  const totalScoreA = pointLogs.filter(l => l.scorer === 'A').length;
  const totalScoreB = pointLogs.filter(l => l.scorer === 'B').length;
  const scoreDiff = Math.abs(totalScoreA - totalScoreB);
  const m_pd = 1 + 0.5 * tanh((scoreDiff - 5) / 10);

  // 승자 판별
  const winner = team1Wins > team2Wins ? 'A' : 'B';

  // 3. M_flow
  const longRallies = pointLogs.filter(l => l.duration >= 30);
  let enduranceVal = 0.5;
  if (longRallies.length > 0) {
      const wins = longRallies.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;
      enduranceVal = wins / longRallies.length;
  }

  const clutchLogs = pointLogs.filter(l => l.scoreA >= 20 && l.scoreB >= 20);
  let clutchVal = 0.5;
  if (clutchLogs.length > 0) {
    const wins = clutchLogs.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;
    clutchVal = wins / clutchLogs.length;
  }

  const shortRallies = pointLogs.filter(l => l.duration < 30);
  let tempoVal = 0.5;
  if (shortRallies.length > 0) {
      const wins = shortRallies.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length;
      tempoVal = wins / shortRallies.length;
  }

  const set1Logs = pointLogs.filter(l => l.setIndex === 1);
  const lastSetLogs = pointLogs.filter(l => l.setIndex === Math.max(...pointLogs.map(p=>p.setIndex)));

  const getWinRate = (logs: PointLog[]) => logs.length ? logs.filter(l => (winner === 'A' ? l.scorer === 'A' : l.scorer === 'B')).length / logs.length : 0;
  const focusVal = Math.max(0, getWinRate(lastSetLogs) - getWinRate(set1Logs) + 0.5);

  const comVal = 0.5;
  const consVal = 0.5;

  const { CLUTCH, COM, CONS, ENDURANCE, FOCUS, TEMPO } = RMR_CONSTANTS.FLOW_WEIGHTS;
  const flowScore =
      (clutchVal * CLUTCH) + (comVal * COM) + (consVal * CONS) +
      (enduranceVal * ENDURANCE) + (focusVal * FOCUS) + (tempoVal * TEMPO);

  const m_flow = 1.0 + flowScore;
  const integrity = isAbnormal ? 0.7 : 1.0;

  // 4. M_total
  const m_total = ((0.3 * m_set) + (0.2 * m_pd) + (0.5 * m_flow)) * integrity;

  // 5. RMR Update
  const E_A = calculateExpectedScore(playerA.rmr, playerB.rmr);
  const vol_A = calculateVolatility(playerA.rd);
  const vol_B = calculateVolatility(playerB.rd);

  const m_winner = m_total;
  const m_loser = 2.0 - m_winner;

  let rmrChangeA, rmrChangeB;

  if (winner === 'A') {
      rmrChangeA = (vol_A * m_winner) * (1 - E_A);
      rmrChangeB = (vol_B * m_loser) * (0 - (1 - E_A));
  } else {
      rmrChangeA = (vol_A * m_loser) * (0 - E_A);
      rmrChangeB = (vol_B * m_winner) * (1 - (1 - E_A));
  }

  return {
    newRMR_A: Math.round(playerA.rmr + rmrChangeA),
    newRMR_B: Math.round(playerB.rmr + rmrChangeB),
    newRD_A: Math.round(calculateNewRD(playerA.rd)),
    newRD_B: Math.round(calculateNewRD(playerB.rd)),
    analysis: {
      m_total, m_set, m_pd, m_flow,
      flowDetails: { clutch: clutchVal, com: comVal, cons: consVal, endurance: enduranceVal, focus: focusVal, tempo: tempoVal }
    }
  };
};