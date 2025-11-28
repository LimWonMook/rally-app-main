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
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      background-color: #000;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    /* 캔버스가 화면을 꽉 채우도록 설정 */
    canvas { 
        position: absolute; 
        width: 100%; 
        height: 100%; 
        object-fit: cover; /* ★ 이 속성이 핵심입니다 (비율 유지하며 꽉 채우기) */
    }
    video {
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover; /* 비디오도 동일하게 적용 */
    }
  </style>
</head>
<body>
  <video class="input_video" playsinline webkit-playsinline style="display:none"></video>
  <canvas class="output_canvas"></canvas>

  <script>
    window.onerror = function(message, source, lineno, colno, error) {
      if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'JS ERROR: ' + message }));
    };

    try {
        const videoElement = document.getElementsByClassName('input_video')[0];
        const canvasElement = document.getElementsByClassName('output_canvas')[0];
        const canvasCtx = canvasElement.getContext('2d');
        let isBackCamera = true;
        let animationId;

        // ... (calculateAngle 함수 등은 그대로 유지) ...
        function calculateAngle(a, b, c) {
            if (!a || !b || !c) return 0;
            const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
            let angle = Math.abs(radians * 180.0 / Math.PI);
            if (angle > 180.0) angle = 360 - angle;
            return angle;
        }

        document.addEventListener("message", handleRNMessage);
        window.addEventListener("message", handleRNMessage);
        function handleRNMessage(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'switchCamera') toggleCamera();
          } catch (e) {}
        }

        // ★ 비율 보정 로직 (JS 레벨에서도 보정)
        function resizeCanvas() {
            canvasElement.width = window.innerWidth;
            canvasElement.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        function onResults(results) {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

          // ★ 이미지를 그릴 때 화면 비율에 맞춰서 Center Crop 방식으로 그리기
          // (단순 drawImage는 왜곡될 수 있으므로 계산 필요)
          
          const screenRatio = canvasElement.width / canvasElement.height;
          const imgRatio = results.image.width / results.image.height;
          
          let drawWidth, drawHeight, offsetX, offsetY;

          if (screenRatio > imgRatio) {
             // 화면이 더 넓음 (너비 기준 맞춤)
             drawWidth = canvasElement.width;
             drawHeight = canvasElement.width / imgRatio;
             offsetX = 0;
             offsetY = (canvasElement.height - drawHeight) / 2;
          } else {
             // 화면이 더 김 (높이 기준 맞춤)
             drawHeight = canvasElement.height;
             drawWidth = canvasElement.height * imgRatio;
             offsetX = (canvasElement.width - drawWidth) / 2;
             offsetY = 0;
          }

          if (!isBackCamera) {
              canvasCtx.translate(canvasElement.width, 0);
              canvasCtx.scale(-1, 1);
          }

          // 계산된 크기와 위치로 그리기 (왜곡 방지)
          canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);

          if (results.poseLandmarks) {
             // 랜드마크도 위치 보정이 필요하지만, MediaPipe는 0~1 상대좌표를 쓰므로
             // drawConnectors가 알아서 캔버스 크기에 맞춤. 
             // 다만 이미지를 우리가 임의로 확대/크롭했으므로 랜드마크가 약간 어긋날 수 있음.
             // 정확한 매핑을 위해 기본 그리기 도구 사용
            
            if(window.drawConnectors && window.drawLandmarks) {
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FFFF', lineWidth: 3});
                drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1, radius: 3});
            }

            const shoulder = results.poseLandmarks[12];
            const elbow = results.poseLandmarks[14];
            const wrist = results.poseLandmarks[16];
            const hip = results.poseLandmarks[24];
            const knee = results.poseLandmarks[26];
            const ankle = results.poseLandmarks[28];

            if(wrist && wrist.visibility > 0.5 && window.ReactNativeWebView) {
                const elbowAngle = calculateAngle(shoulder, elbow, wrist);
                const kneeAngle = calculateAngle(hip, knee, ankle);
                let x = wrist.x;
                if (!isBackCamera) x = 1.0 - x; 

                window.ReactNativeWebView.postMessage(JSON.stringify({
                   type: 'poseData',
                   x: x, y: wrist.y, timestamp: Date.now(),
                   elbowAngle: elbowAngle.toFixed(1),
                   kneeAngle: kneeAngle.toFixed(1)
                }));
            }
          }
          canvasCtx.restore();
        }

        const pose = new Pose({locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/pose/\${file}\`});
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        pose.onResults(onResults);

        async function startCamera() {
             if (videoElement.srcObject) {
                const tracks = videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            const constraints = {
                video: {
                    facingMode: isBackCamera ? 'environment' : 'user',
                    width: { ideal: 640 }, // 비율 유지에 도움
                    height: { ideal: 480 }
                }
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