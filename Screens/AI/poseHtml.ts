export const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; }
    canvas { position: absolute; width: 100%; height: 100%; object-fit: cover; }
    video { position: absolute; width: 100%; height: 100%; object-fit: cover; }
  </style>
</head>
<body>
  <video class="input_video" playsinline webkit-playsinline style="display:none"></video>
  <canvas class="output_canvas"></canvas>

  <script>
    // ---------------- [설정값] ----------------
    let frameCounter = 0;
    const THROTTLE_RATE = 3; // 성능 최적화: 3프레임마다 1번 전송 (기존 1 -> 3)
    let currentMode = 'SWING'; 

    // 에러 핸들링: RN으로 로그 전송
    window.onerror = function(message, source, lineno, colno, error) {
      if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'JS ERROR: ' + message }));
    };

    try {
        const videoElement = document.getElementsByClassName('input_video')[0];
        const canvasElement = document.getElementsByClassName('output_canvas')[0];
        const canvasCtx = canvasElement.getContext('2d');
        let isBackCamera = true;

        // [스윙] 프로 선수 스매시 임팩트 자세
        const PRO_SMASH_LANDMARKS = [
            {"x":0.5037,"y":0.4119,"z":0.0164,"visibility":0.99},{"x":0.5015,"y":0.4056,"z":0.0356,"visibility":0.99},{"x":0.5015,"y":0.4057,"z":0.0355,"visibility":0.99},{"x":0.5017,"y":0.4054,"z":0.0355,"visibility":0.99},{"x":0.4992,"y":0.4048,"z":-0.0016,"visibility":0.99},{"x":0.4976,"y":0.4042,"z":-0.0016,"visibility":0.99},{"x":0.4957,"y":0.4033,"z":-0.0016,"visibility":0.99},{"x":0.4913,"y":0.4081,"z":0.1280,"visibility":0.98},{"x":0.4841,"y":0.4044,"z":-0.0396,"visibility":0.99},{"x":0.5021,"y":0.4193,"z":0.0551,"visibility":0.99},{"x":0.4986,"y":0.4182,"z":0.0060,"visibility":0.99},{"x":0.4916,"y":0.4369,"z":0.2266,"visibility":0.99},{"x":0.4633,"y":0.4299,"z":-0.1447,"visibility":0.99},{"x":0.5541,"y":0.4060,"z":0.2753,"visibility":0.24},{"x":0.5326,"y":0.4004,"z":-0.2622,"visibility":0.98},{"x":0.5804,"y":0.3473,"z":0.2051,"visibility":0.49},{"x":0.5725,"y":0.3403,"z":-0.2378,"visibility":0.98},{"x":0.5844,"y":0.3347,"z":0.1930,"visibility":0.47},{"x":0.5780,"y":0.3292,"z":-0.2753,"visibility":0.96},{"x":0.5799,"y":0.3325,"z":0.1801,"visibility":0.48},{"x":0.5708,"y":0.3270,"z":-0.2648,"visibility":0.96},{"x":0.5781,"y":0.3357,"z":0.1928,"visibility":0.49},{"x":0.5692,"y":0.3318,"z":-0.2339,"visibility":0.93},{"x":0.4806,"y":0.5571,"z":0.1174,"visibility":0.99},{"x":0.4598,"y":0.5521,"z":-0.1174,"visibility":0.99},{"x":0.4781,"y":0.6506,"z":0.0763,"visibility":0.37},{"x":0.4675,"y":0.6493,"z":-0.1536,"visibility":0.89},{"x":0.4738,"y":0.7307,"z":0.1347,"visibility":0.61},{"x":0.4138,"y":0.7302,"z":-0.0808,"visibility":0.94},{"x":0.4674,"y":0.7459,"z":0.1356,"visibility":0.66},{"x":0.3859,"y":0.7406,"z":-0.0786,"visibility":0.88},{"x":0.5134,"y":0.7505,"z":0.0592,"visibility":0.72},{"x":0.4357,"y":0.7615,"z":-0.1807,"visibility":0.93}
        ];

        // [준비자세] 프로 선수 기마 자세
        const PRO_READY_LANDMARKS = [
            {"x":0.5976,"y":0.4794,"z":-0.1316,"visibility":0.99},{"x":0.5986,"y":0.4719,"z":-0.1118,"visibility":0.99},{"x":0.5995,"y":0.4719,"z":-0.1119,"visibility":0.99},{"x":0.6001,"y":0.4719,"z":-0.1120,"visibility":0.99},{"x":0.5930,"y":0.4707,"z":-0.1542,"visibility":0.99},{"x":0.5896,"y":0.4698,"z":-0.1543,"visibility":0.99},{"x":0.5856,"y":0.4687,"z":-0.1543,"visibility":0.99},{"x":0.5872,"y":0.4707,"z":-0.0079,"visibility":0.99},{"x":0.5695,"y":0.4675,"z":-0.1979,"visibility":0.99},{"x":0.5944,"y":0.4863,"z":-0.0883,"visibility":0.99},{"x":0.5858,"y":0.4844,"z":-0.1438,"visibility":0.99},{"x":0.5386,"y":0.5025,"z":0.1648,"visibility":0.99},{"x":0.5363,"y":0.4999,"z":-0.2974,"visibility":0.99},{"x":0.5539,"y":0.5562,"z":0.2926,"visibility":0.10},{"x":0.5580,"y":0.5612,"z":-0.3279,"visibility":0.98},{"x":0.6119,"y":0.5774,"z":0.2458,"visibility":0.24},{"x":0.6246,"y":0.5846,"z":-0.2265,"visibility":0.95},{"x":0.6262,"y":0.5809,"z":0.2515,"visibility":0.28},{"x":0.6379,"y":0.5881,"z":-0.2609,"visibility":0.93},{"x":0.6279,"y":0.5780,"z":0.2122,"visibility":0.31},{"x":0.6414,"y":0.5822,"z":-0.2538,"visibility":0.93},{"x":0.6266,"y":0.5781,"z":0.2259,"visibility":0.31},{"x":0.6362,"y":0.5811,"z":-0.2209,"visibility":0.89},{"x":0.4263,"y":0.5955,"z":0.1494,"visibility":0.99},{"x":0.4221,"y":0.5993,"z":-0.1492,"visibility":0.99},{"x":0.4887,"y":0.6582,"z":0.2692,"visibility":0.30},{"x":0.4926,"y":0.6694,"z":-0.0905,"visibility":0.98},{"x":0.4785,"y":0.7420,"z":0.4410,"visibility":0.59},{"x":0.4766,"y":0.7584,"z":0.0613,"visibility":0.99},{"x":0.4649,"y":0.7580,"z":0.4548,"visibility":0.61},{"x":0.4635,"y":0.7725,"z":0.0739,"visibility":0.97},{"x":0.5282,"y":0.7484,"z":0.4219,"visibility":0.75},{"x":0.5286,"y":0.7700,"z":0.0151,"visibility":0.98}
        ];

        // 좌표 정규화 함수 (화면 중앙 기준, 신체 크기 비례)
        function normalizePose(landmarks) {
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];
            const centerX = (leftHip.x + rightHip.x) / 2;
            const centerY = (leftHip.y + rightHip.y) / 2;

            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;

            const torsoSize = Math.sqrt(Math.pow(centerX - shoulderCenterX, 2) + Math.pow(centerY - shoulderCenterY, 2));
            const scale = torsoSize > 0 ? torsoSize : 1;

            return landmarks.map(lm => {
                return {
                    x: (lm.x - centerX) / scale,
                    y: (lm.y - centerY) / scale,
                    z: (lm.z || 0) / scale,
                    visibility: lm.visibility
                };
            });
        }

        // [1. 관절 데이터 추출 범위 확장 및 고도화]
        function calculateSimilarity(userLandmarks, proLandmarks, mode) {
            const normUser = normalizePose(userLandmarks);
            const normPro = normalizePose(proLandmarks);
            let totalDistance = 0;
            let importantJoints = [];

            if (mode === 'SWING') {
                importantJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26];
            } else {
                importantJoints = [7, 8, 11, 12, 23, 24, 25, 26, 27, 28];
            }

            for (let i of importantJoints) {
                // 해당 관절이 화면에 보이고 프로 데이터에도 존재하는 경우에만 비교
                if(normUser[i] && normUser[i].visibility > 0.5 && normPro[i]) {
                    const u = normUser[i];
                    const p = normPro[i];
                    const dist = Math.sqrt(Math.pow(u.x - p.x, 2) + Math.pow(u.y - p.y, 2));
                    totalDistance += dist;
                }
            }
            const avgDistance = totalDistance / importantJoints.length;
            // 거리가 가까울수록 점수가 높음 (100점 만점)
            const score = Math.max(0, 100 - (avgDistance * 150));
            return score;
        }

        // 세 점 사이의 각도 계산 함수
        function calculateAngle(a, b, c) {
            if (!a || !b || !c) return 0;
            const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
            let angle = Math.abs(radians * 180.0 / Math.PI);
            if (angle > 180.0) angle = 360 - angle;
            return angle;
        }

        // 풋워크 방향 판별 함수
        function classifyFootworkPose(landmarks, isBackCamera) {
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];
            const leftAnkle = landmarks[27];
            const rightAnkle = landmarks[28];
            const leftKnee = landmarks[25];
            const rightKnee = landmarks[26];

            if (!leftHip || !rightHip) return 'UNKNOWN';

            const lAnkleY = (leftAnkle && leftAnkle.visibility > 0.5) ? leftAnkle.y : (leftKnee ? leftKnee.y + 0.15 : 0);
            const rAnkleY = (rightAnkle && rightAnkle.visibility > 0.5) ? rightAnkle.y : (rightKnee ? rightKnee.y + 0.15 : 0);
            const hipCenterX = (leftHip.x + rightHip.x) / 2;

            let isUserRight = false;
            let isUserLeft = false;

            if (hipCenterX < 0.45) isUserRight = true;
            else if (hipCenterX > 0.55) isUserLeft = true;

            if (!isUserRight && !isUserLeft) return 'CENTER';

            if (isUserRight) {
                if (rAnkleY > lAnkleY + 0.03) return 'FRONT_RIGHT';
                else return 'BACK_RIGHT';
            }
            else {
                if (lAnkleY > rAnkleY + 0.03) return 'FRONT_LEFT';
                else return 'BACK_LEFT';
            }
        }

        // RN 메시지 수신 (카메라 전환, 모드 변경)
        document.addEventListener("message", handleRNMessage);
        window.addEventListener("message", handleRNMessage);

        function handleRNMessage(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'switchCamera') toggleCamera();
            if (data.type === 'setMode') {
                currentMode = data.mode;
            }
          } catch (e) {}
        }

        function resizeCanvas() {
            canvasElement.width = window.innerWidth;
            canvasElement.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function onResults(results) {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          const screenRatio = canvasElement.width / canvasElement.height;
          const imgRatio = results.image.width / results.image.height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (screenRatio > imgRatio) {
             drawWidth = canvasElement.width; drawHeight = canvasElement.width / imgRatio;
             offsetX = 0; offsetY = (canvasElement.height - drawHeight) / 2;
          } else {
             drawHeight = canvasElement.height; drawWidth = canvasElement.height * imgRatio;
             offsetX = (canvasElement.width - drawWidth) / 2; offsetY = 0;
          }

          if (!isBackCamera) {
              canvasCtx.translate(canvasElement.width, 0);
              canvasCtx.scale(-1, 1);
          }
          canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);

          if (results.poseLandmarks) {
            if(window.drawConnectors && window.drawLandmarks) {
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FFFF', lineWidth: 3});
                drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1, radius: 3});
            }

            frameCounter++;

            // [성능 최적화] 일정 프레임마다 데이터 전송
            if (frameCounter % THROTTLE_RATE === 0) {

                const swingKnnScore = calculateSimilarity(results.poseLandmarks, PRO_SMASH_LANDMARKS, 'SWING');
                const readyKnnScore = calculateSimilarity(results.poseLandmarks, PRO_READY_LANDMARKS, 'LUNGE');

                let footworkPose = 'CENTER';
                if (currentMode === 'FOOTWORK') {
                    footworkPose = classifyFootworkPose(results.poseLandmarks, isBackCamera);
                }

                // [2. 고도화된 분석 지표 계산을 위한 주요 포인트 추출]
                const nose = results.poseLandmarks[0];
                const lEar = results.poseLandmarks[7];
                const rEar = results.poseLandmarks[8];
                const lShoulder = results.poseLandmarks[11];
                const rShoulder = results.poseLandmarks[12];
                const rElbow = results.poseLandmarks[14];
                const rWrist = results.poseLandmarks[16];
                const lHip = results.poseLandmarks[23];
                const rHip = results.poseLandmarks[24];
                const rKnee = results.poseLandmarks[26];
                const rAnkle = results.poseLandmarks[28];

                let isPoseVisible = false;

                if (currentMode === 'SWING') {
                    if (rWrist && rWrist.visibility > 0.5) isPoseVisible = true;
                } else if (currentMode === 'FOOTWORK') {
                    if (rHip && rHip.visibility > 0.5) isPoseVisible = true;
                } else {
                    if (rKnee && rKnee.visibility > 0.5) isPoseVisible = true;
                }

                if(isPoseVisible && window.ReactNativeWebView) {
                    const elbowAngle = calculateAngle(rShoulder, rElbow, rWrist);
                    const kneeAngle = calculateAngle(rHip, rKnee, rAnkle);

                    // --- [신규 알고리즘 추가] ---

                    // 1. X-Factor (힙-어깨 분리도): 공격형 파워 분석
                    // Z축을 포함하여 3D 공간에서의 회전 각도 차이 계산 (상체 꼬임)
                    const shoulderRot = Math.atan2(rShoulder.z - lShoulder.z, rShoulder.x - lShoulder.x) * (180 / Math.PI);
                    const hipRot = Math.atan2(rHip.z - lHip.z, rHip.x - lHip.x) * (180 / Math.PI);
                    const xFactor = Math.abs(shoulderRot - hipRot);

                    // 2. COG (무게 중심 유동성): 체중 이동 분석
                    // 골반 중앙점의 X좌표 변화를 추적하여 전진/후진 이동 판단
                    const cogX = (lHip.x + rHip.x) / 2;

                    // 3. 타점 높이 효율성: 공격 각도 분석
                    // (발목~손목 높이) / (발목~머리 높이) 비율. 100%에 가까울수록 타점이 높음
                    let heightEfficiency = 0;
                    if (rAnkle && rWrist && nose) {
                        const bodyHeight = Math.abs(rAnkle.y - nose.y);
                        const hitHeight = Math.abs(rAnkle.y - rWrist.y);
                        if(bodyHeight > 0) heightEfficiency = (hitHeight / bodyHeight) * 100;
                    }

                    // 4. 머리/시선 안정성 (준비자세용)
                    // 양쪽 귀의 Y좌표 차이가 클수록 머리가 기울어진 것
                    let headTilt = 0;
                    if (lEar && rEar) {
                        headTilt = Math.abs(lEar.y - rEar.y) * 100;
                    }

                    let x = rWrist ? rWrist.x : 0;
                    if (!isBackCamera) x = 1.0 - x;

                    window.ReactNativeWebView.postMessage(JSON.stringify({
                       type: 'poseData',
                       x: x,
                       y: rWrist ? rWrist.y : 0,
                       timestamp: Date.now(),
                       elbowAngle: elbowAngle.toFixed(1),
                       kneeAngle: kneeAngle.toFixed(1),
                       swingKnnScore: swingKnnScore.toFixed(0),
                       readyKnnScore: readyKnnScore.toFixed(0),
                       footworkPose: footworkPose,
                       // [신규 데이터 전송]
                       xFactor: xFactor.toFixed(1),
                       cogX: cogX.toFixed(3),
                       heightEfficiency: heightEfficiency.toFixed(1),
                       headTilt: headTilt.toFixed(1)
                    }));
                }
            }
          }
          canvasCtx.restore();
        }

        const pose = new Pose({locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/pose/\${file}\`});
        pose.setOptions({
          modelComplexity: 1, smoothLandmarks: true,
          minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
        });
        pose.onResults(onResults);

        async function startCamera() {
             if (videoElement.srcObject) {
                const tracks = videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            const constraints = {
                video: { facingMode: isBackCamera ? 'environment' : 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            };
            try {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                videoElement.srcObject = stream;
                videoElement.onloadedmetadata = () => { videoElement.play(); processFrame(); };
            } catch (err) {
                 if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'Camera Error' }));
            }
        }
        function toggleCamera() { isBackCamera = !isBackCamera; startCamera(); }
        async function processFrame() {
            if (videoElement.paused || videoElement.ended) return;
            await pose.send({image: videoElement});
            requestAnimationFrame(processFrame);
        }
        startCamera();
    } catch (e) {}
  </script>
</body>
</html>
`;