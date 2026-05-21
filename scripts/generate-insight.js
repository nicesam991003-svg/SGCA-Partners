/**
 * generate-insight.js
 * 매주 월요일 GitHub Actions에서 실행됩니다.
 * 경영시스템인증 1건 + 사이버보안 1건 + 제품인증 1건, 총 3건의 draft를 Firestore에 저장합니다.
 */

const https = require('https');

// ─────────────────────────────────────────
// 1. 환경변수 확인
// ─────────────────────────────────────────
const ANTHROPIC_API_KEY   = process.env.ANTHROPIC_API_KEY;
const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!ANTHROPIC_API_KEY || !FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.error('❌ 필수 환경변수 누락: ANTHROPIC_API_KEY, FIREBASE_API_KEY, FIREBASE_PROJECT_ID');
  process.exit(1);
}

// ─────────────────────────────────────────
// 2. 유틸: HTTPS 요청 (POST / PATCH)
// ─────────────────────────────────────────
function httpsRequest(method, hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers }
      },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (e) { reject(new Error(`JSON 파싱 실패: ${raw.slice(0, 300)}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
const httpsPost  = (h, p, hd, b) => httpsRequest('POST',  h, p, hd, b);

// ─────────────────────────────────────────
// 3. KST 오늘 날짜
// ─────────────────────────────────────────
function getTodayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

// ─────────────────────────────────────────
// 4. Anthropic API 호출 공통 함수
// ─────────────────────────────────────────
async function callAnthropic(systemPrompt, userPrompt) {
  const res = await httpsPost(
    'api.anthropic.com',
    '/v1/messages',
    {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userPrompt }]
    }
  );

  if (res.status !== 200) {
    throw new Error(`Anthropic API 오류 (${res.status}): ${JSON.stringify(res.body)}`);
  }

  // 마지막 text 블록 추출 (web_search 결과 이후 최종 답변)
  const blocks = res.body.content || [];
  let jsonText = '';
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === 'text' && blocks[i].text) {
      jsonText = blocks[i].text.trim();
      break;
    }
  }
  if (!jsonText) throw new Error('Anthropic 응답에서 텍스트 블록을 찾을 수 없습니다.');

  // JSON 객체만 추출 (앞뒤 설명 텍스트·마크다운 코드블록 모두 제거)
  // fullContent의 HTML이 JSON을 깨뜨리는 경우를 방지하기 위해
  // fullContent 필드를 임시 플레이스홀더로 치환 후 파싱
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('── 원본 응답 (JSON 없음) ──\n', jsonText.slice(0, 500));
    throw new Error('응답에서 JSON 객체를 찾을 수 없습니다.');
  }
  let extracted = jsonMatch[0];

  // fullContent 값을 별도로 추출 (HTML이 JSON 파싱을 방해하므로)
  let fullContent = '';
  const fcMatch = extracted.match(/"fullContent"\s*:\s*"([\s\S]*?)"\s*(?:,\s*"\w+"|}\s*$)/);
  if (fcMatch) {
    fullContent = fcMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    // fullContent를 안전한 플레이스홀더로 치환
    extracted = extracted.replace(/"fullContent"\s*:\s*"[\s\S]*?"(\s*(?:,\s*"\w+"|}\s*$))/, `"fullContent":"__PLACEHOLDER__"$1`);
  }

  let parsed;
  try {
    parsed = JSON.parse(extracted);
  } catch (e) {
    // 파싱 실패 시 정규식으로 각 필드 개별 추출
    console.warn('JSON 직접 파싱 실패, 필드별 추출 시도...');
    parsed = {};
    const fields = ['title','category','date','link','desc'];
    fields.forEach(f => {
      const m = jsonText.match(new RegExp(`"${f}"\\s*:\\s*"([^"]*?)"`));
      if (m) parsed[f] = m[1];
    });
  }

  // fullContent 복원
  if (fullContent) {
    parsed.fullContent = fullContent;
  } else {
    // 플레이스홀더 없이 fullContent 별도 추출 시도
    const fcMatch2 = jsonText.match(/"fullContent"\s*:\s*"([\s\S]*?)(?="(?:title|category|date|link|desc|status|createdAt)"|\}\s*$)/);
    if (fcMatch2) {
      parsed.fullContent = fcMatch2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/",?\s*$/, '');
    }
  }

  return parsed;
}

// ─────────────────────────────────────────
// 5-A. 경영시스템인증 리포트 생성
// ─────────────────────────────────────────
async function generateManagementReport(today) {
  console.log('\n📋 [1/3] 경영시스템인증 최신 뉴스 검색 중...');

  const system = `당신은 SGCA Partners의 경영시스템인증 전문 리서치 어시스턴트입니다.
웹 검색으로 ISO 경영시스템인증(ISO 9001·14001·45001·13485·19443) 분야의 최신 뉴스 1건을 찾아
아래 JSON만 반환하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

검색 우선 출처:
- ISO 공식(iso.org), IAF(iaf.nu), KAB(kab.or.kr)
- ANAB(anab.org), IAS(iasonline.org), UKAS(ukas.com)
- BSI(bsigroup.com), DNV(dnv.com), SGS(sgs.com), TÜV SÜD(tuvsud.com)

반환 형식:
{
  "title": "리포트 제목 (한국어, 구체적)",
  "category": "management-system",
  "date": "${today}",
  "link": "실제 존재하는 원문 URL",
  "desc": "2~3줄 한국어 요약 (핵심 내용 중심)",
  "fullContent": "A4 1장 분량 HTML (아래 구조 참고)"
}

fullContent HTML 구조:
<h4>■ 개요</h4><p>뉴스 배경·발표 주체</p>
<h4>■ 주요 내용</h4><ul><li>핵심 변경/발표 항목</li></ul>
<h4>■ 일정 및 영향</h4><p>시행 일정·전환 기간·영향 범위</p>
<h4>■ 시사점 및 대응 권고</h4><p>국내 인증기업 대응 방향</p>
<p style="font-size:0.85em;color:#6c7a89;">※ 출처: [출처명] ([날짜])</p>`;

  const user = `오늘(${today}) 기준 최근 2주 이내 ISO 경영시스템인증 분야의 가장 중요한 뉴스 1건을 검색하여 리포트로 작성하세요.`;

  const report = await callAnthropic(system, user);
  const required = ['title','category','date','desc','fullContent'];
  required.forEach(f => { if (!report[f]) throw new Error(`경영시스템인증 리포트 필드 누락: ${f}`); });
  console.log(`  ✅ 생성 완료: "${report.title}"`);
  return report;
}

// ─────────────────────────────────────────
// 5-B. 사이버보안 리포트 생성
// ─────────────────────────────────────────
async function generateCyberSecurityReport(today) {
  console.log('\n🔒 [2/3] 사이버보안 최신 뉴스 검색 중...');

  const system = `당신은 SGCA Partners의 사이버보안 규제 전문 리서치 어시스턴트입니다.
웹 검색으로 아래 출처들에서 산업용 제품·의료기기·무선제품·공급망 사이버보안 분야의 최신 뉴스 1건을 찾아
아래 JSON만 반환하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

검색 우선 출처 (지역별):
[유럽]
- European Commission / Digital Excellence and Science Infrastructure (CRA - 사이버 복원력 법, 무선제품·기계·SW)
- ENISA - europa.eu/enisa (유럽 사이버보안 표준·가이드라인)
- MDCG - health.ec.europa.eu (의료기기 MDR 사이버보안)

[미국]
- FDA / Digital Health Center of Excellence - fda.gov (의료기기 사이버보안, ISO 13485)
- CISA - cisa.gov (산업기계·제조·무선·공급망 사이버보안)
- NIST - nist.gov (사이버보안 프레임워크·가이드라인)

[한국]
- 식품의약품안전처(MFDS) / 의료기기심사부 - mfds.go.kr (의료기기 사이버보안 허가·심사)
- 과학기술정보통신부 - msit.go.kr (IoT 보안인증·무선제품)
- KISA - kisa.or.kr (IoT 보안인증·산업용 제어시스템)

[중국]
- CAC(网信办) - cac.gov.cn (데이터 안보·중요 정보 인프라·커넥티드 제품)
- NMPA(国家药品监督管理局) - nmpa.gov.cn (의료기기 사이버보안)

[일본]
- PMDA - pmda.go.jp (의료기기 사이버보안)
- METI(경제산업성) - meti.go.jp (산업기계·공장자동화·IoT 보안)

반환 형식:
{
  "title": "리포트 제목 (한국어, 구체적·명확하게, 발표 기관명 포함)",
  "category": "cyber-security",
  "date": "${today}",
  "link": "실제 존재하는 원문 URL",
  "desc": "2~3줄 한국어 요약 (핵심 내용·영향 중심)",
  "fullContent": "A4 1장 분량 HTML (아래 구조 참고)"
}

fullContent HTML 구조:
<h4>■ 개요</h4><p>발표 기관·배경·규제 대상 범위</p>
<h4>■ 주요 내용</h4><ul><li>핵심 요구사항·변경사항 항목별 기술</li></ul>
<h4>■ 적용 대상 및 일정</h4><p>해당 제품군·기업·시행 일정·유예 기간</p>
<h4>■ 국내 기업 시사점 및 대응 권고</h4><p>한국 수출 기업·제조사 관점의 대응 방향</p>
<p style="font-size:0.85em;color:#6c7a89;">※ 출처: [기관명] ([날짜])</p>`;

  const user = `오늘(${today}) 기준 최근 2주 이내 위 출처들에서 발표된 사이버보안 규제·가이드라인·정책 중 SGCA Partners 고객(의료기기·산업기계·무선제품·공급망 분야 제조·수출 기업)에게 가장 중요한 뉴스 1건을 검색하여 리포트로 작성하세요. 반드시 실제 확인된 URL을 link에 포함하세요.`;

  const report = await callAnthropic(system, user);
  const required = ['title','category','date','desc','fullContent'];
  required.forEach(f => { if (!report[f]) throw new Error(`사이버보안 리포트 필드 누락: ${f}`); });
  console.log(`  ✅ 생성 완료: "${report.title}"`);
  return report;
}

// ─────────────────────────────────────────
// 5-C. 제품인증 리포트 생성
// ─────────────────────────────────────────
async function generateProductCertReport(today) {
  console.log('\n🏷️  [3/3] 제품인증 최신 뉴스 검색 중...');

  const system = `당신은 SGCA Partners의 제품인증 전문 리서치 어시스턴트입니다.
웹 검색으로 아래 출처들에서 기계류 CE/NRTL 인증·방폭(HazLoc/IECEx) 분야의 최신 뉴스 1건을 찾아
아래 JSON만 반환하세요. JSON 외 다른 텍스트는 절대 포함하지 마세요.

검색 우선 출처 (분야별):

[EU 기계류 규정 - Machinery Regulation EU 2023/1230]
- European Commission Machinery 부문 - ec.europa.eu/growth/sectors/mechanical-engineering
  (법안 원문·공식 가이드라인·전환 일정·Guide to Application 최신 개정판)
- CEN/CENELEC - cencenelec.eu
  (기계 안전 조화 표준 A/B/C타입 개정·신규 공표 모니터링)
핵심 이슈: 2027년 1월 전면 시행·AI 요구사항·사이버보안 의무화·디지털 매뉴얼 의무화

[미국 NRTL 기계·방폭 인증]
- OSHA NRTL 프로그램 - osha.gov/nationally-recognized-testing-laboratory
  (Federal Register 표준 추가·삭제·대체 발표, 공식 정책 뉴스)
- UL Solutions - ul.com/news (ANSI/UL 508A 등 북미 기계 안전 표준 개정)
- FM Approvals - fmapprovals.com (방폭 인증 업데이트)
- CSA Group - csagroup.org/news (NEC 개정·방폭 지역 분류 변화)

[국제 방폭 인증 - IECEx]
- IECEx 공식 - iecex.com/resources/news (IECEx Annual Meeting 의제·TCD 업데이트·IEC 60079 시리즈 개정)
- Hazardex - hazardexonthenet.net
  (전 세계 방폭·공정안전 전문 미디어, IEC TC 31 칼럼, 방폭 사고 분석, IECEx 가이드라인 해설)
핵심 이슈: 수소(Hydrogen) 생태계 확장에 따른 방폭 표준 변화·IEC 60079-19 유지보수 규격 업데이트

반환 형식:
{
  "title": "리포트 제목 (한국어, 구체적·명확하게, 발표 기관명 및 표준번호 포함)",
  "category": "product-certification",
  "date": "${today}",
  "link": "실제 존재하는 원문 URL",
  "desc": "2~3줄 한국어 요약 (핵심 변경 내용·영향 범위 중심)",
  "fullContent": "A4 1장 분량 HTML (아래 구조 참고)"
}

fullContent HTML 구조:
<h4>■ 개요</h4><p>발표 기관·규정·표준의 배경 및 발표 경위</p>
<h4>■ 주요 내용</h4><ul><li>핵심 요구사항·표준 변경·인증 절차 변경 항목별 기술</li></ul>
<h4>■ 적용 대상 및 시행 일정</h4><p>해당 제품군·인증 범위·시행일·전환 기간·유예 조항</p>
<h4>■ 국내 수출기업 시사점 및 대응 권고</h4><p>한국 제조·수출 기업의 인증 전략 및 준비 사항</p>
<p style="font-size:0.85em;color:#6c7a89;">※ 출처: [기관명] ([날짜])</p>`;

  const user = `오늘(${today}) 기준 최근 2주 이내 위 출처들에서 발표된 제품인증 관련 규정·표준·정책 중 SGCA Partners 고객(기계류 CE 인증·북미 NRTL 인증·방폭 IECEx 인증을 준비하는 한국 제조·수출 기업)에게 가장 중요한 뉴스 1건을 검색하여 리포트로 작성하세요. EU Machinery Regulation 2023/1230 시행 준비, OSHA NRTL 표준 변경, IECEx 방폭 관련 최신 소식을 우선 확인하세요. 반드시 실제 확인된 URL을 link에 포함하세요.`;

  const report = await callAnthropic(system, user);
  const required = ['title','category','date','desc','fullContent'];
  required.forEach(f => { if (!report[f]) throw new Error(`제품인증 리포트 필드 누락: ${f}`); });
  console.log(`  ✅ 생성 완료: "${report.title}"`);
  return report;
}

// ─────────────────────────────────────────
// 6. Firebase 익명 인증 토큰 획득
// ─────────────────────────────────────────
async function getFirebaseToken() {
  const res = await httpsPost(
    'identitytoolkit.googleapis.com',
    `/v1/accounts:signInAnonymously?key=${FIREBASE_API_KEY}`,
    {},
    { returnSecureToken: true }
  );
  if (res.status !== 200) {
    throw new Error(`Firebase 익명 로그인 실패 (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.idToken;
}

// ─────────────────────────────────────────
// 7. Firestore에 단일 리포트 저장
// ─────────────────────────────────────────
async function saveToFirestore(report, idToken) {
  const doc = {
    fields: {
      title:       { stringValue: report.title       || '' },
      category:    { stringValue: report.category    || '' },
      date:        { stringValue: report.date        || '' },
      link:        { stringValue: report.link        || '#' },
      desc:        { stringValue: report.desc        || '' },
      fullContent: { stringValue: report.fullContent || '' },
      status:      { stringValue: 'draft' },
      createdAt:   { stringValue: new Date().toISOString() }
    }
  };

  const res = await new Promise((resolve, reject) => {
    const data = JSON.stringify(doc);
    const req = https.request(
      {
        hostname: 'firestore.googleapis.com',
        path: `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/insights`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'Authorization': `Bearer ${idToken}`
        }
      },
      (r) => {
        let raw = '';
        r.on('data', c => raw += c);
        r.on('end', () => {
          try {
            resolve({ status: r.statusCode, body: JSON.parse(raw) });
          } catch (e) {
            console.error('Firestore 응답 파싱 실패 (원본):', raw.slice(0, 300));
            resolve({ status: r.statusCode, body: { error: raw.slice(0, 300) } });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

  if (res.status !== 200) {
    throw new Error(`Firestore 저장 실패 (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.name.split('/').pop();
}

// ─────────────────────────────────────────
// 8. 대기 유틸
// ─────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────
// 9. 메인 실행
// ─────────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   SGCA Partners 인사이트 자동 생성 시작  ║');
  console.log('╚══════════════════════════════════════════╝');

  const today = getTodayKST();
  console.log(`📅 기준 날짜 (KST): ${today}`);

  // 익명 인증 토큰 1회 획득 (3건 모두 재사용)
  let firebaseToken;
  try {
    console.log('\n🔑 Firebase 익명 인증 중...');
    firebaseToken = await getFirebaseToken();
    console.log('  ✅ 인증 성공');
  } catch (e) {
    console.error(`  ❌ Firebase 인증 실패: ${e.message}`);
    process.exit(1);
  }

  const results = [];
  const errors  = [];

  // ── 경영시스템인증 리포트 생성 ──
  try {
    const report = await generateManagementReport(today);
    const docId  = await saveToFirestore(report, firebaseToken);
    results.push({ label: '경영시스템인증', title: report.title, docId });
    console.log(`  💾 Firestore 저장 완료 (ID: ${docId})`);
  } catch (e) {
    console.error(`  ❌ 경영시스템인증 실패: ${e.message}`);
    errors.push('경영시스템인증');
  }

  // Rate limit 방지: 120초 대기
  console.log('\n⏳ Rate limit 방지를 위해 120초 대기 중...');
  await sleep(120000);

  // ── 사이버보안 리포트 생성 ──
  try {
    const report = await generateCyberSecurityReport(today);
    const docId  = await saveToFirestore(report, firebaseToken);
    results.push({ label: '사이버보안', title: report.title, docId });
    console.log(`  💾 Firestore 저장 완료 (ID: ${docId})`);
  } catch (e) {
    console.error(`  ❌ 사이버보안 실패: ${e.message}`);
    errors.push('사이버보안');
  }

  // Rate limit 방지: 120초 대기
  console.log('\n⏳ Rate limit 방지를 위해 120초 대기 중...');
  await sleep(120000);

  // ── 제품인증 리포트 생성 ──
  try {
    const report = await generateProductCertReport(today);
    const docId  = await saveToFirestore(report, firebaseToken);
    results.push({ label: '제품인증', title: report.title, docId });
    console.log(`  💾 Firestore 저장 완료 (ID: ${docId})`);
  } catch (e) {
    console.error(`  ❌ 제품인증 실패: ${e.message}`);
    errors.push('제품인증');
  }

  // ── 결과 요약 ──
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              실행 결과 요약               ║');
  console.log('╚══════════════════════════════════════════╝');
  results.forEach(r => {
    console.log(`✅ [${r.label}] ${r.title}`);
    console.log(`   문서 ID: ${r.docId}`);
  });
  if (errors.length > 0) {
    console.error(`❌ 실패 항목: ${errors.join(', ')}`);
    process.exit(1);
  }
  console.log('\n🎉 완료! 관리자 모드 > 등록 전 리포트에서 확인하세요.');
})();
