// js/firebase-init.js
// 로컬 파일(file://) 환경에서도 동작하도록 Firebase Compat 버전을 사용합니다.

const firebaseConfig = {
  apiKey: "AIzaSyAOOGNkjpW48SUkX7qZfE28hG-yLj4sMRI",
  authDomain: "sgca-platform-7abbc.firebaseapp.com",
  projectId: "sgca-platform-7abbc",
  storageBucket: "sgca-platform-7abbc.firebasestorage.app",
  messagingSenderId: "1076998535653",
  appId: "1:1076998535653:web:286639c3d92a7cfb8f970c",
  measurementId: "G-9XZ257Q648"
};

let db = null;

try {
    // Firebase 앱 초기화 (전역 firebase 객체 사용)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    // Firestore 데이터베이스 참조 가져오기
    db = firebase.firestore();
} catch (error) {
    console.error("Firebase 초기화 중 오류 발생 (설정값을 확인해주세요): ", error);
}

// 창 전역 객체에 db 할당하여 다른 스크립트에서 사용 가능하게 함
window.db = db;
