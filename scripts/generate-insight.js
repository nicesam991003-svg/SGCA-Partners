/**
 * generate-insight.js
 * 매주 월요일 GitHub Actions에서 실행됩니다.
 * 1. Anthropic API (claude-sonnet-4-20250514 + web_search)로 경영시스템인증 최신 뉴스 검색 및 리포트 생성
 * 2. Firebase Firestore에 status: 'draft'로 저장
 */

const https = require('https');

// ─────────────────────────────────────────
// 1. 환경변수 확인
// ─────────────────────────────────────────
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;
const FIREBASE_API_KEY   = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_APP_ID    = process.env.FIREBASE_APP_ID;

if (!ANTHROPIC_API_KEY || !FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다.');
  console.error('   GitHub Secrets에 ANTHROPIC_API_KEY, FIREBASE_API_KEY, FIREBASE_PROJECT_ID 를 추가하세요.');
  process.exit(1);
}

// ─────────────────────────────────────────
// 2. 유틸: HTTPS POST 요청
// ─────────────────────────────────────────
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          reject(new Error(`JSON 파싱 실패: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─────────────────────────────────────────
// 3. Anthropic API 호출 (web_search 포함)
// ─────────────────────────────────────────
async function generateInsightReport() {
  console.log('🔍 Anthropic API로 경영시스템인증 최신 뉴스 검색 중...');

  // 오늘 날짜 계산 (KST)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = kst.toISOString().split('T')[0]; // YYYY-MM-DD

  const systemPrompt = `당신은 SGCA Partners의 경영시스템인증 전문 리서치 어시스턴트입니다.
웹 검색을 통해 ISO 경영시스템인증(ISO 9001, ISO 14001, ISO 45001, ISO 13485, ISO 19443) 관련 
가장 최신이고 중요한 뉴스 1건을 찾아 다음 JSON 형식으로 정확히 반환하세요.

검색 대상 출처: ISO 공식 웹사이트, IAF, KAB, ANAB, IAS, UKAS, BSI, DNV, SGS, TÜV SÜD

반드시 아래 JSON만 반환하고 다른 텍스트는 절대 포함하지 마세요:
{
  "title": "리포트 제목 (한국어, 구체적이고 명확하게)",
  "category": "management-system",
  "date": "${todayStr}",
  "link": "원문 URL (실제 존재하는 URL)",
  "desc": "2~3줄 요약 (한국어, 핵심 내용 중심)",
  "fullContent": "A4 1장 분량의 HTML 형식 원문 내용 (h4 태그로 섹션 구분, p/ul/li 태그 사용, 한국어)"
}

fullContent 구성 (HTML):
- <h4>■ 개요</h4> : 뉴스의 배경과 발표 주체
- <h4>■ 주요 내용</h4> : 핵심 변경사항이나 발표 내용 (ul/li로 구성)
- <h4>■ 일정 및 영향</h4> : 시행 일정, 전환 기간, 영향 범위
- <h4>■ 시사점 및 대응 권고</h4> : 국내 인증기업의 대응 방향
- <p style="font-size:0.85em; color:#6c7a89;">※ 출처: [출처명] ([날짜])</p>`;

  const userPrompt = `오늘(${todayStr}) 기준으로 ISO 경영시스템인증 분야(ISO 9001, ISO 14001, ISO 45001, ISO 13485, ISO 19443)에서 
가장 최근에 발표된 중요한 뉴스 1건을 검색하여 SGCA Partners 인사이트 리포트로 작성해주세요.
가능하면 최근 2주 이내 발표된 내용을 우선하세요.`;

  const requestBody = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search'
      }
    ],
    messages: [
      { role: 'user', content: userPrompt }
    ]
  };

  const response = await httpsPost(
    'api.anthropic.com',
    '/v1/messages',
    {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    requestBody
  );

  if (response.status !== 200) {
    throw new Error(`Anthropic API 오류 (${response.status}): ${JSON.stringify(response.body)}`);
  }

  // 응답에서 텍스트 블록 추출
  const content = response.body.content || [];
  let jsonText = '';
  for (const block of content) {
    if (block.type === 'text' && block.text) {
      jsonText = block.text.trim();
      break;
    }
  }

  if (!jsonText) {
    throw new Error('Anthropic 응답에서 텍스트를 찾을 수 없습니다.');
  }

  // JSON 파싱 (마크다운 코드블록 제거)
  const cleaned = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

  let report;
  try {
    report = JSON.parse(cleaned);
  } catch (e) {
    console.error('원본 응답:', jsonText);
    throw new Error(`JSON 파싱 실패: ${e.message}`);
  }

  // 필수 필드 검증
  const required = ['title', 'category', 'date', 'desc', 'fullContent'];
  for (const field of required) {
    if (!report[field]) throw new Error(`필수 필드 누락: ${field}`);
  }

  console.log(`✅ 리포트 생성 완료: "${report.title}"`);
  return report;
}

// ─────────────────────────────────────────
// 4. Firebase Firestore REST API로 저장
// ─────────────────────────────────────────
async function saveToFirestore(report) {
  console.log('💾 Firebase Firestore에 draft로 저장 중...');

  // Firestore REST API 인증 토큰 획득
  const tokenRes = await httpsPost(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signInAnonymously?key=${FIREBASE_API_KEY}`,
    {},
    { returnSecureToken: true }
  );

  if (tokenRes.status !== 200) {
    throw new Error(`Firebase 익명 로그인 실패 (${tokenRes.status}): ${JSON.stringify(tokenRes.body)}`);
  }

  const idToken = tokenRes.body.idToken;

  // Firestore 문서 구조 (REST API 형식)
  const firestoreDoc = {
    fields: {
      title:       { stringValue: report.title },
      category:    { stringValue: report.category },
      date:        { stringValue: report.date },
      link:        { stringValue: report.link || '#' },
      desc:        { stringValue: report.desc },
      fullContent: { stringValue: report.fullContent },
      status:      { stringValue: 'draft' },
      createdAt:   { stringValue: new Date().toISOString() }
    }
  };

  // Firestore에 문서 추가
  const firestoreRes = await new Promise((resolve, reject) => {
    const data = JSON.stringify(firestoreDoc);
    const options = {
      hostname: `firestore.googleapis.com`,
      path: `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/insights`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Authorization': `Bearer ${idToken}`
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  if (firestoreRes.status !== 200) {
    throw new Error(`Firestore 저장 실패 (${firestoreRes.status}): ${JSON.stringify(firestoreRes.body)}`);
  }

  const docName = firestoreRes.body.name;
  const docId = docName.split('/').pop();
  console.log(`✅ Firestore 저장 완료! 문서 ID: ${docId}`);
  return docId;
}

// ─────────────────────────────────────────
// 5. 메인 실행
// ─────────────────────────────────────────
(async () => {
  try {
    console.log('========================================');
    console.log('  SGCA Partners 인사이트 자동 생성 시작');
    console.log('========================================');

    const report = await generateInsightReport();
    const docId  = await saveToFirestore(report);

    console.log('');
    console.log('========================================');
    console.log('  🎉 완료! 관리자 모드에서 확인하세요.');
    console.log(`  제목: ${report.title}`);
    console.log(`  날짜: ${report.date}`);
    console.log(`  문서 ID: ${docId}`);
    console.log('========================================');
  } catch (err) {
    console.error('❌ 오류 발생:', err.message);
    process.exit(1);
  }
})();
