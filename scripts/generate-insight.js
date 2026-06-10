/**
 * generate-insight.js
 * 매주 월요일 GitHub Actions에서 실행됩니다.
 * 경영시스템인증 1건 + 사이버보안 1건 + 제품인증 1건, 총 3건의 draft를 Firestore에 저장합니다.
 */

const https = require('https');

// ─────────────────────────────────────────
// 1. 환경변수 확인
// ─────────────────────────────────────────
const GEMINI_API_KEY      = process.env.GEMINI_API_KEY;
const FIREBASE_API_KEY    = process.env.FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

if (!GEMINI_API_KEY || !FIREBASE_API_KEY || !FIREBASE_PROJECT_ID) {
  console.error('❌ 필수 환경변수 누락: GEMINI_API_KEY, FIREBASE_API_KEY, FIREBASE_PROJECT_ID');
  process.exit(1);
}

// ─────────────────────────────────────────
// 2. 유틸: HTTPS 요청 (POST / PATCH)
// ─────────────────────────────────────────
function httpsRequest(method, hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : '';
    const mergedHeaders = { 'Content-Type': 'application/json', ...headers };
    if (data) {
      mergedHeaders['Content-Length'] = Buffer.byteLength(data);
    }
    const req = https.request(
      { hostname, path, method, headers: mergedHeaders },
      (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (e) { reject(new Error(`JSON 파싱 실패: ${raw.slice(0, 300)}`)); }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}
const httpsPost = (h, p, hd, b) => httpsRequest('POST', h, p, hd, b);
const httpsGet = (h, p, hd) => httpsRequest('GET', h, p, hd);

// ─────────────────────────────────────────
// 2.1. 기존 Firestore 리포트 가져오기 (중복 수집 방지용)
// ─────────────────────────────────────────
async function getExistingReports() {
  const hostname = 'firestore.googleapis.com';
  const path = `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/insights?key=${FIREBASE_API_KEY}&pageSize=100`;
  try {
    const res = await httpsGet(hostname, path, {});
    if (res.status !== 200) {
      console.warn(`⚠️ 기존 리포트 목록 가져오기 실패 (Status: ${res.status}). 빈 배열로 계속 진행합니다.`);
      return [];
    }
    const docs = res.body.documents || [];
    return docs.map(doc => {
      const fields = doc.fields || {};
      return {
        title: fields.title?.stringValue || '',
        link: fields.link?.stringValue || ''
      };
    });
  } catch (e) {
    console.warn(`⚠️ 기존 리포트 목록 가져오기 실패 (${e.message}). 빈 배열로 계속 진행합니다.`);
    return [];
  }
}

// ─────────────────────────────────────────
// 3. KST 오늘 날짜
// ─────────────────────────────────────────
function getTodayKST() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().split('T')[0];
}

// ─────────────────────────────────────────
// 4. Gemini API 호출 함수
// ─────────────────────────────────────────
async function callGemini(systemPrompt, userPrompt) {
  const res = await httpsPost(
    'generativelanguage.googleapis.com',
    `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {},
    {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] }
      ],
      tools: [
        { googleSearch: {} }
      ]
    }
  );

  if (res.status !== 200) {
    throw new Error(`Gemini API Error (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const rawText = res.body.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    let cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error(`JSON 파싱 실패: ${e.message}\n원문: ${rawText}`);
  }
}

// ─────────────────────────────────────────
// 5. 카테고리별 프롬프트 및 설정
// ─────────────────────────────────────────
const CATEGORY_CONFIGS = {
  'management-system': {
    label: '경영시스템인증',
    emoji: '📋',
    step: '1/3',
    role: '경영시스템인증 전문 리서치 어시스턴트',
    additionalRoleInfo: '웹 검색 시 반드시 아래 지정된 7개 사이트에서만 경영시스템인증 최신 뉴스를 찾아주세요. 일반 언론사나 기타 사이트는 절대 참조하지 마세요.',
    sources: `- ISO (iso.org)
- IEC (iec.ch)
- Global Accreditation Cooperation Incorporated (Global ACI)
- KAB (kab.or.kr)
- ANAB (anab.ansi.org)
- IAS (iasonline.org)
- UKAS (ukas.com)`,
    titleInstructions: '리포트 제목 (한국어, 구체적)',
    descInstructions: '2~3줄 한국어 요약 (핵심 내용 중심)',
    layout: `<h4>■ 개요</h4><p>뉴스 배경·발표 주체</p>
<h4>■ 주요 내용</h4><ul><li>핵심 변경/발표 항목</li></ul>
<h4>■ 일정 및 영향</h4><p>시행 일정·전환 기간·영향 범위</p>
<h4>■ 시사점 및 대응 권고</h4><p>국내 인증기업 대응 방향</p>
<p style='font-size:0.85em;color:#6c7a89;'>※ 출처: [출처명] ([날짜])</p>`,
    userPromptTemplate: (today) => `오늘(${today}) 기준 최근 1주일 이내 위 지정된 7개 사이트(ISO, IEC, Global ACI, KAB, ANAB, IAS, UKAS)에 직접 게시된 경영시스템인증 분야의 가장 중요한 뉴스 1건만 검색하여 리포트로 작성하세요. 지정된 출처가 아닌 뉴스나 블로그 글은 절대 제외하세요. 만약 지정된 사이트들에서 최근 1주일 이내의 새로운 뉴스가 전혀 없다면, 무리해서 생성하지 말고 반드시 {"skip": true, "reason": "지정된 기관 사이트 내 최근 1주일 신규 뉴스가 없습니다."}를 반환하세요.`,
    sleepTime: 20000
  },
  'cyber-security': {
    label: '사이버보안',
    emoji: '🔒',
    step: '2/3',
    role: '사이버보안 규제 전문 리서치 어시스턴트',
    additionalRoleInfo: '웹 검색 시 반드시 아래 지정된 출처(유럽, 미국, 한국, 중국, 일본 기관)에서만 사이버보안 최신 뉴스를 찾아주세요. 일반 언론사나 블로그 등 다른 사이트는 절대 참조하지 마세요.',
    sources: `[유럽]
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
- METI(경제산업성) - meti.go.jp (산업기계·공장자동화·IoT 보안)`,
    titleInstructions: '리포트 제목 (한국어, 구체적·명확하게, 발표 기관명 포함)',
    descInstructions: '2~3줄 한국어 요약 (핵심 내용·영향 중심)',
    layout: `<h4>■ 개요</h4><p>발표 기관·배경·규제 대상 범위</p>
<h4>■ 주요 내용</h4><ul><li>핵심 요구사항·변경사항 항목별 기술</li></ul>
<h4>■ 적용 대상 및 일정</h4><p>해당 제품군·기업·시행 일정·유예 기간</p>
<h4>■ 국내 기업 시사점 및 대응 권고</h4><p>한국 수출 기업·제조사 관점의 대응 방향</p>
<p style='font-size:0.85em;color:#6c7a89;'>※ 출처: [기관명] ([날짜])</p>`,
    userPromptTemplate: (today) => `오늘(${today}) 기준 최근 2주 이내 위 지정된 기관 사이트에 직접 게시된 사이버보안 규제·가이드라인·정책 중 가장 중요한 뉴스 1건만 검색하여 리포트로 작성하세요. 지정된 출처가 아닌 뉴스나 블로그 글은 절대 제외하세요. 반드시 실제 확인된 기관 URL을 link에 포함하세요. 만약 지정된 사이트들에서 최근 2주 이내의 새로운 뉴스가 전혀 없다면, 무리해서 생성하지 말고 반드시 {"skip": true, "reason": "지정된 기관 사이트 내 최근 2주 사이버보안 신규 소식이 없습니다."}를 반환하세요.`,
    sleepTime: 20000
  },
  'product-certification': {
    label: '제품인증',
    emoji: '🏷️',
    step: '3/3',
    role: '제품인증 전문 리서치 어시스턴트',
    additionalRoleInfo: '웹 검색 시 반드시 아래 지정된 출처(EU 기관, OSHA, NRTL, IECEx 등)에서만 제품인증 최신 뉴스를 찾아주세요. 일반 언론사나 기타 사이트는 절대 참조하지 마세요.',
    sources: `[EU 기계류 규정 - Machinery Regulation EU 2023/1230]
- European Commission Machinery 부문 - ec.europa.eu/growth/sectors/mechanical-engineering
  (법안 원문·공식 가이드라인·전환 일정·Guide to Application 최신 개정판)
- CEN/CENELEC - cencenelec.eu
  (기계 안전 조화 표준 A/B/C타입 개정·신규 공표 모니터링)
핵심 이슈: 2027년 1월 전면 시행·AI 요구사항·사이버보안 의무화·디지털 매뉴얼 의무화

[EU 의료기기 규정]
- health.ec.europa.eu/medical-devices-sector_en

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
핵심 이슈: 수소(Hydrogen) 생태계 확장에 따른 방폭 표준 변화·IEC 60079-19 유지보수 규격 업데이트`,
    titleInstructions: '리포트 제목 (한국어, 구체적·명확하게, 발표 기관명 및 표준번호 포함)',
    descInstructions: '2~3줄 한국어 요약 (핵심 변경 내용·영향 범위 중심)',
    layout: `<h4>■ 개요</h4><p>발표 기관·규정·표준의 배경 및 발표 경위</p>
<h4>■ 주요 내용</h4><ul><li>핵심 요구사항·표준 변경·인증 절차 변경 항목별 기술</li></ul>
<h4>■ 적용 대상 및 일정</h4><p>해당 제품군·인증 범위·시행일·전환 기간·유예 조항</p>
<h4>■ 국내 수출기업 시사점 및 대응 권고</h4><p>한국 제조·수출 기업의 인증 전략 및 준비 사항</p>
<p style='font-size:0.85em;color:#6c7a89;'>※ 출처: [기관명] ([날짜])</p>`,
    userPromptTemplate: (today) => `오늘(${today}) 기준 최근 2주 이내 위 지정된 기관 사이트에 직접 게시된 제품인증 관련 규정·표준·정책 중 가장 중요한 뉴스 1건만 검색하여 리포트로 작성하세요. EU Machinery Regulation, OSHA NRTL 표준 변경, IECEx 최신 소식을 우선 확인하며, 지정된 출처가 아닌 뉴스나 블로그 글은 절대 제외하세요. 반드시 실제 확인된 기관 URL을 link에 포함하세요. 만약 지정된 사이트들에서 최근 2주 이내의 새로운 뉴스가 전혀 없다면, 무리해서 생성하지 말고 반드시 {"skip": true, "reason": "지정된 기관 사이트 내 최근 2주 제품인증 신규 뉴스가 없습니다."}를 반환하세요.`,
    sleepTime: 0
  }
};

// ─────────────────────────────────────────
// 6. 카테고리 리포트 생성 통합 함수
// ─────────────────────────────────────────
async function generateCategoryReport(categoryKey, today, existingContext = '') {
  const config = CATEGORY_CONFIGS[categoryKey];
  if (!config) {
    throw new Error(`지원하지 않는 카테고리입니다: ${categoryKey}`);
  }

  console.log(`\n${config.emoji} [${config.step}] ${config.label} 최신 뉴스 검색 중...`);

  const systemPrompt = `당신은 SGCA Partners의 ${config.role}입니다.
${config.additionalRoleInfo}

검색 우선 출처:
${config.sources}

반환 형식:
{
  "title": "${config.titleInstructions}",
  "titleEn": "English translation of the title",
  "category": "${categoryKey}",
  "date": "${today}",
  "link": "실제 존재하는 원문 URL",
  "desc": "${config.descInstructions}",
  "descEn": "English translation of the desc",
  "fullContent": "A4 1장 분량 HTML (아래 구조 참고)",
  "fullContentEn": "English translation of the fullContent HTML"
}

중요 지침 (CRITICAL):
1. 반환 형식은 반드시 파싱 가능한 유효한 JSON 객체 하나여야만 합니다.
2. JSON 형식을 제외한 어떠한 인사말, 설명, 부가 텍스트, Markdown 블록(\`\`\`json 등)도 절대로 포함하지 마세요. 오직 { 로 시작해서 } 로 끝나야 합니다.
3. fullContent 내의 HTML 태그나 속성(예: style 등)에는 절대 큰따옴표(")를 사용하지 말고, 항상 작은따옴표(')를 사용하세요. (예: <p style='font-size:0.85em;color:#6c7a89;'>)
4. 만약 title, desc, fullContent 등의 문자열 내용 안에 어쩔 수 없이 큰따옴표(")를 사용해야 하는 경우, 반드시 백슬래시로 이스케이프하여 \\" 형태로 출력하세요.

fullContent HTML 구조:
${config.layout}`;

  const userPrompt = config.userPromptTemplate(today) + existingContext + "\n\n[CRITICAL WARNING] You MUST return ONLY a valid JSON object starting with { and ending with }. Do not add any conversational text or explanations.";

  const report = await callGemini(systemPrompt, userPrompt);
  
  if (report.skip === true) {
    console.log(`  ⏭️ 스킵됨: ${report.reason || '신규 뉴스 없음'}`);
    return report;
  }

  // 필수 필드 검증 (영문 필드는 누락되거나 빈 문자열이어도 통과하도록 선택 필드로 변경)
  const required = ['title', 'category', 'date', 'desc', 'fullContent'];
  required.forEach(f => {
    if (!report[f]) {
      throw new Error(`${config.label} 리포트 필수 필드 누락: ${f}`);
    }
  });

  console.log(`  ✅ 생성 완료: "${report.title}"`);
  return report;
}

// ─────────────────────────────────────────
// 7. Firestore에 단일 리포트 저장
// ─────────────────────────────────────────
async function saveToFirestore(report) {
  const doc = {
    fields: {
      title:       { stringValue: report.title       || '' },
      titleEn:     { stringValue: report.titleEn     || '' },
      category:    { stringValue: report.category    || '' },
      date:        { stringValue: report.date        || '' },
      link:        { stringValue: report.link        || '#' },
      desc:        { stringValue: report.desc        || '' },
      descEn:      { stringValue: report.descEn      || '' },
      fullContent: { stringValue: report.fullContent || '' },
      fullContentEn: { stringValue: report.fullContentEn || '' },
      status:      { stringValue: 'draft' },
      createdAt:   { stringValue: new Date().toISOString() }
    }
  };

  const hostname = 'firestore.googleapis.com';
  const path = `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/insights?key=${FIREBASE_API_KEY}`;
  
  const res = await httpsPost(hostname, path, {}, doc);

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

  console.log('🔍 중복 방지를 위해 기존 리포트 목록을 가져옵니다...');
  const existingReports = await getExistingReports();
  let existingContext = '';
  if (existingReports.length > 0) {
    existingContext = '\n\n[주의: 아래 목록은 이미 이전에 작성된 리포트입니다. 반드시 아래 목록과 중복되지 않는 새로운 뉴스를 선정하세요.]\n';
    existingReports.forEach((r, idx) => {
      if(r.title) existingContext += `${idx + 1}. ${r.title}\n`;
    });
  }

  const results = [];
  const errors  = [];
  const categories = Object.keys(CATEGORY_CONFIGS);

  for (let i = 0; i < categories.length; i++) {
    const categoryKey = categories[i];
    const config = CATEGORY_CONFIGS[categoryKey];

    try {
      const report = await generateCategoryReport(categoryKey, today, existingContext);
      if (report.skip === true) {
        results.push({ label: config.label, title: '건너뜀 (신규 뉴스 없음)', docId: 'N/A' });
      } else {
        const docId  = await saveToFirestore(report);
        results.push({ label: config.label, title: report.title, docId });
        console.log(`  💾 Firestore 저장 완료 (ID: ${docId})`);
      }
    } catch (e) {
      console.error(`  ❌ ${config.label} 실패: ${e.message}`);
      errors.push(config.label);
    }

    // 다음 카테고리가 있고 sleepTime이 지정되어 있는 경우 대기
    if (i < categories.length - 1 && config.sleepTime > 0) {
      console.log(`\n⏳ Rate limit 방지를 위해 ${config.sleepTime / 1000}초 대기 중...`);
      await sleep(config.sleepTime);
    }
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
