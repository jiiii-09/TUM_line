let mic;
let recognition;
let lines = [];
let baseLineHeight = 25*10;
let tempTranscript = "";
let scrollOffset = 0;

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
  background(255);
  fill(0);
  textSize(12);
  text("▶ 클릭해서 마이크 + 음성인식 시작", width / 2 - 150, height / 2);
  textFont("SchoolSafeUniverse");

  // 🎨 감정별 폰트 세트 (랜덤으로 선택)
  emotionFonts = {
    joy: [
      "HappinessSans",
      "SchoolSafetyRoundedSmile",
      "OngleipParkDahyeon",
      "GabiaOndam",
      "Gowun Dodum"
    ],
    sadness: [
      "Diphylleia",
      "MapodaCapo",
      "GabiaCheongyeon",
      "Yeongwol",
      "KimJeongWonSMiss"
    ],
    surprise: [
      "Do Hyeon",
      // "SurpriseFont2",
      // "SurpriseFont3",
      // "SurpriseFont4",
      // "SurpriseFont5"
    ],
    fear: [
      "Hahmlet",
      // "FearFont2",
      // "FearFont3",
      // "FearFont4",
      // "FearFont5"
    ],
    disgust: [
      "Kirang Haerang",
      "KkuBulLim",
      "YunChorokwoosanEoriniMinguk",
      "Wildgak",
      // "DisgustFont5"
    ],
    anger: [
      "Noto Serif KR",
      "BookkMyungjo",
      "GapyeongHanseokbongBigBrush",
      "Simple",
      "JoseonPalace",
      "NostalgicPoliceVibe"
    ]
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
    "joy_sadness": color('#998A08'),
    "joy_surprise": color('#FFEA00'),
    "joy_fear": color('#AA95B7'),
    "joy_disgust": color('#AEFF00'),
    "joy_anger": color('#FF8400'),
    "sadness_surprise": color('#2000EF'),
    "sadness_fear": color('#6B01C2'),
    "sadness_disgust": color('#7E98C9'),
    "sadness_anger": color('#FF00EA'),
    "surprise_fear": color('#DED74E'),
    "surprise_disgust": color('#C8FF2F'),
    "surprise_anger": color('#FF0059'),
    "fear_disgust": color('#009B36'),
    "fear_anger": color('#D80073'),
    "disgust_anger": color('#820000')
  };
}

function draw() {
  background(0);

  let topAreaHeight = height * 0.25;
  let bottomAreaHeight = height * 0.75;
  let paddingTop = 40; 
  let totalHeight = calcTotalTextHeight() + paddingTop;
maxScroll = max(0, totalHeight - bottomAreaHeight);

  //--------------------------------------------------
  // 🔻 1️⃣ 자막 먼저 전부 그림
  //--------------------------------------------------
push();
translate(0, topAreaHeight - scrollY);

let yOffset = paddingTop;  // 시작점

for (let i = lines.length - 1; i >= 0; i--) {

  let l = lines[i];
  textSize(l.size);

  let x = 50;
  let words = l.txt.split(" ");
  let lineHeight = l.size * 0.9;

  let actualLines = 1;
  let tempX = x;

  // 🔹 줄 수 먼저 계산
  for (let w of words) {
    let wWidth = textWidth(w + " ");
    if (tempX + wWidth > width - 50) {
      tempX = 50;
      actualLines++;
    }
    tempX += wWidth;
  }

  // 🔹 실제 그리기 (위 → 아래)
  x = 50;
  let drawY = yOffset + lineHeight / 2;

  for (let w of words) {

    let wWidth = textWidth(w + " ");

    if (x + wWidth > width - 50) {
      x = 50;
      drawY += lineHeight;   // 🔥 아래로 줄바꿈
    }

    // ---- 색 transition 계산 ----
let progress = 1;

if (l.transitionStart > 0) {
  let elapsed = millis() - l.transitionStart;
  progress = constrain(elapsed / l.transitionDuration, 0, 1);
  progress = 1 - pow(1 - progress, 3);

  if (progress >= 1) {
    l.startColors = { ...l.targetColors };
    l.transitionStart = 0;
  }
}

let startCol = l.startColors?.[w] || color(255);
let targetCol = l.targetColors?.[w] || color(255);

let displayColor = lerpColor(startCol, targetCol, progress);

fill(displayColor);


    textFont(l.fonts[w] || "SchoolSafeUniverse");
    text(w, x, drawY);

    x += wWidth;
  }

  // 🔥 문장 블록 전체를 아래로 이동
  yOffset += actualLines * lineHeight * 1.2;
}

pop();


  //--------------------------------------------------
  // 🔝 2️⃣ 위 1/4 영역을 덮어버림 (마스크 역할)
  //--------------------------------------------------
  noStroke();
  fill(0);
  rect(0, 0, width, topAreaHeight);

  //--------------------------------------------------
  // 🔝 3️⃣ 실시간 텍스트 (항상 최상위)
  //--------------------------------------------------
  if (tempTranscript.length > 0 && mic) {
    let vol = mic.getLevel();
    let scaledVol = pow(vol * 15, 2);
    let size = map(scaledVol, 0, 1, 20, 220);
    size = constrain(size, 20, 220);
    size *= 3;

    textFont("SchoolSafeUniverse");
    textSize(size);
    fill(180);
    text(tempTranscript, 50, topAreaHeight / 2);
  }
  
//--------------------------------------------------
// 🎛 우측 하단 Pause / Play 버튼
//--------------------------------------------------

let bx = width - 60;
let by = height - 60;

fill(255, 40);
noStroke();
ellipse(bx, by, buttonSize);

fill(255);

if (isPaused) {
  // ▶ 플레이 아이콘
  triangle(bx - 6, by - 8, bx - 6, by + 8, bx + 8, by);
} else {
  // ⏸ 일시정지 아이콘
  rect(bx - 8, by - 8, 5, 16);
  rect(bx + 3, by - 8, 5, 16);
}
}

function mousePressed() {

  let bx = width - 60;
  let by = height - 60;

  // 버튼 클릭 영역
  if (dist(mouseX, mouseY, bx, by) < buttonSize / 2) {

    if (isPaused) {
      resumeSystem();
    } else {
      pauseSystem();
    }

    return; // 버튼 눌렀으면 여기서 종료
  }

  // 첫 시작일 때만
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
  let vol = mic.getLevel();
  let baseSize = map(pow(vol * 15, 2), 0, 1, 20, 220);
  baseSize = constrain(baseSize, 20, 220);
  baseSize *= 3;     // 🔥 전체 글자 크기 3배 증가

  let wordColors = {};
  let wordFonts = {}; // 🎯 단어별 폰트 저장용
  let words = txt.split(" ");

  let currentLineEmotion = null;
  for (let w of words) {
    currentLineEmotion = getEmotionFromWord(w);
    if (currentLineEmotion) break;
  }

  // 이전 줄 감정 혼합 색상 처리
  let prevLine = lines[lines.length - 1];
  if (
    prevLine &&
    prevLine.lineEmotion &&
    currentLineEmotion &&
    prevLine.lineEmotion !== currentLineEmotion
  ) {
    let key1 = `${prevLine.lineEmotion}_${currentLineEmotion}`;
    let key2 = `${currentLineEmotion}_${prevLine.lineEmotion}`;
    let mixed =
      mixedColors[key1] ||
      mixedColors[key2] ||
      emotionColors[currentLineEmotion];
    for (let w in prevLine.colors) {
  prevLine.startColors[w] = prevLine.colors[w]; // 현재 색 저장
  prevLine.targetColors[w] = mixed;             // 목표 색 설정
}

prevLine.transitionStart = millis();
  }

  // 🎨 단어별 감정 색상 + 폰트 지정
  for (let w of words) {
    let emo = getEmotionFromWord(w);
    if (emo) {
      wordColors[w] = emotionColors[emo];
      wordFonts[w] = random(emotionFonts[emo]); // 감정 단어만 폰트 변경
    } else {
      wordColors[w] = color(255);
      wordFonts[w] = "SchoolSafeUniverse"; // 기본 폰트 유지
    }
  }

  // 💾 저장
  lines.push({
  txt: txt,
  size: baseSize,
  colors: wordColors,
  targetColors: { ...wordColors },   // 🔥 목표 색
  startColors: { ...wordColors },    // 🔥 시작 색
  transitionStart: 0,
  transitionDuration: 4000,
  fonts: wordFonts,
  lineEmotion: currentLineEmotion
});

}


function calcTotalTextHeight() {

  let total = 0;

  for (let l of lines) {

    textSize(l.size);

    let x = 50;
    let words = l.txt.split(" ");
    let lineHeight = l.size * 0.9;
    let actualLines = 1;

    for (let w of words) {

      let wWidth = textWidth(w + " ");

      if (x + wWidth > width - 50) {
        x = 50;
        actualLines++;
      }

      x += wWidth;
    }

    total += actualLines * lineHeight * 1.2;
  }

  return total;
}

function getEmotionFromWord(txt) {
  if (["기뻐", "기쁘", "행복", "좋", "즐거워", "웃", "아름", "훌륭", "평화", "만족","빛","사랑","가볍","안녕"].some(w => txt.includes(w))) return "joy";
  if (["슬퍼", "우울", "눈물", "외로", "잃", "그리","망각","죄송","아비규환","그림자","패배","무겁","슬픈","슬프"].some(w => txt.includes(w))) return "sadness";
  if (["놀라", "깜짝", "충격"].some(w => txt.includes(w))) return "surprise";
  if (["무서", "불안", "공포", "긴장", "염려","두려","몸부림","걱정"].some(w => txt.includes(w))) return "fear";
  if (["싫", "혐오", "불쾌", "않", "징그러", "나쁘"].some(w => txt.includes(w))) return "disgust";
  if (["화", "짜증", "분노", "불행","투쟁","파멸"].some(w => txt.includes(w))) return "anger";
  return null;
}

function getColorFromWord(txt, prevEmotion = null) {
  let currentEmotion = getEmotionFromWord(txt);
  if (!currentEmotion) return color(255);

  if (prevEmotion && prevEmotion !== currentEmotion) {
    let key1 = `${prevEmotion}_${currentEmotion}`;
    let key2 = `${currentEmotion}_${prevEmotion}`;
    return mixedColors[key1] || mixedColors[key2] || emotionColors[currentEmotion];
  }
  return emotionColors[currentEmotion];
}

function startRecognition() {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "ko-KR";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let lastResult = event.results[event.results.length - 1];
    let transcript = lastResult[0].transcript.trim();

    if (lastResult.isFinal) {
      addLine(transcript);
      tempTranscript = "";
    } else {
      tempTranscript = transcript;
    }
  };

  //------------------------------------------------------------------
  // 🚀 핵심: 인식이 끝나면 자동 재시작
  //------------------------------------------------------------------
  recognition.onend = () => {
  if (!isPaused) {
    restartRecognition();
  }
};


  //------------------------------------------------------------------
  // 🚀 에러 발생해도 자동 재시작
  //------------------------------------------------------------------
  recognition.onerror = (event) => {
  if (!isPaused) {
    restartRecognition();
  }
};

  recognition.start();
}

// 🔁 안전한 재시작
function restartRecognition() {
  // 잠깐 딜레이 후 다시 재부팅
  setTimeout(() => {
    try {
      startRecognition();
    } catch (e) {
      console.error("Restart failed:", e);
    }
  }, 300);
}

function mouseWheel(event) {
  if (!isPaused) return;  // 🔥 pause 상태에서만 스크롤 가능

  scrollY -= event.delta;   // 🔥 방향 반전
scrollY = constrain(scrollY, 0, maxScroll);
}

function pauseSystem() {
  isPaused = true;

  if (recognition) {
    recognition.onend = null; // 자동 재시작 막기
    recognition.stop();
  }

  if (mic) {
    mic.stop();
  }

  console.log("⏸ Paused");
}

function resumeSystem() {
  isPaused = false;

  // 🔥 강제로 최신 위치 복귀
  scrollY = 0;

  // 🔥 혹시 남아있는 recognition 정리
  if (recognition) {
    recognition.stop();
  }

  if (mic) {
    mic.start();
  }

  startRecognition();

  console.log("▶ Resumed");
}
