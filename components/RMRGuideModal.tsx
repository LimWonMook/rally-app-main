import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { X, Trophy, Zap, Timer, Lightbulb, Target, TrendingUp, ShieldAlert } from 'lucide-react-native';

const RMR_GUIDE_ITEMS = [
  { icon: <Trophy size={24} color="#FBBF24" />, title: "승패 그 이상의 분석", desc: "단순히 이기고 지는 것뿐만 아니라, '어떻게' 경기했는지를 분석합니다." },
  { icon: <Zap size={24} color="#34D399" />, title: "지구력 (Endurance)", desc: "30초 이상 이어지는 긴 랠리 싸움에서 이겨보세요." },
  { icon: <Timer size={24} color="#F472B6" />, title: "속도전 (Tempo)", desc: "30초 미만의 짧고 빠른 랠리 승부는 '속도' 능력치를 올려줍니다." },
  { icon: <Lightbulb size={24} color="#60A5FA" />, title: "위기관리 (Clutch)", desc: "20:20 듀스 상황에서의 득점은 일반 득점보다 가치가 높습니다." },
  { icon: <Target size={24} color="#F97316" />, title: "후반 집중력 (Focus)", desc: "체력이 떨어지는 경기 후반의 성과를 분석합니다." },
  { icon: <TrendingUp size={24} color="#A78BFA" />, title: "역전의 명수 (Comeback)", desc: "불리한 상황을 뒤집는 역전승은 RMR 상승폭이 매우 큽니다." },
  { icon: <ShieldAlert size={24} color="#EF4444" />, title: "매너가 곧 실력", desc: "경기를 강제로 종료하면 큰 페널티를 받습니다." }
];

interface RMRGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function RMRGuideModal({ visible, onClose }: RMRGuideModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.guideModalContent} onPress={() => {}}>
          <View style={styles.guideHeader}>
            <Text style={styles.guideModalTitle}>RMR 시스템 핵심 가이드</Text>
            <TouchableOpacity onPress={onClose} style={styles.guideCloseButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: 20}}>
            {RMR_GUIDE_ITEMS.map((item, index) => (
              <View key={index} style={styles.guideItem}>
                <View style={styles.guideIconContainer}>{item.icon}</View>
                <View style={styles.guideTextContainer}>
                  <Text style={styles.guideItemTitle}>{item.title}</Text>
                  <Text style={styles.guideItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.guideConfirmButton} onPress={onClose}>
            <Text style={styles.guideConfirmText}>확인했습니다</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  guideModalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 24, paddingBottom: 24, alignItems: 'center', maxHeight: '80%' },
  guideHeader: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  guideModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  guideCloseButton: { padding: 4 },
  guideItem: { flexDirection: 'row', marginBottom: 24, width: '100%', gap: 16 },
  guideIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  guideTextContainer: { flex: 1, justifyContent: 'center' },
  guideItemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  guideItemDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  guideConfirmButton: { width: '100%', backgroundColor: '#111827', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  guideConfirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});