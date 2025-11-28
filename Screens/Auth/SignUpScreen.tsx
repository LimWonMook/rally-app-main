import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Phone,
  Check,
} from 'lucide-react-native';

// App.tsx로부터 받을 props 타입
interface SignUpScreenProps {
  onGoToLogin: () => void;
  onSignUp: () => void;
}

// 4단계의 현재 단계를 표시하는 인디케이터
const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <View style={styles.stepIndicatorContainer}>
    {[1, 2, 3, 4].map((step) => (
      <React.Fragment key={step}>
        <View
          style={[
            styles.stepDot,
            step === currentStep && styles.stepDotActive, // 현재
            step < currentStep && styles.stepDotCompleted, // 완료
          ]}
        >
          {step < currentStep ? (
            <Check size={14} color="white" />
          ) : (
            <Text
              style={[
                styles.stepText,
                step === currentStep && styles.stepTextActive,
              ]}
            >
              {step}
            </Text>
          )}
        </View>
        {step < 4 && <View style={styles.stepLine} />}
      </React.Fragment>
    ))}
  </View>
);

// 1단계: 약관 동의
const Step1_TOS = ({ onNext }: { onNext: () => void }) => {
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeLocation, setAgreeLocation] = useState(false);

  const handleAgreeAll = (value: boolean) => {
    setAgreeAll(value);
    setAgreeTerms(value);
    setAgreePrivacy(value);
    setAgreeLocation(value);
  };

  const isNextDisabled = !agreeTerms || !agreePrivacy || !agreeLocation;

  return (
    <>
      <Text style={styles.title}>약관 동의</Text>
      <Text style={styles.subtitle}>랠리(Rally)의 여정을 위해 동의가 필요해요.</Text>

      <TouchableOpacity
        style={[styles.checkContainer, styles.checkAll]}
        onPress={() => handleAgreeAll(!agreeAll)}
      >
        <View style={[styles.checkbox, agreeAll && styles.checkboxActive]}>
          {agreeAll && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkLabelAll}>전체 동의하기</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={[styles.checkContainer, styles.checkTOS]}
        onPress={() => setAgreeTerms(!agreeTerms)}
      >
        <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
          {agreeTerms && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkLabel}>[필수] 이용약관</Text>
        <Text style={styles.checkLink}>보기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.checkContainer, styles.checkPrivacy]}
        onPress={() => setAgreePrivacy(!agreePrivacy)}
      >
        <View style={[styles.checkbox, agreePrivacy && styles.checkboxActive]}>
          {agreePrivacy && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkLabel}>[필수] 개인정보 처리방침</Text>
        <Text style={styles.checkLink}>보기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.checkContainer, styles.checkLocation]}
        onPress={() => setAgreeLocation(!agreeLocation)}
      >
        <View style={[styles.checkbox, agreeLocation && styles.checkboxActive]}>
          {agreeLocation && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkLabel}>[필수] 위치정보 이용약관</Text>
        <Text style={styles.checkLink}>보기</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isNextDisabled && styles.buttonDisabled]}
        onPress={onNext}
        disabled={isNextDisabled}
      >
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>
    </>
  );
};

// 2단계: 휴대폰 본인인증
const Step2_PhoneVerify = ({ onNext }: { onNext: () => void }) => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);

  const handleSendCode = () => {
    // (추후) 실제 SMS 발송 로직
    if (phone.length < 10) {
      Alert.alert("오류", "올바른 휴대폰 번호를 입력하세요.");
      return;
    }
    setIsCodeSent(true);
    Alert.alert("알림", `${phone}으로 인증번호가 발송되었습니다.`);
  };

  const handleVerify = () => {
    // (추후) 실제 코드 검증 로직
    if (code.length < 6) {
      Alert.alert("오류", "인증번호 6자리를 입력하세요.");
      return;
    }
    // 성공 시 다음 단계로
    onNext();
  };

  return (
    <>
      <Text style={styles.title}>본인 인증</Text>
      <Text style={styles.subtitle}>안전한 매칭을 위해 휴대폰 인증을 진행합니다.</Text>

      <View style={styles.inputContainer}>
        <Phone size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="휴대폰 번호 ('-' 제외)"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          editable={!isCodeSent}
        />
        <TouchableOpacity
          style={[styles.codeButton, isCodeSent && styles.buttonDisabled]}
          onPress={handleSendCode}
          disabled={isCodeSent}
        >
          <Text style={styles.codeButtonText}>{isCodeSent ? "재전송" : "인증"}</Text>
        </TouchableOpacity>
      </View>

      {isCodeSent && (
        <View style={styles.inputContainer}>
          <ShieldCheck size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="인증번호 6자리"
            placeholderTextColor="#9CA3AF"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !isCodeSent && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={!isCodeSent}
      >
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>

      {/* --- 1. (신규) 개발용 건너뛰기 버튼 --- */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onNext} // 인증 로직 무시하고 '다음' 함수 바로 호출
      >
        <Text style={styles.linkText}>[개발용] 본인인증 건너뛰기</Text>
      </TouchableOpacity>
      {/* --- --------------------------- --- */}
    </>
  );
};

// 3단계: 계정 정보
const Step3_AccountInfo = ({ onNext }: { onNext: (data: any) => void }) => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNext = () => {
    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!email || !nickname || !password) {
      Alert.alert('오류', '모든 정보를 입력해주세요.');
      return;
    }
    // (임시) 데이터 전달
    onNext({ email, nickname });
  };

  return (
    <>
      <Text style={styles.title}>계정 정보</Text>
      <Text style={styles.subtitle}>로그인에 사용할 계정 정보를 입력하세요.</Text>

      <View style={styles.inputContainer}>
        <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="이메일" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.inputContainer}>
        <User size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="닉네임" placeholderTextColor="#9CA3AF" value={nickname} onChangeText={setNickname} />
      </View>
      <View style={styles.inputContainer}>
        <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="비밀번호" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
      </View>
      <View style={styles.inputContainer}>
        <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput style={styles.input} placeholder="비밀번호 확인" placeholderTextColor="#9CA3AF" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>다음</Text>
      </TouchableOpacity>

      {/* --- 1. (신규) 3단계용 건너뛰기 버튼 --- */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => onNext({ email: 'dev@test.com', nickname: '개발용' })} // 빈 데이터로 '다음' 함수 바로 호출
      >
        <Text style={styles.linkText}>[개발용] 계정정보 건너뛰기</Text>
      </TouchableOpacity>
      {/* --- --------------------------- --- */}
    </>
  );
};

// 4단계: RMR 초기 평가 (기획안의 '룰 퀴즈')
const Step4_RMRQuiz = ({ onComplete }: { onComplete: () => void }) => {
  const [answer1, setAnswer1] = useState<string | null>(null);

  const handleComplete = () => {
    // (추후) 퀴즈 정답을 기반으로 초기 RMR 참고용 데이터 전송
    Alert.alert("환영합니다!", "회원가입이 완료되었습니다.");
    onComplete();
  };

  return (
    <>
      <Text style={styles.title}>실력 가이드</Text>
      <Text style={styles.subtitle}>기본적인 룰 퀴즈로 RMR 참고 점수를 측정합니다.</Text>

      <Text style={styles.quizQuestion}>Q1. 배드민턴 복식 경기에서, 서브 순서는 어떻게 되나요?</Text>
      <TouchableOpacity
        style={[styles.quizOption, answer1 === 'A' && styles.quizOptionSelected]}
        onPress={() => setAnswer1('A')}
      >
        <Text style={[styles.quizText, answer1 === 'A' && styles.quizTextSelected]}>A. 점수를 낼 때마다 서버가 바뀐다.</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quizOption, answer1 === 'B' && styles.quizOptionSelected]}
        onPress={() => setAnswer1('B')}
      >
        <Text style={[styles.quizText, answer1 === 'B' && styles.quizTextSelected]}>B. 점수를 낸 팀이 계속 서브를 넣는다.</Text>
      </TouchableOpacity>

      {/* (추후 퀴즈 2, 3 추가) */}

      <TouchableOpacity
        style={[styles.button, !answer1 && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={!answer1}
      >
        <Text style={styles.buttonText}>가입 완료</Text>
      </TouchableOpacity>
    </>
  );
};


// 메인 컴포넌트
export default function SignUpScreen({ onGoToLogin, onSignUp }: SignUpScreenProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [signUpData, setSignUpData] = useState({});

  const handleNextStep = (data: any = {}) => {
    setSignUpData({ ...signUpData, ...data });
    setCurrentStep(currentStep + 1);
  };

  const handleComplete = () => {
    // (추후) signUpData를 백엔드로 전송
    console.log("최종 회원가입 데이터:", signUpData);
    onSignUp(); // App.tsx의 (임시) 회원가입 성공 처리
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_TOS onNext={handleNextStep} />;
      case 2:
        return <Step2_PhoneVerify onNext={handleNextStep} />;
      case 3:
        return <Step3_AccountInfo onNext={handleNextStep} />;
      case 4:
        return <Step4_RMRQuiz onComplete={handleComplete} />;
      default:
        return <Step1_TOS onNext={handleNextStep} />;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={require('../../assets/images/rally-logo.png')}
          style={styles.logo}
        />

        {/* 단계 표시기 */}
        <StepIndicator currentStep={currentStep} />

        {/* 현재 단계 렌더링 */}
        {renderStep()}

        {/* 하단 로그인 이동 */}
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.linkText}>이미 계정이 있으신가요? <Text style={styles.linkTextHighlight}>로그인</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  // Step Indicator
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '80%',
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#34D399',
  },
  stepDotCompleted: {
    backgroundColor: '#34D399',
  },
  stepText: {
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: 'white',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#374151',
  },
  // Inputs
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: 'white',
  },
  codeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#34D399',
    borderRadius: 5,
  },
  codeButtonText: {
    color: '#111827',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#34D399',
    borderRadius: 8,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  linksContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 24,
  },
  linkText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  linkTextHighlight: {
    color: '#34D399',
    fontWeight: 'bold',
  },
  // 2. (신규) 건너뛰기 버튼 스타일
  skipButton: {
    marginTop: 16,
  },
  // Step 1: TOS
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  checkAll: {
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
  checkLabel: {
    fontSize: 16,
    color: 'white',
  },
  checkLabelAll: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  checkLink: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 'auto',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    width: '100%',
    marginBottom: 20,
  },
  // Step 4: Quiz
  quizQuestion: {
    fontSize: 16,
    color: 'white',
    width: '100%',
    marginBottom: 16,
    fontWeight: '500',
  },
  quizOption: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  quizOptionSelected: {
    backgroundColor: '#34D399',
    borderColor: '#34D399',
  },
  quizText: {
    fontSize: 16,
    color: 'white',
  },
  quizTextSelected: {
    color: '#111827',
    fontWeight: 'bold',
  },
});