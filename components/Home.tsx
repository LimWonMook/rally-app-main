import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  MapPin,
  User,
  Users,
  Bell,
  Check,
  X,
} from 'lucide-react-native';
import { MatchCard } from './MatchCard';

// --- 1. 달력 한국어 설정 ---
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'kr';

// --- 2. 필터 버튼 컴포넌트 ---
const FilterOptionButton = ({ label, icon, isSelected, onPress, type = 'text' }: any) => {
  const IconComponent = icon;
  const color = isSelected ? 'white' : '#6B7280';
  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        type === 'icon' && styles.optionButtonIcon,
        isSelected && styles.optionButtonSelected,
      ]}
      onPress={onPress}
    >
      {IconComponent && <IconComponent size={16} color={color} />}
      <Text
        style={[
          styles.optionButtonText,
          isSelected && styles.optionButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// --- 3. Props 인터페이스 정의 ---
export interface HomeProps {
  onStartGame: () => void;
  onGoToChat?: () => void;
}

// --- 4. 데이터 및 헬퍼 함수들 ---
const initialMatches = [
  {
    id: 1,
    status: '모집 중',
    playerCount: '2명',
    title: '정모',
    date: '2025년 11월 13일 19시 00분',
    location: '호계체육관',
  },
  {
    id: 2,
    status: '모집 중',
    playerCount: '2명',
    title: '정모',
    date: '2025년 11월 13일 19시 00분',
    location: '호계체육관',
  },
];

interface NotificationItem {
  id: number;
  type: 'request';
  title: string;
  message: string;
  time: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 1,
    type: 'request',
    title: '참가 신청',
    message: "'호계체육관 정모'에 김민수님이 참가를 희망합니다.",
    time: '방금 전',
  },
  {
    id: 2,
    type: 'request',
    title: '참가 신청',
    message: "'주말 배드민턴'에 이영희님이 참가를 희망합니다.",
    time: '10분 전',
  },
];

const formatMatchDate = (d: Date) => {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
};

const regionItems = [
  { label: '서울', value: '서울' },
  { label: '경기', value: '경기' },
  { label: '인천', value: '인천' },
  { label: '강원', value: '강원' },
  { label: '충청', value: '충청' },
  { label: '전라', value: '전라' },
  { label: '경상', value: '경상' },
  { label: '제주', value: '제주' },
];

const getHolidays = () => {
  const years = [2024, 2025, 2026];
  const fixedHolidays = [
    '01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25',
  ];
  const lunarHolidays2025 = ['01-28', '01-29', '01-30', '10-05', '10-06', '10-07'];

  let holidayList: string[] = [];
  years.forEach(year => {
    fixedHolidays.forEach(date => holidayList.push(`${year}-${date}`));
    if (year === 2025) {
      lunarHolidays2025.forEach(date => holidayList.push(`${year}-${date}`));
    }
  });
  return holidayList;
};

// --- 5. Home 컴포넌트 본문 ---
export function Home({ onStartGame, onGoToChat }: HomeProps) {
  const [startDateOffset, setStartDateOffset] = useState(0);

  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setDate(today.getDate() + startDateOffset);

    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({
        day: d.getDate(),
        label: dayLabels[d.getDay()],
        fullDate: new Date(d),
        dayOfWeek: d.getDay(),
      });
    }
    return list;
  }, [startDateOffset]);

  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [matches, setMatches] = useState(initialMatches);

  // 모달 상태들
  const [isModalVisible, setModalVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [detailedLocation, setDetailedLocation] = useState('');
  const [selectedGender, setSelectedGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [selectedCount, setSelectedCount] = useState<2 | 4>(4);
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [isCalendarModalVisible, setCalendarModalVisible] = useState(false);

  // 알림 모달 상태
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

  // 검색 상태
  const [isSearching, setIsSearching] = useState(false);
  const [filterGender, setFilterGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [filterCount, setFilterCount] = useState<2 | 4 | '전체'>('전체');

  const [lastTap, setLastTap] = useState<number | null>(null);

  const holidayList = useMemo(() => getHolidays(), []);

  // [공통] 날짜 텍스트 색상 결정 로직 (리스트 & 캘린더 공용)
  const getDayTextColor = (dateString: string) => {
    const d = new Date(dateString);
    const dayOfWeek = d.getDay();

    // 1. 공휴일 또는 일요일 -> 빨강
    if (holidayList.includes(dateString) || dayOfWeek === 0) {
      return '#EF4444';
    }
    // 2. 토요일 -> 파랑
    if (dayOfWeek === 6) {
      return '#3B82F6';
    }
    // 3. 평일 -> 검정 (기본)
    return '#1F2937';
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      setCalendarModalVisible(true);
      setLastTap(null);
    } else {
      setLastTap(now);
    }
  };

  const movePrev = () => setStartDateOffset(prev => prev - 1);
  const moveNext = () => setStartDateOffset(prev => prev + 1);

  // [수정] 캘린더 마킹 데이터 생성 (매치일만 점으로 표시)
  const calendarMarks = useMemo(() => {
    const marks: any = {};
    matches.forEach((match) => {
      const parts = match.date.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      if (parts) {
        const year = parts[1];
        const month = parts[2].padStart(2, '0');
        const day = parts[3].padStart(2, '0');
        const isoDate = `${year}-${month}-${day}`;

        marks[isoDate] = {
          hasMatch: true, // 커스텀 로직용 플래그
        };
      }
    });
    return marks;
  }, [matches]);

  // [중요] 캘린더 내부 날짜 렌더링 커스텀 컴포넌트
  const renderCalendarDay = ({ date, state }: any) => {
    const dateString = date.dateString;
    const textColor = state === 'disabled' ? '#D1D5DB' : getDayTextColor(dateString);
    const hasMatch = calendarMarks[dateString]?.hasMatch;

    // 오늘 날짜인지 확인
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = dateString === todayStr;

    return (
      <TouchableOpacity
        onPress={() => {
          console.log('선택한 날짜:', dateString);
          // 여기에 날짜 선택 시 동작 추가 가능 (예: 해당 날짜의 매치 필터링)
          setCalendarModalVisible(false);
        }}
        style={styles.calendarDayContainer}
      >
        <View style={[
          styles.calendarDayTextContainer,
          isToday && styles.todayBackground // 오늘 날짜 배경 강조
        ]}>
          <Text style={[
            styles.calendarDayText,
            { color: isToday ? 'white' : textColor }, // 오늘은 흰색, 나머지는 계산된 색상
            (state === 'today') && { fontWeight: 'bold' }
          ]}>
            {date.day}
          </Text>
        </View>

        {/* 매치가 있는 날 하단 점 표시 */}
        {hasMatch && <View style={styles.matchDot} />}
      </TouchableOpacity>
    );
  };

  const handleCreateRoom = () => {
    setModalVisible(true);
  };

  const handleConfirmCreation = () => {
    const finalLocation = `${selectedRegion || '지역 미선택'} - ${detailedLocation || '상세 장소 미입력'}`;
    const newMatch = {
      id: Math.random(),
      status: '모집 중',
      playerCount: `${selectedCount}명`,
      title: roomName || '새 모임',
      date: formatMatchDate(date),
      location: finalLocation,
    };
    setMatches([newMatch, ...matches]);
    setModalVisible(false);
    setRoomName('');
    setSelectedRegion(null);
    setDetailedLocation('');
    setSelectedGender('무관');
    setSelectedCount(4);
    setDate(new Date());
  };

  const handleNotificationPress = () => {
    setIsNotifModalVisible(true);
  };

  const handleAccept = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setIsNotifModalVisible(false);
    if (onGoToChat) onGoToChat();
  };

  const handleDecline = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../assets/images/rally-logo.png')} style={styles.logo} />
            <Text style={styles.logoText}>Rally</Text>
          </View>

          <TouchableOpacity onPress={handleNotificationPress} style={styles.notificationButton}>
            <Bell size={24} color="white" />
            {notifications.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifications.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="지역, 체육관으로 찾기"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              onFocus={() => setIsSearching(true)}
            />
            <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          </View>
          {isSearching && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsSearching(false)}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isSearching ? (
        <>
          <Image source={require('../assets/images/badminton.png')} style={styles.heroImage} resizeMode="cover" />

          <View style={styles.dateSelectorContainer}>
            <TouchableOpacity style={styles.dateArrowButton} onPress={movePrev}>
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>

            <Pressable style={styles.dateList} onPress={handleDoubleTap}>
              {dates.map((item) => {
                const isSelected = selectedDate === item.day;
                // 날짜 객체를 YYYY-MM-DD 문자열로 변환하여 색상 계산
                const year = item.fullDate.getFullYear();
                const month = String(item.fullDate.getMonth() + 1).padStart(2, '0');
                const day = String(item.fullDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                const textColor = isSelected ? 'white' : getDayTextColor(dateStr);

                return (
                  <TouchableOpacity
                    key={item.fullDate.toISOString()}
                    onPress={() => {
                      setSelectedDate(item.day);
                      handleDoubleTap();
                    }}
                    activeOpacity={0.7}
                    style={[styles.dateButton, isSelected && styles.dateButtonSelected]}
                  >
                    <Text style={[styles.dateButtonDay, { color: textColor }]}>
                      {item.day}
                    </Text>
                    <Text style={[styles.dateButtonLabel, isSelected && styles.dateButtonTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Pressable>

            <TouchableOpacity style={styles.dateArrowButton} onPress={moveNext}>
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.listWrapper}>
            <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} onStartGame={onStartGame} />
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.fab} onPress={handleCreateRoom} activeOpacity={0.8}>
              <Plus size={28} color="white" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView style={styles.filterContainer}>
          <Text style={styles.modalLabel}>인원</Text>
          <View style={styles.optionGroup}>
            <FilterOptionButton label="전체" icon={null} isSelected={filterCount === '전체'} onPress={() => setFilterCount('전체')} />
            <FilterOptionButton label="2인 (단식)" icon={User} isSelected={filterCount === 2} onPress={() => setFilterCount(2)} type="icon" />
            <FilterOptionButton label="4인 (복식)" icon={Users} isSelected={filterCount === 4} onPress={() => setFilterCount(4)} type="icon" />
          </View>
          <Text style={styles.modalLabel}>성별</Text>
          <View style={styles.optionGroup}>
            <FilterOptionButton label="무관" icon={null} isSelected={filterGender === '무관'} onPress={() => setFilterGender('무관')} />
            <FilterOptionButton label="남성" icon={null} isSelected={filterGender === '남성'} onPress={() => setFilterGender('남성')} />
            <FilterOptionButton label="여성" icon={null} isSelected={filterGender === '여성'} onPress={() => setFilterGender('여성')} />
          </View>
          <Text style={styles.modalLabel}>날짜 범위 (예시)</Text>
          <TouchableOpacity style={styles.modalInputButton}>
            <Calendar size={18} color="#6B7280" />
            <Text style={styles.modalInputText}>날짜 선택</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 알림 모달 */}
      <Modal
        visible={isNotifModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsNotifModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsNotifModalVisible(false)}>
          <View style={styles.notifModalContent}>
            <View style={styles.notifHeader}>
              <Text style={styles.modalTitle}>알림 센터</Text>
              <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyNotifContainer}>
                <Bell size={48} color="#D1D5DB" />
                <Text style={styles.emptyNotifText}>새로운 알림이 없습니다.</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.notifItem}>
                    <View style={styles.notifTextContainer}>
                      <View style={styles.notifTitleRow}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                      <Text style={styles.notifMessage}>{item.message}</Text>
                    </View>
                    <View style={styles.notifActionContainer}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.declineBtn]}
                        onPress={() => handleDecline(item.id)}
                      >
                        <X size={18} color="#EF4444" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={() => handleAccept(item.id)}
                      >
                        <Check size={18} color="white" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* 방 생성 모달 */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 방 생성</Text>
            <TextInput style={styles.modalInput} placeholder="모임 이름" placeholderTextColor="#9CA3AF" value={roomName} onChangeText={setRoomName} />
            <TouchableOpacity style={styles.modalInputButton} onPress={() => setDatePickerVisible(true)}>
              <Calendar size={18} color="#6B7280" />
              <Text style={styles.modalInputText}>{formatMatchDate(date)}</Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>지역 선택</Text>
            <TouchableOpacity style={styles.modalInputButton} onPress={() => setIsRegionModalVisible(true)}>
              <MapPin size={18} color={selectedRegion ? '#1F2937' : '#6B7280'} />
              <Text style={[styles.modalInputText, !selectedRegion && styles.placeholderText]}>
                {selectedRegion || '시/도를 선택하세요'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.modalLabel}>상세 장소 (경기장 이름)</Text>
            <TextInput style={styles.modalInput} placeholder="예: 호계체육관" placeholderTextColor="#9CA3AF" value={detailedLocation} onChangeText={setDetailedLocation} />
            <Text style={styles.modalLabel}>성별</Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '남성' && styles.optionButtonSelected]} onPress={() => setSelectedGender('남성')}>
                <Text style={[styles.optionButtonText, selectedGender === '남성' && styles.optionButtonTextSelected]}>남성</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '여성' && styles.optionButtonSelected]} onPress={() => setSelectedGender('여성')}>
                <Text style={[styles.optionButtonText, selectedGender === '여성' && styles.optionButtonTextSelected]}>여성</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedGender === '무관' && styles.optionButtonSelected]} onPress={() => setSelectedGender('무관')}>
                <Text style={[styles.optionButtonText, selectedGender === '무관' && styles.optionButtonTextSelected]}>무관</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>인원</Text>
            <View style={styles.optionGroup}>
              <TouchableOpacity style={[styles.optionButton, selectedCount === 2 && styles.optionButtonSelected]} onPress={() => setSelectedCount(2)}>
                <User size={16} color={selectedCount === 2 ? 'white' : '#6B7280'} />
                <Text style={[styles.optionButtonText, selectedCount === 2 && styles.optionButtonTextSelected]}>2인 (단식)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.optionButton, selectedCount === 4 && styles.optionButtonSelected]} onPress={() => setSelectedCount(4)}>
                <Users size={16} color={selectedCount === 4 ? 'white' : '#6B7280'} />
                <Text style={[styles.optionButtonText, selectedCount === 4 && styles.optionButtonTextSelected]}>4인 (복식)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalAddButton} onPress={handleConfirmCreation}>
              <Text style={styles.modalAddButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DatePicker modal open={isDatePickerVisible} date={date} onConfirm={(selectedDate) => { setDatePickerVisible(false); setDate(selectedDate); }} onCancel={() => setDatePickerVisible(false)} title="날짜와 시간 선택" confirmText="확인" cancelText="취소" minuteInterval={5} />

      <Modal animationType="slide" transparent={true} visible={isRegionModalVisible} onRequestClose={() => setIsRegionModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsRegionModalVisible(false)}>
          <Pressable style={styles.regionModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>지역 선택</Text>
            <FlatList data={regionItems} keyExtractor={(item) => item.value} renderItem={({ item }) => (
              <TouchableOpacity style={styles.regionItem} onPress={() => { setSelectedRegion(item.value); setIsRegionModalVisible(false); }}>
                <Text style={styles.regionItemText}>{item.label}</Text>
              </TouchableOpacity>
            )} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isCalendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarModalVisible(false)}>
          <View style={styles.calendarModalContent}>
            <Text style={styles.modalTitle}>경기 일정 확인</Text>
            {/* [수정] dayComponent 적용 */}
            <RNCalendar
              dayComponent={renderCalendarDay}
              monthFormat={'yyyy년 MM월'}
              theme={{
                arrowColor: '#1F2937',
                monthTextColor: '#1F2937',
                textMonthFontWeight: 'bold',
                textMonthFontSize: 18,
                textDayHeaderFontWeight: 'bold',
                // '일'요일 헤더는 빨강으로
                'stylesheet.calendar.header': {
                  dayHeader: {
                    marginTop: 2,
                    marginBottom: 7,
                    width: 32,
                    textAlign: 'center',
                    fontSize: 13,
                    color: '#6B7280', // 기본 색
                  }
                }
              }}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setCalendarModalVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logoWrapper: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 32, height: 32, marginRight: 8 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  notificationButton: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#111827' },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchContainer: { position: 'relative', flex: 1 },
  searchInput: { backgroundColor: '#374151', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, paddingRight: 40, fontSize: 16, color: '#FFFFFF' },
  searchIcon: { position: 'absolute', right: 12, top: 13 },
  cancelButton: { paddingLeft: 16 },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16 },
  heroImage: { width: '100%', height: 200 },
  dateSelectorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 12 },
  dateArrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  dateList: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dateButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 22, width: 44, height: 48 },
  dateButtonSelected: { backgroundColor: '#34D399' },
  dateButtonDay: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  dateButtonLabel: { fontSize: 12, color: '#374151' },
  dateButtonTextSelected: { color: 'white' },
  listWrapper: { flex: 1, backgroundColor: '#F9FAFB' },
  listContainer: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 88 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#34D399', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalBackdropPressable: { ...StyleSheet.absoluteFillObject },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 20, marginTop: 'auto' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F2937', marginBottom: 24, textAlign: 'center' },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#1F2937', marginBottom: 16 },
  modalInputButton: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  modalInputText: { fontSize: 16, color: '#1F2937', marginLeft: 8 },
  placeholderText: { color: '#9CA3AF' },
  modalLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  optionGroup: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  optionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', gap: 6 },
  optionButtonIcon: { paddingVertical: 10 },
  optionButtonSelected: { backgroundColor: '#34D399', borderColor: '#34D399' },
  optionButtonText: { fontSize: 14, fontWeight: '500', color: '#374151' },
  optionButtonTextSelected: { color: '#FFFFFF' },
  modalAddButton: { backgroundColor: '#34D399', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  modalAddButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  filterContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 24 },
  regionModalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, maxHeight: '60%', marginTop: 'auto' },
  regionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  regionItemText: { fontSize: 18, color: '#1F2937', textAlign: 'center' },
  calendarModalContent: { backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  closeButton: { marginTop: 15, backgroundColor: '#34D399', padding: 12, borderRadius: 10, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  notifModalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignSelf: 'center',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10
  },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  emptyNotifContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyNotifText: { color: '#9CA3AF', marginTop: 12, fontSize: 16 },
  notifItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  notifTextContainer: { flex: 1, marginRight: 12 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#34D399' },
  notifTime: { fontSize: 12, color: '#9CA3AF' },
  notifMessage: { fontSize: 15, color: '#1F2937', lineHeight: 20 },
  notifActionContainer: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#34D399' },
  declineBtn: { backgroundColor: '#F3F4F6' },

  // [추가] 캘린더 데이 커스텀 스타일
  calendarDayContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayTextContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 14,
  },
  todayBackground: {
    backgroundColor: '#34D399', // 오늘 날짜 배경
  },
  matchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34D399',
    marginTop: 2,
  },
});