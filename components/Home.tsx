import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, Image, TouchableOpacity, ScrollView,
  Modal, Pressable, KeyboardAvoidingView, Platform, FlatList, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent, Alert, TouchableWithoutFeedback,
  ImageSourcePropType
} from 'react-native';
import DatePicker from 'react-native-date-picker';
import { Calendar as RNCalendar, LocaleConfig } from 'react-native-calendars';
import LinearGradient from 'react-native-linear-gradient';
import {
  Search, ChevronLeft, ChevronRight, Plus, Calendar, MapPin,
  User, Users, Bell, Check, X, Megaphone
} from 'lucide-react-native';
import { MatchCard } from './MatchCard';
import { RMRGuideModal } from './RMRGuideModal';

// --- [수정 1] 달력 설정 에러 해결 (as any 추가) ---
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘'
} as any; 

LocaleConfig.defaultLocale = 'kr';

// --- Helper Types ---
interface HostProfile {
  name: string; location: string; tier: string; win: number; loss: number;
  mannerScore: number; avatar: ImageSourcePropType;
}

export interface Match {
  id: number; status: string; playerCount: string; title: string; date: string;
  location: string; region: string; gender: string; maxCount: number; host: HostProfile;
}

const NOTICE_ITEMS = [
  { id: 1, badge: 'RMR 가이드', title: '단순 승패 그 이상', subtitle: '경기 내용까지 분석하는 RMR 시스템을 소개합니다.', image: require('../assets/images/badminton_1.png') },
  { id: 2, badge: '플레이 스타일', title: '나만의 강점을 찾으세요', subtitle: '지구력, 속도, 위기관리 등 다양한 지표를 분석해 드려요.', image: require('../assets/images/badminton_2.png') },
  { id: 3, badge: '매너 플레이', title: '끝까지 최선을 다해주세요', subtitle: '강제 종료는 패배보다 더 큰 페널티를 받게 됩니다.', image: require('../assets/images/badminton_3.png') }
];

// --- Helper Functions ---
const parseMatchDateStr = (dateStr: string): Date => {
  const parts = dateStr.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일 (\d{1,2})시 (\d{1,2})분/);
  if (!parts) return new Date(0);
  return new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5]));
};

const formatMatchDate = (d: Date) => {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
};

const formatDateSimple = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MAIN_REGIONS = [
  { label: '전체', value: '전체' }, { label: '서울', value: '서울' }, { label: '경기', value: '경기' },
  { label: '인천', value: '인천' }, { label: '강원', value: '강원' }, { label: '충청', value: '충청' },
  { label: '전라', value: '전라' }, { label: '경상', value: '경상' }, { label: '제주', value: '제주' },
];

const SUB_REGIONS: { [key: string]: string[] } = {
  '서울': ['전체', '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  '경기': ['전체', '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '구리시', '안성시', '포천시', '의왕시', '하남시', '여주시', '양평군', '동두천시', '과천시', '가평군', '연천군'],
  '인천': ['전체', '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  '강원': ['전체'], '충청': ['전체'], '전라': ['전체'], '경상': ['전체'], '제주': ['전체']
};

const getHolidays = () => ['2025-01-01', '2025-03-01', '2025-05-05', '2025-08-15', '2025-10-03', '2025-12-25'];

// --- Components ---
const HeroSection = ({ onNoticePress }: { onNoticePress: () => void }) => {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const screenWidth = Dimensions.get('window').width;
  const extendedNotices = useMemo(() => [...NOTICE_ITEMS, { ...NOTICE_ITEMS[0], id: 'clone' }], []);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * screenWidth, animated: true });
      setCurrentIndex(nextIndex);
      if (nextIndex === NOTICE_ITEMS.length) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: 0, animated: false });
          setCurrentIndex(0);
        }, 500);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex, screenWidth]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    if (index !== currentIndex && index < extendedNotices.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.heroContainer}>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {extendedNotices.map((item, index) => (
          <TouchableOpacity key={`${item.id}-${index}`} onPress={onNoticePress} activeOpacity={0.95} style={{ width: screenWidth, height: 200 }}>
            <Image source={item.image} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.heroGradientOverlay}>
              <View style={styles.heroBadge}><Megaphone size={12} color="white" /><Text style={styles.heroBadgeText}>{item.badge}</Text></View>
              <View><Text style={styles.heroTitle}>{item.title}</Text><Text style={styles.heroSubtitle}>{item.subtitle}</Text></View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.paginationContainer}>
        {NOTICE_ITEMS.map((_, index) => <View key={index} style={[styles.paginationDot, (currentIndex % NOTICE_ITEMS.length) === index && styles.paginationDotActive]} />)}
      </View>
    </View>
  );
};

const FilterOptionButton = ({ label, icon, isSelected, onPress, type = 'text' }: any) => {
  const IconComponent = icon;
  return (
    <TouchableOpacity style={[styles.optionButton, type === 'icon' && styles.optionButtonIcon, isSelected && styles.optionButtonSelected]} onPress={onPress}>
      {IconComponent && <IconComponent size={16} color={isSelected ? 'white' : '#6B7280'} />}
      <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
};

const MatchHostModal = ({ visible, onClose, host, matchTitle }: { visible: boolean, onClose: () => void, host: HostProfile | null, matchTitle: string }) => {
  if (!host) return null;
  const handleRequestJoin = () => {
    Alert.alert("참가 신청", `'${matchTitle}' 모임에 참가 신청을 보내시겠습니까?`, [
      { text: "취소", style: "cancel" }, { text: "보내기", onPress: () => { Alert.alert("신청 완료", "방장에게 참가 신청을 보냈습니다."); onClose(); } }
    ]);
  };
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.profileModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.profileModalContent}>
              <View style={styles.profileSection}>
                <Image source={host.avatar} style={styles.profileAvatar} />
                <Text style={styles.profileNameText}>{host.name}</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:4}}><MapPin size={12} color="#A0A0A0"/><Text style={styles.profileLocationText}>{host.location}</Text></View>
                <Text style={styles.hostBadgeText}>방장(Host)</Text>
              </View>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}><Text style={styles.statLabel}>티어</Text><Text style={[styles.statValue, { color: '#00E0C6' }]}>{host.tier}</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statLabel}>승/패</Text><Text style={styles.statValue}>{host.win}승 {host.loss}패</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statLabel}>매너 점수</Text><Text style={styles.statValue}>{host.mannerScore}</Text></View>
              </View>
              <TouchableOpacity style={styles.joinRequestButton} onPress={handleRequestJoin}><Text style={styles.joinRequestButtonText}>참가 신청 보내기</Text></TouchableOpacity>
              <TouchableOpacity style={styles.profileCloseButton} onPress={onClose}><Text style={styles.profileCloseButtonText}>닫기</Text></TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const initialMatches: Match[] = [
  { id: 101, status: '모집 중', playerCount: '4명', title: '12월 송년 배드민턴', date: '2025년 12월 20일 18시 00분', location: '안양 호계체육관', region: '경기', gender: '무관', maxCount: 4, host: { name: '김민수', location: '안양시', tier: 'Silver 2', win: 15, loss: 8, mannerScore: 4.5, avatar: require('../assets/images/badminton_1.png') } },
  { id: 102, status: '모집 중', playerCount: '2명', title: '2026 신년맞이 단식', date: '2026년 1월 10일 14시 00분', location: '수원 만석공원', region: '경기', gender: '남성', maxCount: 2, host: { name: '이영희', location: '수원시', tier: 'Gold 1', win: 42, loss: 12, mannerScore: 4.9, avatar: require('../assets/images/badminton_2.png') } },
  { id: 103, status: '모집 중', playerCount: '4명', title: '서울 주말 아침 운동', date: '2025년 12월 21일 07시 00분', location: '서울 마곡 배드민턴장', region: '서울', gender: '무관', maxCount: 4, host: { name: '박철수', location: '서울 강서구', tier: 'Bronze 3', win: 5, loss: 5, mannerScore: 4.0, avatar: require('../assets/images/badminton_3.png') } },
  { id: 104, status: '모집 중', playerCount: '4명', title: '강남 저녁 내기 게임', date: '2025년 12월 22일 19시 30분', location: '서울 강남구민회관', region: '서울', gender: '무관', maxCount: 4, host: { name: '최강남', location: '서울 강남구', tier: 'Gold 3', win: 60, loss: 40, mannerScore: 4.8, avatar: require('../assets/images/badminton_1.png') } },
  { id: 105, status: '모집 중', playerCount: '2명', title: '성남 탄천 아침 단식', date: '2025년 12월 23일 06시 00분', location: '성남 탄천종합운동장', region: '경기', gender: '여성', maxCount: 2, host: { name: '정성남', location: '성남시 분당구', tier: 'Silver 1', win: 22, loss: 10, mannerScore: 5.0, avatar: require('../assets/images/badminton_2.png') } },
  { id: 106, status: '모집 중', playerCount: '4명', title: '용인 수지 주말 번개', date: '2025년 12월 24일 14시 00분', location: '용인 수지체육공원', region: '경기', gender: '무관', maxCount: 4, host: { name: '한용인', location: '용인시 수지구', tier: 'Bronze 1', win: 2, loss: 8, mannerScore: 3.5, avatar: require('../assets/images/badminton_3.png') } },
  { id: 107, status: '모집 중', playerCount: '4명', title: '인천 부평 퇴근 후 한판', date: '2025년 12월 26일 20시 00분', location: '인천 부평남부체육센터', region: '인천', gender: '남성', maxCount: 4, host: { name: '유인천', location: '인천 부평구', tier: 'Silver 3', win: 30, loss: 30, mannerScore: 4.2, avatar: require('../assets/images/badminton_1.png') } },
  { id: 108, status: '모집 중', playerCount: '2명', title: '마포 고수분 모십니다', date: '2025년 12월 27일 10시 00분', location: '서울 마포구민체육센터', region: '서울', gender: '무관', maxCount: 2, host: { name: '임마포', location: '서울 마포구', tier: 'Platinum 4', win: 120, loss: 15, mannerScore: 4.9, avatar: require('../assets/images/badminton_2.png') } },
];

interface HomeProps {
  onStartGame: () => void;
  onGoToChat: () => void;
}

export function Home({ onStartGame, onGoToChat }: HomeProps) {
  const [matches, setMatches] = useState<Match[]>(() => initialMatches.sort((a, b) => parseMatchDateStr(a.date).getTime() - parseMatchDateStr(b.date).getTime()));
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [filterRegion, setFilterRegion] = useState<string>('전체');
  const [filterGender, setFilterGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [filterCount, setFilterCount] = useState<2 | 4 | '전체'>('전체');
  const [activeFilterTab, setActiveFilterTab] = useState<'date' | 'region' | 'gender' | 'count'>('date');
  const [startDateOffset, setStartDateOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isRegionModalVisible, setIsRegionModalVisible] = useState(false);
  const [isCalendarModalVisible, setCalendarModalVisible] = useState(false);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
  const [isRmrGuideVisible, setIsRmrGuideVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isHostModalVisible, setIsHostModalVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'create' | 'filter'>('create');
  const [regionModalMode, setRegionModalMode] = useState<'create' | 'filter'>('create');
  const [tempMainRegion, setTempMainRegion] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [createRegion, setCreateRegion] = useState<string | null>(null);
  const [detailedLocation, setDetailedLocation] = useState('');
  const [createGender, setCreateGender] = useState<'무관' | '남성' | '여성'>('무관');
  const [createCount, setCreateCount] = useState<2 | 4>(4);
  const [createDate, setCreateDate] = useState(new Date());
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'request', title: '참가 신청', message: "'호계체육관 정모'에 김민수님이 참가를 희망합니다.", time: '방금 전' },
    { id: 2, type: 'request', title: '참가 신청', message: "'주말 배드민턴'에 이영희님이 참가를 희망합니다.", time: '10분 전' },
  ]);
  const [lastTap, setLastTap] = useState<number | null>(null);

  // --- [수정 2] handleAccept 함수 정의 ---
  const handleAccept = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    Alert.alert("수락됨", "참가 신청을 수락했습니다.");
  };

  const displayMatches = useMemo(() => {
    const now = new Date();
    return matches.filter(match => {
      const matchDate = parseMatchDateStr(match.date);
      if (matchDate <= now) return false;
      if (isSearching) {
        if (searchText && !match.title.toLowerCase().includes(searchText.toLowerCase()) && !match.location.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (filterDate) {
           const isSameDay = matchDate.getFullYear() === filterDate.getFullYear() && matchDate.getMonth() === filterDate.getMonth() && matchDate.getDate() === filterDate.getDate();
           if (!isSameDay) return false;
        }
        if (filterRegion !== '전체') {
            const isMainRegion = MAIN_REGIONS.some(r => r.value === filterRegion);
            if (isMainRegion) { if (match.region && match.region !== filterRegion) return false; } 
            else { if (!match.location.includes(filterRegion)) return false; }
        }
        if (filterGender !== '무관' && match.gender !== filterGender && match.gender !== '무관') return false;
        if (filterCount !== '전체' && match.maxCount !== filterCount) return false;
      }
      return true;
    }).sort((a, b) => parseMatchDateStr(a.date).getTime() - parseMatchDateStr(b.date).getTime());
  }, [matches, isSearching, searchText, filterDate, filterRegion, filterGender, filterCount, selectedDate]);

  const dates = useMemo(() => {
    const list = [];
    const today = new Date();
    today.setDate(today.getDate() + startDateOffset);
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      list.push({ day: d.getDate(), label: dayLabels[d.getDay()], fullDate: new Date(d) });
    }
    return list;
  }, [startDateOffset]);

  const getDayTextColor = (dateString: string) => {
    const d = new Date(dateString);
    const dayOfWeek = d.getDay();
    const holidayList = getHolidays();
    if (holidayList.includes(dateString) || dayOfWeek === 0) return '#EF4444';
    if (dayOfWeek === 6) return '#3B82F6';
    return '#1F2937';
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (lastTap && (now - lastTap) < 300) { setCalendarModalVisible(true); setLastTap(null); } else { setLastTap(now); }
  };

  const calendarMarks = useMemo(() => {
    const marks: any = {};
    matches.forEach((match) => {
      const parts = match.date.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
      if (parts) {
        const isoDate = `${parts[1]}-${parts[2].padStart(2, '0')}-${parts[3].padStart(2, '0')}`;
        marks[isoDate] = { hasMatch: true };
      }
    });
    return marks;
  }, [matches]);

  const renderCalendarDay = ({ date, state }: any) => {
    const dateString = date.dateString;
    const textColor = state === 'disabled' ? '#D1D5DB' : getDayTextColor(dateString);
    const hasMatch = calendarMarks[dateString]?.hasMatch;
    const isToday = dateString === new Date().toISOString().split('T')[0];
    return (
      <TouchableOpacity onPress={() => setCalendarModalVisible(false)} style={styles.calendarDayContainer}>
        <View style={[styles.calendarDayTextContainer, isToday && styles.todayBackground]}>
          <Text style={[styles.calendarDayText, { color: isToday ? 'white' : textColor }, (state === 'today') && { fontWeight: 'bold' }]}>{date.day}</Text>
        </View>
        {hasMatch && <View style={styles.matchDot} />}
      </TouchableOpacity>
    );
  };

  const handleCreateRoom = () => { setDatePickerMode('create'); setRegionModalMode('create'); setModalVisible(true); };

  const handleConfirmCreation = () => {
    const finalLocation = `${createRegion || '지역 미선택'} - ${detailedLocation || '상세 장소 미입력'}`;
    const newMatch: Match = {
      id: Math.random(), status: '모집 중', playerCount: `${createCount}명`, title: roomName || '새 모임', date: formatMatchDate(createDate),
      location: finalLocation, region: createRegion || '기타', gender: createGender, maxCount: createCount,
      host: { name: '나(본인)', location: createRegion || '미정', tier: 'Unranked', win: 0, loss: 0, mannerScore: 5.0, avatar: require('../assets/images/badminton_1.png') }
    };
    setMatches(prev => [...prev, newMatch]);
    setModalVisible(false);
    setRoomName(''); setCreateRegion(null); setDetailedLocation(''); setCreateGender('무관'); setCreateCount(4); setCreateDate(new Date());
  };

  const handleRegionItemPress = (itemValue: string) => {
    if (!tempMainRegion) {
        if (itemValue === '전체') {
            if (regionModalMode === 'create') setCreateRegion(null); else setFilterRegion('전체');
            setIsRegionModalVisible(false);
        } else { setTempMainRegion(itemValue); }
    } else {
        const finalRegion = itemValue === '전체' ? tempMainRegion : itemValue;
        if (regionModalMode === 'create') setCreateRegion(finalRegion); else setFilterRegion(finalRegion);
        setIsRegionModalVisible(false); setTempMainRegion(null);
    }
  };

  const renderListHeader = () => {
    if (isSearching) return null;
    return (
      <View>
        <HeroSection onNoticePress={() => setIsRmrGuideVisible(true)} />
        <View style={styles.dateSelectorContainer}>
            <TouchableOpacity style={styles.dateArrowButton} onPress={() => setStartDateOffset(p => p - 1)}><ChevronLeft size={20} color="white" /></TouchableOpacity>
            <Pressable style={styles.dateList} onPress={handleDoubleTap}>
            {dates.map((item) => {
                const isSelected = selectedDate === item.day;
                const dateStr = getLocalDateString(item.fullDate);
                return (
                <TouchableOpacity key={dateStr} onPress={() => { setSelectedDate(item.day); handleDoubleTap(); }} activeOpacity={0.7} style={[styles.dateButton, isSelected && styles.dateButtonSelected]}>
                    <Text style={[styles.dateButtonDay, { color: isSelected ? 'white' : getDayTextColor(dateStr) }]}>{item.day}</Text>
                    <Text style={[styles.dateButtonLabel, isSelected && styles.dateButtonTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
                );
            })}
            </Pressable>
            <TouchableOpacity style={styles.dateArrowButton} onPress={() => setStartDateOffset(p => p + 1)}><ChevronRight size={20} color="white" /></TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRegionList = () => {
    if (!tempMainRegion) {
        return (
            <FlatList data={MAIN_REGIONS} keyExtractor={(item) => item.value} renderItem={({ item }) => (
                    <TouchableOpacity style={styles.regionItem} onPress={() => handleRegionItemPress(item.value)}>
                        <Text style={styles.regionItemText}>{item.label}</Text>
                        {item.value !== '전체' && <ChevronRight size={16} color="#D1D5DB" />}
                    </TouchableOpacity>
                )} />
        );
    }
    const subRegions = SUB_REGIONS[tempMainRegion] || ['전체'];
    return (
        <View style={{flex: 1}}>
            <TouchableOpacity style={styles.regionHeaderBack} onPress={() => setTempMainRegion(null)}>
                <ChevronLeft size={20} color="#374151" />
                <Text style={styles.regionHeaderBackText}>{tempMainRegion} (다시 선택)</Text>
            </TouchableOpacity>
            <FlatList data={subRegions} keyExtractor={(item) => item} renderItem={({ item }) => (
                    <TouchableOpacity style={styles.regionItem} onPress={() => handleRegionItemPress(item)}>
                        <Text style={[styles.regionItemText, (regionModalMode === 'filter' && filterRegion === item) && { color: '#34D399', fontWeight: 'bold' }]}>
                            {item === '전체' ? `${tempMainRegion} 전체` : item}
                        </Text>
                    </TouchableOpacity>
                )} />
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image source={require('../assets/images/rally-logo.png')} style={styles.logo} />
            <Text style={styles.logoText}>Rally</Text>
          </View>
          <TouchableOpacity onPress={() => setIsNotifModalVisible(true)} style={styles.notificationButton}>
            <Bell size={24} color="white" />
            {notifications.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{notifications.length}</Text></View>}
          </TouchableOpacity>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <TextInput placeholder="제목, 장소 검색" placeholderTextColor="#9CA3AF" style={styles.searchInput} value={searchText} onChangeText={setSearchText} onFocus={() => { setIsSearching(true); setActiveFilterTab('date'); }} />
            <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          </View>
          {isSearching && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsSearching(false); setSearchText(''); setFilterDate(null); setFilterRegion('전체'); setFilterGender('무관'); setFilterCount('전체'); }}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {isSearching && (
            <View style={styles.filterPanelContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsScroll}>
                    {(['date', 'region', 'gender', 'count'] as const).map(tab => (
                        <TouchableOpacity key={tab} style={[styles.filterTab, activeFilterTab === tab && styles.filterTabActive]} onPress={() => setActiveFilterTab(tab)}>
                            <Text style={[styles.filterTabText, activeFilterTab === tab && styles.filterTabTextActive]}>
                                {tab === 'date' ? '날짜' : tab === 'region' ? '지역' : tab === 'gender' ? '성별' : '인원'}
                            </Text>
                            {((tab === 'date' && filterDate) || (tab === 'region' && filterRegion !== '전체') || (tab === 'gender' && filterGender !== '무관') || (tab === 'count' && filterCount !== '전체')) && <View style={styles.filterDot} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={styles.filterDetailContainer}>
                    {activeFilterTab === 'date' && (
                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterInputButton} onPress={() => { setDatePickerMode('filter'); setDatePickerVisible(true); }}>
                                <Calendar size={18} color="#6B7280" />
                                <Text style={styles.modalInputText}>{filterDate ? formatDateSimple(filterDate) : '날짜 선택 (전체)'}</Text>
                            </TouchableOpacity>
                            {filterDate && <TouchableOpacity style={styles.resetBadge} onPress={() => setFilterDate(null)}><X size={12} color="white" /></TouchableOpacity>}
                        </View>
                    )}
                    {activeFilterTab === 'region' && (
                        <View style={styles.filterRow}>
                            <TouchableOpacity style={styles.filterInputButton} onPress={() => { setRegionModalMode('filter'); setTempMainRegion(null); setIsRegionModalVisible(true); }}>
                                <MapPin size={18} color="#6B7280" />
                                <Text style={styles.modalInputText}>{filterRegion === '전체' ? '지역 선택 (전체)' : filterRegion}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {activeFilterTab === 'gender' && (
                        <View style={styles.optionGroup}>
                            <FilterOptionButton label="무관" icon={null} isSelected={filterGender === '무관'} onPress={() => setFilterGender('무관')} />
                            <FilterOptionButton label="남성" icon={User} isSelected={filterGender === '남성'} onPress={() => setFilterGender('남성')} type="icon"/>
                            <FilterOptionButton label="여성" icon={User} isSelected={filterGender === '여성'} onPress={() => setFilterGender('여성')} type="icon"/>
                        </View>
                    )}
                    {activeFilterTab === 'count' && (
                        <View style={styles.optionGroup}>
                            <FilterOptionButton label="전체" icon={null} isSelected={filterCount === '전체'} onPress={() => setFilterCount('전체')} />
                            <FilterOptionButton label="2인" icon={Users} isSelected={filterCount === 2} onPress={() => setFilterCount(2)} type="icon" />
                            <FilterOptionButton label="4인" icon={Users} isSelected={filterCount === 4} onPress={() => setFilterCount(4)} type="icon" />
                        </View>
                    )}
                </View>
            </View>
        )}

        <FlatList
            data={displayMatches}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 16, marginBottom: 0 }}>
                {/* --- [수정 3] item을 직접 전달하여 타입 오류 해결 --- */}
                <MatchCard match={item} onPress={() => { setSelectedMatch(item); setIsHostModalVisible(true); }} />
              </View>
            )}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={() => (
                <View style={{padding: 40, alignItems: 'center', marginTop: 50}}>
                    <Search size={40} color="#D1D5DB" style={{marginBottom:10}} />
                    <Text style={{color: '#6B7280', fontSize: 16}}>조건에 맞는 경기가 없습니다.</Text>
                </View>
            )}
        />

        {!isSearching && (
            <TouchableOpacity style={styles.fab} onPress={handleCreateRoom} activeOpacity={0.8}><Plus size={28} color="white" /></TouchableOpacity>
        )}
      </View>

      <RMRGuideModal visible={isRmrGuideVisible} onClose={() => setIsRmrGuideVisible(false)} />
      <MatchHostModal visible={isHostModalVisible} onClose={() => setIsHostModalVisible(false)} host={selectedMatch?.host || null} matchTitle={selectedMatch?.title || ''} />

      <Modal animationType="slide" transparent={true} visible={isRegionModalVisible} onRequestClose={() => setIsRegionModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsRegionModalVisible(false)}>
          <Pressable style={styles.regionModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>지역 선택</Text>
            {renderRegionList()}
          </Pressable>
        </Pressable>
      </Modal>

      <DatePicker modal open={isDatePickerVisible} date={datePickerMode === 'create' ? createDate : (filterDate || new Date())} onConfirm={(d) => { setDatePickerVisible(false); if (datePickerMode === 'create') setCreateDate(d); else setFilterDate(d); }} onCancel={() => setDatePickerVisible(false)} title={datePickerMode === 'create' ? "날짜와 시간 선택" : "날짜로 검색"} confirmText="확인" cancelText="취소" minuteInterval={5} mode={datePickerMode === 'create' ? 'datetime' : 'date'} />

      <Modal visible={isNotifModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsNotifModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsNotifModalVisible(false)}>
          <View style={styles.notifModalContent}>
            <View style={styles.notifHeader}><Text style={styles.modalTitle}>알림 센터</Text><TouchableOpacity onPress={() => setIsNotifModalVisible(false)}><X size={24} color="#6B7280" /></TouchableOpacity></View>
            {notifications.length === 0 ? <View style={styles.emptyNotifContainer}><Bell size={48} color="#D1D5DB" /><Text style={styles.emptyNotifText}>새로운 알림이 없습니다.</Text></View> : (
              <FlatList data={notifications} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => (
                <View style={styles.notifItem}>
                  <View style={styles.notifTextContainer}><View style={styles.notifTitleRow}><Text style={styles.notifTitle}>{item.title}</Text><Text style={styles.notifTime}>{item.time}</Text></View><Text style={styles.notifMessage}>{item.message}</Text></View>
                  <View style={styles.notifActionContainer}><TouchableOpacity style={[styles.actionBtn, styles.declineBtn]} onPress={() => {}}><X size={18} color="#EF4444" /></TouchableOpacity><TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAccept(item.id)}><Check size={18} color="white" /></TouchableOpacity></View>
                </View>
              )} />
            )}
          </View>
        </Pressable>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropPressable} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새로운 방 생성</Text>
            <TextInput style={styles.modalInput} placeholder="모임 이름" placeholderTextColor="#9CA3AF" value={roomName} onChangeText={setRoomName} />
            <TouchableOpacity style={styles.modalInputButton} onPress={() => { setDatePickerMode('create'); setDatePickerVisible(true); }}><Calendar size={18} color="#6B7280" /><Text style={styles.modalInputText}>{formatMatchDate(createDate)}</Text></TouchableOpacity>
            <Text style={styles.modalLabel}>지역 선택</Text>
            <TouchableOpacity style={styles.modalInputButton} onPress={() => { setRegionModalMode('create'); setTempMainRegion(null); setIsRegionModalVisible(true); }}><MapPin size={18} color={createRegion ? '#1F2937' : '#6B7280'} /><Text style={[styles.modalInputText, !createRegion && styles.placeholderText]}>{createRegion || '시/도를 선택하세요'}</Text></TouchableOpacity>
            <Text style={styles.modalLabel}>상세 장소</Text>
            <TextInput style={styles.modalInput} placeholder="예: 호계체육관" placeholderTextColor="#9CA3AF" value={detailedLocation} onChangeText={setDetailedLocation} />
            <Text style={styles.modalLabel}>성별</Text>
            <View style={styles.optionGroup}><FilterOptionButton label="남성" icon={null} isSelected={createGender === '남성'} onPress={() => setCreateGender('남성')} /><FilterOptionButton label="여성" icon={null} isSelected={createGender === '여성'} onPress={() => setCreateGender('여성')} /><FilterOptionButton label="무관" icon={null} isSelected={createGender === '무관'} onPress={() => setCreateGender('무관')} /></View>
            <Text style={styles.modalLabel}>인원</Text>
            <View style={styles.optionGroup}><FilterOptionButton label="2인" icon={User} isSelected={createCount === 2} onPress={() => setCreateCount(2)} type="icon" /><FilterOptionButton label="4인" icon={Users} isSelected={createCount === 4} onPress={() => setCreateCount(4)} type="icon" /></View>
            <TouchableOpacity style={styles.modalAddButton} onPress={handleConfirmCreation}><Text style={styles.modalAddButtonText}>추가</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isCalendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarModalVisible(false)}>
          <View style={styles.calendarModalContent}><Text style={styles.modalTitle}>경기 일정 확인</Text><RNCalendar dayComponent={renderCalendarDay} monthFormat={'yyyy년 MM월'} theme={{ arrowColor: '#1F2937' }} /><TouchableOpacity style={styles.closeButton} onPress={() => setCalendarModalVisible(false)}><Text style={styles.closeButtonText}>닫기</Text></TouchableOpacity></View>
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

  filterPanelContainer: { backgroundColor: '#F9FAFB', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTabsScroll: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  filterTab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8, flexDirection: 'row', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterTabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterTabTextActive: { color: 'white' },
  filterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399', marginLeft: 6 },
  filterDetailContainer: { paddingHorizontal: 16, paddingTop: 8 },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterInputButton: { flex: 1, backgroundColor: 'white', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  resetBadge: { backgroundColor: '#EF4444', borderRadius: 12, padding: 6, marginLeft: 8 },

  heroContainer: { width: '100%', height: 200, position: 'relative', overflow: 'hidden' },
  heroImage: { width: '100%', height: '100%' },
  heroGradientOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', paddingHorizontal: 20, paddingBottom: 32, justifyContent: 'flex-end' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#34D399', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 8, gap: 4 },
  heroBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  paginationContainer: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  paginationDotActive: { backgroundColor: '#34D399', width: 18 },

  dateSelectorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 16, paddingHorizontal: 12 },
  dateArrowButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  dateList: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  dateButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 22, width: 44, height: 48 },
  dateButtonSelected: { backgroundColor: '#34D399' },
  dateButtonDay: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  dateButtonLabel: { fontSize: 12, color: '#374151' },
  dateButtonTextSelected: { color: 'white' },

  listContent: { paddingBottom: 88 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#34D399', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8 },

  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalBackdropPressable: { ...StyleSheet.absoluteFillObject },
  modalContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 20, marginTop: 'auto' },
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

  regionModalContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 32, maxHeight: '70%', minHeight: 400, marginTop: 'auto' },
  regionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8 },
  regionItemText: { fontSize: 18, color: '#1F2937' },
  regionHeaderBack: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 8 },
  regionHeaderBackText: { fontSize: 16, fontWeight: 'bold', color: '#374151', marginLeft: 8 },

  calendarModalContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  closeButton: { marginTop: 15, backgroundColor: '#34D399', padding: 12, borderRadius: 10, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  notifModalContent: { width: '90%', backgroundColor: 'white', borderRadius: 16, padding: 24, alignSelf: 'center', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  emptyNotifContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyNotifText: { color: '#9CA3AF', marginTop: 12, fontSize: 16 },
  notifItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  notifTextContainer: { flex: 1, marginRight: 12 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  notifTitle: { fontSize: 14, fontWeight: 'bold', color: '#34D399' },
  notifTime: { fontSize: 12, color: '#9CA3AF' },
  notifMessage: { fontSize: 15, color: '#1F2937', lineHeight: 20 },
  notifActionContainer: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#34D399' },
  declineBtn: { backgroundColor: '#F3F4F6' },

  calendarDayContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  calendarDayTextContainer: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 14 },
  todayBackground: { backgroundColor: '#34D399' },
  matchDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#34D399', marginTop: 2 },

  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
  profileModalContent: { width: '85%', backgroundColor: '#1C1D2B', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  profileSection: { alignItems: 'center', marginBottom: 20 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, backgroundColor: '#333' },
  profileNameText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  profileLocationText: { fontSize: 14, color: '#A0A0A0' },
  hostBadgeText: { marginTop:6, color: '#34D399', fontSize: 12, fontWeight: 'bold', backgroundColor: 'rgba(52, 211, 153, 0.15)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 4 },
  statsContainer: { flexDirection: 'row', backgroundColor: '#25263A', borderRadius: 15, paddingVertical: 15, width: '100%', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  statDivider: { width: 1, height: '60%', backgroundColor: '#444' },
  joinRequestButton: { width: '100%', backgroundColor: '#34D399', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  joinRequestButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  profileCloseButton: { width: '100%', paddingVertical: 12, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' },
  profileCloseButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});