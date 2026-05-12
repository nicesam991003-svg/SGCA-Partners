// js/firebase-init.js
// Firebase SDK (모듈 방식)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: 이 부분을 실제 Firebase 프로젝트의 설정값으로 교체해야 합니다!
// 1. 구글 Firebase 콘솔(https://console.firebase.google.com/) 접속
// 2. 새 프로젝트 생성 -> 웹 앱(</>) 추가
// 3. Firestore Database 만들기 (테스트 모드로 시작 권장)
// 4. 프로젝트 설정에서 아래의 firebaseConfig 값을 복사하여 붙여넣기 하세요.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app, db;

try {
    // Firebase 앱 초기화
    app = initializeApp(firebaseConfig);
    
    // Firestore 데이터베이스 참조 가져오기
    db = getFirestore(app);
    console.log("Firebase가 초기화되었습니다.");
} catch (error) {
    console.error("Firebase 초기화 중 오류 발생 (설정값을 확인해주세요): ", error);
}

export { db };
