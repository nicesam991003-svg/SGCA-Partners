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
    let app;
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    
    if (typeof firebase.analytics === 'function') {
        const analytics = firebase.analytics(app);
    }

    db = firebase.firestore();
    console.log("Firebase가 성공적으로 초기화되었습니다.");
} catch (error) {
    console.error("Firebase 초기화 중 오류 발생: ", error);
}

window.db = db;
// cache-bust: 20260521

window.globalEscHtml = function(str) { 
    if(!str) return ''; 
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); 
};
