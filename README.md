# SGCA Partners Digital Platform

SGCA Partners의 공식 디지털 플랫폼입니다. 글로벌 규제 준수 및 인증 컨설팅 서비스를 제공하는 전문적인 웹사이트입니다.

## 🚀 주요 기능

- **전문 분야 소개**: 의료기기(ISO 13485), 원자력 안전, 산업 기계 등 특화된 산업 분야의 정보 제공.
- **관리 시스템 및 제품 인증**: 다양한 국제 표준 및 규제 준수 가이드라인 제공.
- **다국어 지원 (Multi-language)**: 국문 및 영문(Professional Business English) 버전 제공으로 글로벌 시장 대응.
- **인사이트 리포트**: 최신 규제 업데이트 및 산업 뉴스를 카드 뉴스 형태로 제공.
- **관리자 시스템**: 인사이트 리포트 및 콘텐츠를 실시간으로 관리할 수 있는 백엔드 인터페이스 (Firebase 연동).

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Backend/Database**: Firebase Firestore
- **Styling**: 모던하고 전문적인 디자인 시스템, 반응형 웹 디자인
- **Icons**: 고해상도 맞춤형 아이콘 및 그래픽 에셋

## 📂 프로젝트 구조

- `index.html` / `index-en.html`: 메인 홈페이지 (국/영문)
- `management-system.html` / `-en.html`: 경영 시스템 인증 페이지
- `product-certification.html` / `-en.html`: 제품 인증 서비스 페이지
- `specialized-sectors.html` / `-en.html`: 전문 분야 페이지
- `insights.html` / `insights-en.html`: 규제 업데이트 및 인사이트 리포트 페이지
- `admin.html`: 콘텐츠 관리 시스템
- `css/`: 스타일시트 파일
- `js/`: Firebase 초기화 및 메인 로직 스크립트
- `images/`: 프로젝트에 사용된 이미지 및 로고 에셋

## 🔧 설치 및 실행 방법

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/nicesam991003/SGCA-Partners.git
   ```
2. `index.html` 파일을 브라우저에서 엽니다. (로컬 환경에서 즉시 확인 가능)

## 📝 관리자 설정

관리자 페이지(`admin.html`)를 통해 인사이트 리포트를 추가하거나 수정할 수 있습니다. Firebase 설정은 `js/firebase-init.js` 파일에서 관리됩니다.

---
© 2026 SGCA Partners. All Rights Reserved.
