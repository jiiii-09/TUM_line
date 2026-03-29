let mic;
let recognition;
let lines = [];
let tempTranscript = "";

// 전역 선언
let emotionColors = {};
let mixedColors = {};
let emotionFonts = {};
let scrollY = 0;
let maxScroll = 0;

let isPaused = false;
let buttonSize = 40;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(LEFT, CENTER);
  background(0);
  
  // 폰트 설정 (CSS의 font-family 이름과 정확히 일치해야 함)
  textFont("SchoolSafeUniverse");
  fill(255);
  textSize(16);
  text("▶ 화면을 클릭하면 시작됩니다.", width / 2 - 100, height / 2);

  // 🎨 감정별 폰트 세트
  emotionFonts = {
    joy: ["HappinessSans", "SchoolSafetyRoundedSmile", "OngleipParkDahyeon", "GabiaOndam", "Gowun Dodum"],
    sadness: ["Diphylleia", "MapodaCapo", "GabiaCheongyeon", "Yeongwol", "KimJeongWonSMiss"],
    surprise: ["Do Hyeon"],
    fear: ["Hahmlet"],
    disgust: ["Kirang Haerang", "KkuBulLim", "YunChorokwoosanEoriniMinguk", "Wildgak"],
    anger: ["Noto Serif KR", "BookkMyungjo", "GapyeongHanseokbongBigBrush", "Simple", "JoseonPalace", "NostalgicPoliceVibe"]
  };

  // 기본 감정 색상
  emotionColors = {
    joy: color('#FFE500'),
    sadness: color('#004DFF'),
    surprise: color('#FFB700'),
    fear: color('#9D00FF'),
    disgust: color('#04EE00'),
    anger: color('#FF0000')
  };

  // 혼합 색상
  mixedColors = {
    "joy_sadness": color('#998A08'), "joy_surprise": color('#FFEA00'), "joy_fear": color('#AA95B7'),
    "joy_disgust": color('#AEFF00'), "joy_anger": color('#FF8400'), "sadness_surprise": color('#2000EF'),
    "sadness_fear": color('#6B01C2'), "sadness_disgust": color('#7E98C9'), "sadness_anger": color('#FF00EA'),
    "surprise_fear": color('#DED74E'), "surprise_disgust": color('#C8FF2F'), "surprise_anger": color('#FF0059'),
    "fear_disgust": color('#009B36'), "fear_anger": color('#D80073'), "disgust_anger": color('#820000')
  };
}

function draw() {
  background(0);
  
  // 매 프레임 기본 폰트 명시 (폰트 풀림 방지)
  textFont("SchoolSafeUniverse");

  let topAreaHeight = height * 0.25;
  let bottomAreaHeight = height * 0.75;
  let paddingTop = 40;
  let totalHeight = calcTotalTextHeight() + paddingTop;
  maxScroll = max(0, totalHeight - bottomAreaHeight);

  // 🔻 1️⃣ 저장된 자막 그리기
  push();
  translate(0, topAreaHeight - scrollY);
  let yOffset = paddingTop;

  for (let i = lines.length - 1; i >= 0; i--) {
    let l = lines[i];
    textSize(l.size);
    let x = 50;
    let words = l.txt.split(" ");
    let lineHeight = l.size * 0.9;
    let actualLines = 1;
    let tempX = x;

    for (let w of words) {
      let wWidth = textWidth(w + " ");
      if (tempX + wWidth > width - 50) { tempX = 50; actualLines++; }
      tempX += wWidth;
    }

    x = 50;
    let drawY = yOffset + lineHeight / 2;
    for (let w of words) {
      let wWidth = textWidth(w + " ");
      if (x + wWidth > width - 50) { x = 50; drawY += lineHeight; }

      let progress = 1;
      if (l.transitionStart > 0) {
        let elapsed = millis() - l.transitionStart;
        progress = constrain(elapsed / l.transitionDuration, 0, 1);
        progress = 1 - pow(1 - progress, 3);
        if (progress >= 1) { l.startColors = { ...l.targetColors }; l.transitionStart = 0; }
      }

      let startCol = l.startColors?.[w] || color(255);
      let targetCol = l.targetColors?.[w] || color(255);
      fill(lerpColor(startCol, targetCol, progress));
      textFont(l.fonts[w] || "SchoolSafeUniverse");
      text(w, x, drawY);
      x += wWidth;
    }
    yOffset += actualLines * lineHeight * 1.2;
  }
  pop();

  // 🔝 2️⃣ 위 1/4 마스크 영역 (실시간 텍스트 배경)
  noStroke();
  fill(0);
  rect(0, 0, width, topAreaHeight);

  // 🔝 3️⃣ 실시간 인식 텍스트 (항상 최상위)
  if (tempTranscript.length > 0 && mic) {
    let vol = mic.getLevel();
    let size = constrain(map(pow(vol * 15, 2), 0, 1, 20, 220), 20, 220) * 3;
    textFont("SchoolSafeUniverse");
    textSize(size);
    fill(180);
    text(tempTranscript, 50, topAreaHeight / 2);
  }

  // 🎛 우측 하단 Pause / Play 버튼
  let bx = width - 60;
  let by = height - 60;
  fill(255, 40);
  noStroke();
  ellipse(bx, by, buttonSize);
  fill(255);
  if (isPaused) {
    triangle(bx - 6, by - 8, bx - 6, by + 8, bx + 8, by);
  } else {
    rect(bx - 8, by - 8, 5, 16);
    rect(bx + 3, by - 8, 5, 16);
  }
}

function mousePressed() {
  let bx = width - 60;
  let by = height - 60;
  if (dist(mouseX, mouseY, bx, by) < buttonSize / 2) {
    if (isPaused) resumeSystem(); else pauseSystem();
    return;
  }
  if (!mic) {
    userStartAudio().then(() => {
      mic = new p5.AudioIn();
      mic.start();
      startRecognition();
    });
  }
}

function addLine(txt) {
  if (!txt) return;
  let vol = mic ? mic.getLevel() : 0;
  let baseSize = constrain(map(pow(vol * 15, 2), 0, 1, 20, 220), 20, 220) * 3;

  let wordColors = {};
  let wordFonts = {};
  let words = txt.split(" ");
  let currentLineEmotion = null;

  for (let w of words) {
    currentLineEmotion = getEmotionFromWord(w);
    if (currentLineEmotion) break;
  }

  let prevLine = lines[lines.length - 1];
  if (prevLine && prevLine.lineEmotion && currentLineEmotion && prevLine.lineEmotion !== currentLineEmotion) {
    let key1 = `${prevLine.lineEmotion}_${currentLineEmotion}`;
    let key2 = `${currentLineEmotion}_${prevLine.lineEmotion}`;
    let mixed = mixedColors[key1] || mixedColors[key2] || emotionColors[currentLineEmotion];
    for (let w in prevLine.colors) {
      prevLine.startColors[w] = prevLine.colors[w];
      prevLine.targetColors[w] = mixed;
    }
    prevLine.transitionStart = millis();
  }

  for (let w of words) {
    let emo = getEmotionFromWord(w);
    if (emo) {
      wordColors[w] = emotionColors[emo];
      wordFonts[w] = random(emotionFonts[emo]);
    } else {
      wordColors[w] = color(255);
      wordFonts[w] = "SchoolSafeUniverse";
    }
  }

  lines.push({
    txt: txt, size: baseSize, colors: wordColors, targetColors: { ...wordColors },
    startColors: { ...wordColors }, transitionStart: 0, transitionDuration: 4000,
    fonts: wordFonts, lineEmotion: currentLineEmotion
  });
}

function calcTotalTextHeight() {
  let total = 0;
  for (let l of lines) {
    textSize(l.size);
    let x = 50; let words = l.txt.split(" ");
    let lineHeight = l.size * 0.9; let actualLines = 1;
    for (let w of words) {
      let wWidth = textWidth(w + " ");
      if (x + wWidth > width - 50) { x = 50; actualLines++; }
      x += wWidth;
    }
    total += actualLines * lineHeight * 1.2;
  }
  return total;
}

function getEmotionFromWord(txt) {
  if (["기뻐", "기쁘", "행복", "좋", "즐거워", "웃", "아름", "훌륭", "평화", "만족", "빛", "사랑", "가볍", "안녕"].some(w => txt.includes(w))) return "joy";
  if (["슬퍼", "우울", "눈물", "외로", "잃", "그리", "망각", "죄송", "아비규환", "그림자", "패배", "무겁", "슬픈", "슬프"].some(w => txt.includes(w))) return "sadness";
  if (["놀라", "깜짝", "충격"].some(w => txt.includes(w))) return "surprise";
  if (["무서", "불안", "공포", "긴장", "염려", "두려", "몸부림", "걱정"].some(w => txt.includes(w))) return "fear";
  if (["싫", "혐오", "불쾌", "않", "징그러", "나쁘"].some(w => txt.includes(w))) return "disgust";
  if (["화", "짜증", "분노", "불행", "투쟁", "파멸"].some(w => txt.includes(w))) return "anger";
  return null;
}

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log("🎤 Recording...");
  };

  recognition.onresult = (event) => {
    let lastResult = event.results[event.results.length - 1];
    let transcript = lastResult[0].transcript.trim();
    if (lastResult.isFinal) {
      addLine(transcript);
      sendToSheet(transcript, getEmotionFromWord(transcript) || "none", mic ? mic.getLevel() : 0);
      tempTranscript = "";
    } else {
      tempTranscript = transcript;
    }
  };

  recognition.onend = () => { if (!isPaused) setTimeout(() => { try { recognition.start(); } catch(e){} }, 1000); };
  recognition.onerror = (event) => { if (event.error !== 'aborted' && !isPaused) setTimeout(() => { try { recognition.start(); } catch(e){} }, 1000); };
  recognition.start();
}

function sendToSheet(text, emotion, volume) {
  const url = "https://script.google.com/macros/s/AKfycbw53lb7jMqy2IznctKcl567uqPyLUsqr9aaovBW49jwA9yeBN3-KLqUdJvgXuwyVcnjTg/exec";
  const data = { timestamp: new Date().toLocaleString('ko-KR'), text: text, emotion: emotion, volume: volume.toFixed(4) };
  fetch(url, { method: "POST", mode: "no-cors", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } })
    .then(() => console.log("✅ Archived:", text))
    .catch(err => console.error("❌ Sync Error:", err));
}

function pauseSystem() {
  isPaused = true;
  if (recognition) { recognition.onend = null; recognition.stop(); }
  if (mic) mic.stop();
  console.log("⏸ Paused");
}

function resumeSystem() {
  isPaused = false;
  scrollY = 0;
  if (mic) mic.start();
  startRecognition();
  console.log("▶ Resumed");
}

function mouseWheel(event) {
  if (!isPaused) return;
  scrollY = constrain(scrollY - event.delta, 0, maxScroll);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
