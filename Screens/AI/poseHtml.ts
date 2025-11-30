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
    // ---------------- [수정됨: 설정값 변경] ----------------
    let frameCounter = 0;
    
    // ⚠️ 중요: 스매시 같은 빠른 동작을 잡기 위해 1로 변경 (매 프레임 전송)
    const THROTTLE_RATE = 1; 

    window.onerror = function(message, source, lineno, colno, error) {
      if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: 'JS ERROR: ' + message }));
    };

    try {
        const videoElement = document.getElementsByClassName('input_video')[0];
        const canvasElement = document.getElementsByClassName('output_canvas')[0];
        const canvasCtx = canvasElement.getContext('2d');
        let isBackCamera = true;

        // [스윙] 프로 선수 스매시 임팩트 자세 (측면 기준)
        const PRO_SMASH_LANDMARKS = [
            {"x":0.503777265548706,"y":0.4119122624397278,"z":0.016494281589984894,"visibility":0.99670207500455776},
            {"x":0.5015365481376648,"y":0.4056950509548187,"z":0.035606369376182556,"visibility":0.9954809546470642},
            {"x":0.5015580058097839,"y":0.4057040214538574,"z":0.035582318902015686,"visibility":0.9928297400474548},
            {"x":0.5017046928405762,"y":0.40544605255126953,"z":0.03555928170681,"visibility":0.9956088066101074},
            {"x":0.4992978870868683,"y":0.40484172105789185,"z":-0.001668682205490768,"visibility":0.9966406226158142},
            {"x":0.4976575970649719,"y":0.40426746010780334,"z":-0.0016011105617508292,"visibility":0.9959152340888977},
            {"x":0.4957943558692932,"y":0.40334710478782654,"z":-0.0016721466090530157,"visibility":0.9968917965888977},
            {"x":0.49139344692230225,"y":0.408145010471344,"z":0.1280279904603958,"visibility":0.9882218241691589},
            {"x":0.4841665029525757,"y":0.40445637702941895,"z":-0.0396580770611763,"visibility":0.9960475564002991},
            {"x":0.5021013021469116,"y":0.41933703422546387,"z":0.055190540850162506,"visibility":0.9912146329879761},
            {"x":0.49869903922080994,"y":0.4182378351688385,"z":0.006046638358384371,"visibility":0.9912195205688477},
            {"x":0.49164479970932007,"y":0.4369197487831116,"z":0.22660060226917267,"visibility":0.9967395663261414},
            {"x":0.4633283317089081,"y":0.4299169182777405,"z":-0.1447204202413559,"visibility":0.9987930059432983},
            {"x":0.5541783571243286,"y":0.40609830617904663,"z":0.27539098262786865,"visibility":0.24755364656448364},
            {"x":0.5326342582702637,"y":0.40042710304260254,"z":-0.2622569799423218,"visibility":0.9828412532806396},
            {"x":0.5804912447929382,"y":0.34739920496940613,"z":0.2051781862974167,"visibility":0.4998050928115845},
            {"x":0.5725874304771423,"y":0.3403807282447815,"z":-0.23784403502941132,"visibility":0.9840540885925293},
            {"x":0.5844914317131042,"y":0.3347359299659729,"z":0.1930789053440094,"visibility":0.47047704458236694},
            {"x":0.5780465006828308,"y":0.3292117118835449,"z":-0.2753238081932068,"visibility":0.9681786894798279},
            {"x":0.5799559950828552,"y":0.3325843811035156,"z":0.18012461066246033,"visibility":0.480461448431015},
            {"x":0.5708257555961609,"y":0.3270118832588196,"z":-0.2648943364620209,"visibility":0.9620711803436279},
            {"x":0.5781399011611938,"y":0.3357815444469452,"z":0.1928490698337555,"visibility":0.49163898825645447},
            {"x":0.5692161917686462,"y":0.33189842104911804,"z":-0.2339772880077362,"visibility":0.9361631274223328},
            {"x":0.4806649088859558,"y":0.5571027398109436,"z":0.11740466207265854,"visibility":0.9993594288825989},
            {"x":0.45987021923065186,"y":0.5521236658096313,"z":-0.11744344234466553,"visibility":0.9989281296730042},
            {"x":0.4781818091869354,"y":0.6506474614143372,"z":0.07634295523166656,"visibility":0.37170010805130005},
            {"x":0.4675811529159546,"y":0.6493076086044312,"z":-0.15367713570594788,"visibility":0.8917083740234375},
            {"x":0.4738886058330536,"y":0.7307339310646057,"z":0.1347150206565857,"visibility":0.6183486580848694},
            {"x":0.4138352572917938,"y":0.730260968208313,"z":-0.08089075982570648,"visibility":0.9482203125953674},
            {"x":0.46743834018707275,"y":0.7459627389907837,"z":0.13561217486858368,"visibility":0.6685017943382263},
            {"x":0.38599392771720886,"y":0.7406657934188843,"z":-0.07863342016935349,"visibility":0.8808806538581848},
            {"x":0.5134539008140564,"y":0.7505549192428589,"z":0.059204768389463425,"visibility":0.7205839157104492},
            {"x":0.4357813894748688,"y":0.7615401148796082,"z":-0.18074361979961395,"visibility":0.9333340525627136}
        ];

        // [준비자세] 프로 선수 기마 자세
        const PRO_READY_LANDMARKS = [
            {"x":0.5976055264472961,"y":0.47949308156967163,"z":-0.13166093826293945,"visibility":0.999560534954071},
            {"x":0.5986483693122864,"y":0.47191762924194336,"z":-0.11183536052703857,"visibility":0.9994832873344421},
            {"x":0.599521815776825,"y":0.4719581604003906,"z":-0.11191945523023605,"visibility":0.9995033740997314},
            {"x":0.6001788377761841,"y":0.4718948304653168,"z":-0.11200344562530518,"visibility":0.9994814395904541},
            {"x":0.593024492263794,"y":0.4707006812095642,"z":-0.15422578155994415,"visibility":0.9995313286781311},
            {"x":0.5896613597869873,"y":0.4698105454444885,"z":-0.15431581437587738,"visibility":0.9996137619018555},
            {"x":0.5856301188468933,"y":0.46878543496131897,"z":-0.15431451797485352,"visibility":0.9996337294578552},
            {"x":0.5872842669487,"y":0.4707317352294922,"z":-0.007914005778729916,"visibility":0.9987280368804932},
            {"x":0.5695256590843201,"y":0.46751952171325684,"z":-0.19797852635383606,"visibility":0.9995313286781311},
            {"x":0.5944750308990479,"y":0.48634809255599976,"z":-0.08839475363492966,"visibility":0.9981640577316284},
            {"x":0.5858086943626404,"y":0.48449206352233887,"z":-0.1438785046339035,"visibility":0.9988219738006592},
            {"x":0.5386945009231567,"y":0.5025840997695923,"z":0.16483096778392792,"visibility":0.9978536367416382},
            {"x":0.5363662838935852,"y":0.49990248680114746,"z":-0.297457218170166,"visibility":0.9997479915618896},
            {"x":0.5539140105247498,"y":0.5562266111373901,"z":0.29264476895332336,"visibility":0.10706823319196701},
            {"x":0.5580132603645325,"y":0.5612592101097107,"z":-0.3279341459274292,"visibility":0.98696368932724},
            {"x":0.6119163632392883,"y":0.577427089214325,"z":0.24580074846744537,"visibility":0.24309824407100677},
            {"x":0.6246473789215088,"y":0.5846134424209595,"z":-0.22652098536491394,"visibility":0.954973578453064},
            {"x":0.6262083649635315,"y":0.5809120535850525,"z":0.25154420733451843,"visibility":0.28515177965164185},
            {"x":0.6379749178886414,"y":0.5881325602531433,"z":-0.2609958350658417,"visibility":0.9311232566833496},
            {"x":0.6279557347297668,"y":0.5780186057090759,"z":0.2122485637664795,"visibility":0.314047634601593},
            {"x":0.6414673328399658,"y":0.5822262763977051,"z":-0.25380316376686096,"visibility":0.9306061863899231},
            {"x":0.6266494989395142,"y":0.5781053304672241,"z":0.2259438931941986,"visibility":0.31580042839050293},
            {"x":0.6362935304641724,"y":0.5811048150062561,"z":-0.22090943157672882,"visibility":0.8936508893966675},
            {"x":0.4263957142829895,"y":0.5955946445465088,"z":0.14945919811725616,"visibility":0.9965709447860718},
            {"x":0.4221888482570648,"y":0.5993655920028687,"z":-0.14926983416080475,"visibility":0.9979249835014343},
            {"x":0.488747239112854,"y":0.6582801938056946,"z":0.2692224681377411,"visibility":0.30904069542884827},
            {"x":0.49261507391929626,"y":0.6694965362548828,"z":-0.09059996157884598,"visibility":0.9872795343399048},
            {"x":0.4785478711128235,"y":0.7420880198478699,"z":0.4410325884819031,"visibility":0.5946859121322632},
            {"x":0.4766644835472107,"y":0.7584401369094849,"z":0.06132657453417778,"visibility":0.9912372827529907},
            {"x":0.4649806320667267,"y":0.7580521702766418,"z":0.4548455476760864,"visibility":0.6182604432106018},
            {"x":0.4635668694972992,"y":0.7725702524185181,"z":0.07391689717769623,"visibility":0.9799655079841614},
            {"x":0.5282338261604309,"y":0.7484759092330933,"z":0.42198535799980164,"visibility":0.7576810121536255},
            {"x":0.5286893248558044,"y":0.7700597643852234,"z":0.015195846557617188,"visibility":0.9866240620613098}
        ];

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

        function calculateSimilarity(userLandmarks, proLandmarks, mode) {
            const normUser = normalizePose(userLandmarks);
            const normPro = normalizePose(proLandmarks);
            let totalDistance = 0;
            let importantJoints = [];

            if (mode === 'SWING') {
                importantJoints = [11, 12, 13, 14, 15, 16]; 
            } else {
                importantJoints = [11, 12, 23, 24, 25, 26, 27, 28];
            }

            for (let i of importantJoints) {
                const u = normUser[i];
                const p = normPro[i];
                const dist = Math.sqrt(Math.pow(u.x - p.x, 2) + Math.pow(u.y - p.y, 2));
                totalDistance += dist;
            }
            const avgDistance = totalDistance / importantJoints.length;
            const score = Math.max(0, 100 - (avgDistance * 150)); 
            return score;
        }

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
          if (!isBackCamera) { canvasCtx.translate(canvasElement.width, 0); canvasCtx.scale(-1, 1); }
          canvasCtx.drawImage(results.image, offsetX, offsetY, drawWidth, drawHeight);

          if (results.poseLandmarks) {
            if(window.drawConnectors && window.drawLandmarks) {
                drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FFFF', lineWidth: 3});
                drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 1, radius: 3});
            }

            frameCounter++;
            
            // ---------------- [수정됨] 조건 완화 ----------------
            // 1. Throttle Rate 1 (매 프레임 전송)
            // 2. visibility 0.3 (흐릿해도 전송)
            if (frameCounter % THROTTLE_RATE === 0) {
                
                const swingKnnScore = calculateSimilarity(results.poseLandmarks, PRO_SMASH_LANDMARKS, 'SWING');
                const readyKnnScore = calculateSimilarity(results.poseLandmarks, PRO_READY_LANDMARKS, 'LUNGE');

                const shoulder = results.poseLandmarks[12];
                const elbow = results.poseLandmarks[14];
                const wrist = results.poseLandmarks[16];
                const hip = results.poseLandmarks[24];
                const knee = results.poseLandmarks[26];
                const ankle = results.poseLandmarks[28];

                // ⚠️ 여기 visibility > 0.3으로 낮췄습니다! (빠른 동작 인식용)
                if(wrist && wrist.visibility > 0.3 && window.ReactNativeWebView) {
                    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
                    const kneeAngle = calculateAngle(hip, knee, ankle);
                    let x = wrist.x; if (!isBackCamera) x = 1.0 - x; 

                    window.ReactNativeWebView.postMessage(JSON.stringify({
                       type: 'poseData',
                       x: x, y: wrist.y, timestamp: Date.now(),
                       elbowAngle: elbowAngle.toFixed(1),
                       kneeAngle: kneeAngle.toFixed(1),
                       swingKnnScore: swingKnnScore.toFixed(0),
                       readyKnnScore: readyKnnScore.toFixed(0)
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