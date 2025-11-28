import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback, 
  ImageSourcePropType,
  Alert 
} from 'react-native';

// 데이터 타입 정의
interface UserProfile {
  id: string;
  name: string;
  location: string;
  tier: string;
  win: number;
  loss: number;
  mannerScore: number;
  avatar: ImageSourcePropType | { uri: string };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
}

const OpponentProfileModal: React.FC<Props> = ({ visible, onClose, userProfile }) => {
  if (!userProfile) return null;

  // 신고 버튼 핸들러
  const handleReport = () => {
    Alert.alert(
      "신고하기",
      `${userProfile.name}님을 신고하시겠습니까?\n허위 신고 시 제재를 받을 수 있습니다.`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "신고", 
          onPress: () => {
            Alert.alert("신고 완료", "신고가 정상적으로 접수되었습니다.");
            // 여기에 실제 신고 API 호출 로직 추가
          } 
        }
      ]
    );
  };

  // 차단 버튼 핸들러
  const handleBlock = () => {
    Alert.alert(
      "차단하기",
      `${userProfile.name}님을 차단하시겠습니까?\n더 이상 서로의 메시지를 볼 수 없습니다.`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "차단", 
          style: "destructive", // 아이폰에서 빨간색으로 표시됨
          onPress: () => {
            onClose(); // 모달 닫기
            Alert.alert("차단 완료", "해당 사용자를 차단했습니다.");
            // 여기에 실제 차단 API 호출 로직 추가
          } 
        }
      ]
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* 프로필 이미지 & 이름 섹션 */}
              <View style={styles.profileSection}>
                <Image 
                  source={userProfile.avatar} 
                  style={styles.avatar} 
                />
                <Text style={styles.nameText}>{userProfile.name}</Text>
                <Text style={styles.locationText}>{userProfile.location}</Text>
              </View>

              {/* 통계 박스 */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>티어</Text>
                  <Text style={[styles.statValue, { color: '#00E0C6' }]}>{userProfile.tier}</Text>
                </View>
                <View style={styles.divider} />
                
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>승/패</Text>
                  <Text style={styles.statValue}>{userProfile.win}승 {userProfile.loss}패</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>매너 점수</Text>
                  <Text style={styles.statValue}>{userProfile.mannerScore} / 5.0</Text>
                </View>
              </View>

              {/* 추가된 기능: 신고/차단 버튼 영역 */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton} onPress={handleReport}>
                  <Text style={styles.reportText}>🚨 신고하기</Text>
                </TouchableOpacity>
                <View style={styles.actionDivider} />
                <TouchableOpacity style={styles.actionButton} onPress={handleBlock}>
                  <Text style={styles.blockText}>🚫 차단하기</Text>
                </TouchableOpacity>
              </View>

              {/* 닫기 버튼 */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1C1D2B',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    backgroundColor: '#333',
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#25263A',
    borderRadius: 15,
    paddingVertical: 15,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: '#444',
  },
  
  // --- 새로 추가된 스타일 ---
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#25263A', // 통계 박스와 같은 배경색 사용 (통일감)
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionButton: {
    padding: 5,
    flex: 1, // 공간을 반반 차지하도록
    alignItems: 'center',
  },
  actionDivider: {
    width: 1,
    height: 15,
    backgroundColor: '#444',
    marginHorizontal: 10,
  },
  reportText: {
    color: '#FFB800', // 노란색 계열 (주의)
    fontSize: 14,
    fontWeight: '600',
  },
  blockText: {
    color: '#FF4D4D', // 빨간색 계열 (위험/금지)
    fontSize: 14,
    fontWeight: '600',
  },
  // -----------------------

  closeButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default OpponentProfileModal;