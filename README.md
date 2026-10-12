# SGCA Partners Digital Platform

SGCA Partners의 공식 디지털 플랫폼입니다. 글로벌 규제 준수 및 인증 컨설팅 서비스를 제공하는 전문적인 웹사이트입니다.

## 🚀 주요 기능

- **회사소개 (About Us)**: SGCA Partners의 비전, 핵심 역량 및 글로벌 네트워크 소개.
- **전문 분야 소개**: 의료기기(ISO 13485), 원자력 안전, 산업 기계 등 특화된 산업 분야의 정보 제공.
- **관리 시스템 및 제품 인증**: 다양한 국제 표준 및 규제 준수 가이드라인 제공.
- **다국어 지원 (Multi-language)**: 국문 및 영문(Professional Business English) 버전 제공으로 글로벌 시장 대응.
- **인사이트 리포트**: 최신 규제 업데이트 및 산업 뉴스를 카드 뉴스 형태로 제공.
- **관리자 시스템**: 인사이트 리포트 및 콘텐츠를 실시간으로 관리할 수 있는 백엔드 인터페이스 (Firebase 연동).

## 🛠 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Backend/Database**: Firebase Firestore 및 Google 관리자 인증
- **Styling**: 모던하고 전문적인 디자인 시스템, 반응형 웹 디자인
- **Icons**: 고해상도 맞춤형 아이콘 및 그래픽 에셋

## 📂 프로젝트 구조

- `index.html` / `index-en.html`: 메인 홈페이지 (국/영문)
- `company-intro.html` / `-en.html`: 회사소개 (About Us) 페이지
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
   git clone https://github.com/nicesam991003-svg/SGCA-Partners.git
   ```
2. HTTP 서버로 사이트를 열어 확인합니다. 관리자 Google 로그인은 Firebase에 등록된 HTTPS 도메인에서 사용합니다.

## 📝 관리자 설정

관리자 페이지(`admin.html`)를 통해 인사이트 리포트를 추가하거나 수정할 수 있습니다. Firebase 설정은 `js/firebase-init.js` 파일에서 관리됩니다.

## 리포트 조회 및 원문 검증

- 홈페이지와 인사이트 페이지는 Firestore REST 서버 조회를 공유합니다. 날짜 필드가 없는 문서도 가져온 뒤 날짜순으로 정렬하며, 통신 실패를 리포트 0건으로 표시하지 않습니다.
- `admin.html?edit=<문서ID>`는 해당 리포트를 서버에서 직접 읽어 한글·영문 제목, 요약, 본문 및 공통 항목을 채웁니다. 조회 실패 시 저장을 막고, 수정은 같은 문서 ID에 반영합니다. 새 수동 작성은 별도 버튼으로 시작합니다.
- 자동 생성기는 검색 결과의 grounding 출처를 실제로 열어 최종 발행기관 URL, 제목, 본문 증거, 발행일을 확인합니다. AI가 작성한 URL은 저장하지 않습니다. 출처를 읽지 못하거나 최근 뉴스가 없으면 신규 리포트를 저장하지 않습니다.
- 원문 사실관계와 한영 번역을 별도 검토한 뒤 검증 정보를 함께 저장합니다. 확인되지 않은 법적 의무, 시행일, 표준 변경 또는 원문에 없는 자료를 추가하지 않습니다. 해석·권고는 원문 요약과 구분합니다.
- 자동 생성 결과는 초안입니다. 내용이나 원문 링크를 수정하면 기존 출처 승인을 무효화하고, 관리자 확인 전에는 초안으로 저장합니다. 게시 버튼도 원문 검증 정보를 확인합니다.
- 관리자는 Google로 인증한 `sim@sgca-partners.com` 계정만 허용합니다. 공유 비밀번호 입력을 없애고 Firestore 서버 규칙에서 초안 조회와 쓰기 권한을 검사합니다. 공개 방문자는 게시된 리포트만 조회합니다.
- 자동 생성기는 GitHub OIDC와 전용 서비스 계정으로 인증합니다. 서비스 계정은 리포트 조회와 신규 문서 생성만 허용되며, 기존 문서 수정·삭제 권한이 없습니다. `scripts/setup-generator-identity.sh`의 저장소 ID, main 및 주간 워크플로 조건을 유지해야 합니다.
- 배포 순서: 회사 프로젝트의 Google 로그인과 허용 도메인 설정 → 자동 생성 전용 IAM 설정 → 홈페이지 배포 → `firebase deploy --only firestore:rules --project sgca-platform-7abbc` → 공개 조회 및 관리자 인증 확인. 실제 적용 여부는 배포 결과에서 별도로 확인합니다.

검증: `npm test`. GitHub Actions도 생성 전에 같은 검사를 실행합니다. 원문 사이트가 자동 접근을 막는 경우 자동 생성은 실패하며, 출처를 추측해서 대체하지 않습니다.

## 홈페이지 배포와 공개 리포트 조회

`Publish SGCA website` 워크플로는 main 변경, 수동 실행, 매시 17·47분 일정에 실행됩니다. `scripts/build-site.js`는 서버 규칙으로 허용된 게시 리포트만 조회해 `_site/data/insights.json`을 만들고 GitHub Pages에 배포합니다. 이 작업은 별도 Google 권한이나 비밀 키를 사용하지 않으며 초안과 관리자 전용 데이터는 내보내지 않습니다. GitHub Pages의 Build and deployment Source는 GitHub Actions로 설정합니다.

공개 페이지는 서버에서 최신 게시 목록을 먼저 조회합니다. 브라우저의 네트워크 호출이 실패하면 동일 도메인의 검증된 공개 사본을 사용하고 동기화 시각을 표시합니다. 24시간이 지난 사본, 초안·미검증 자료, 잘못된 프로젝트 사본은 거부합니다. 서버 권한 거부를 사본으로 우회하지 않으며 관리자 조회·편집에는 이 경로를 사용하지 않습니다. 예약 배포는 GitHub 처리 상황에 따라 지연될 수 있으므로 즉시 동기화가 필요하면 게시 후 배포 워크플로를 수동 실행합니다.

일본어·중국어 인사이트는 영문 보고서를 그대로 제공하며 메뉴·버튼은 해당 언어를 유지합니다. 카드 링크의 `?report=<문서ID>`로 개별 리포트를 공유할 수 있습니다. 원문 발행일·등록일·출처 확인일은 구분해서 표시하고, 확인되지 않은 날짜는 추정하지 않습니다.

회사 소개 4개 HTML, 기존 `js/main.js`, `css/style.css` 및 원본 이미지 파일은 사용자의 유지 요청에 따라 변경하지 않습니다. 나머지 페이지는 별도의 탐색 스크립트·추가 스타일·경량 이미지로 개선합니다.

서버 규칙 검증: Java 21 이상에서 `npx firebase-tools emulators:exec --only firestore --project demo-sgca-security "npm run test:rules"`. 주간 워크플로의 수동 실행은 기본적으로 읽기 권한만 확인하며 리포트를 생성하지 않습니다.

---
© 2026 SGCA Partners. All Rights Reserved.
