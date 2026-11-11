const test = require('node:test');
const assert = require('node:assert/strict');
const { discoverSources } = require('./source-discovery');
const { generateCategoryReport } = require('./generate-insight');
const { makeSnapshot, getInsightSourceLink, loadInsightSnapshot, loadInsightDocument, verifiedPublishedCopy } = require('../js/insight-data');
const { publishedDocuments } = require('./build-site');
const { allowedUrl, fetchSource, verifyEvidence, publicationDates } = require('./source-verification');
const { saveToFirestore, validateApiConfiguration } = require('./generate-insight');
const { reportValues, savePayload } = require('../js/admin-editor');
const { isAdministrator } = require('../js/admin-auth');
const page = '<html><head><title>NIST publishes OT guide</title><meta property="article:published_time" content="2026-10-09"></head><main>' + 'NIST publishes new guidance for securing operational technology systems. '.repeat(5) + '</main></html>';

test('generator rejects a public Firebase key used as the Gemini secret without exposing key values', () => {
  const env = { GEMINI_API_KEY: 'private-gemini-example', FIREBASE_API_KEY: 'firebase-example', FIREBASE_PROJECT_ID: 'project-example' };
  assert.doesNotThrow(() => validateApiConfiguration(env, 'public-browser-example'));
  for (const key of ['firebase-example', 'public-browser-example']) {
    assert.throws(() => validateApiConfiguration({ ...env, GEMINI_API_KEY: ' ' + key + ' ' }, 'public-browser-example'), error => {
      assert.match(error.message, /Gemini/);
      assert.equal(error.message.includes(key), false);
      return true;
    });
  }
  assert.throws(() => validateApiConfiguration({ ...env, GEMINI_API_KEY: '' }, 'public-browser-example'), /환경변수/);
});

test('administrator UI requires the verified company Google identity', () => {
  const administrator = { email: 'sim@sgca-partners.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] };
  assert.equal(isAdministrator(administrator), true);
  assert.equal(isAdministrator({ ...administrator, email: 'nicesam991003@gmail.com' }), false);
  assert.equal(isAdministrator({ ...administrator, emailVerified: false }), false);
  assert.equal(isAdministrator({ ...administrator, providerData: [{ providerId: 'password' }] }), false);
  assert.equal(isAdministrator(null), false);
});

test('public requests query only published reports; drafts require an authenticated administrator', async () => {
  const previous = { fetch: global.fetch, require: global.requireAdminAccess, headers: global.getInsightAuthHeaders };
  global.firebaseConfig = { projectId: 'demo-sgca', apiKey: 'example' };
  const calls = [];
  global.fetch = async (url, options) => { calls.push(options); return new Response(JSON.stringify([{ readTime: '2026-10-12T00:00:00Z' }])); };
  try {
    await loadInsightSnapshot();
    assert.equal(JSON.parse(calls[0].body).structuredQuery.where.fieldFilter.value.stringValue, 'published');
    assert.equal(calls[0].headers.Authorization, undefined);
    global.requireAdminAccess = async () => null;
    await assert.rejects(loadInsightSnapshot({ includeDrafts: true }), /sign in/);
    assert.equal(calls.length, 1);
    global.requireAdminAccess = async () => ({ email: 'sim@sgca-partners.com' });
    global.getInsightAuthHeaders = async () => ({ Authorization: 'Bearer simulated-token' });
    await loadInsightSnapshot({ includeDrafts: true });
    assert.equal(JSON.parse(calls[1].body).structuredQuery.where, undefined);
    assert.equal(calls[1].headers.Authorization, 'Bearer simulated-token');
  } finally { global.fetch = previous.fetch; global.requireAdminAccess = previous.require; global.getInsightAuthHeaders = previous.headers; }
});

test('server document decoding retains missing-date reports, sorts dates and preserves draft status', () => {
  const snapshot = makeSnapshot([
    { name: 'insights/old', fields: { createdAt: { timestampValue: '2026-09-01T00:00:00Z' }, sourceVerification: { mapValue: { fields: { status: { stringValue: 'verified' } } } } } },
    { name: 'insights/new', fields: { date: { stringValue: '2026-10-12' }, status: { stringValue: 'draft' } } }
  ]);
  assert.equal(snapshot.size, 2);
  assert.equal(snapshot.docs[0].id, 'new');
  assert.equal(snapshot.docs[0].data().status, 'draft');
  assert.equal(snapshot.docs[1].data().date, '2026-09-01');
  assert.equal(snapshot.docs[1].data().sourceVerification.status, 'verified');
});

test('individual report reads retry transient failures but never replace denied or deleted reports', async () => {
  const original=global.fetch;
  global.firebaseConfig={projectId:'demo-sgca'};
  let calls=0;
  global.fetch=async()=>{if(++calls===1)throw new TypeError('Failed to fetch');return new Response(JSON.stringify({name:'projects/demo-sgca/databases/(default)/documents/insights/existing',fields:{status:{stringValue:'draft'}},updateTime:'2026-10-12T00:00:00Z'}));};
  try {
    const report=await loadInsightDocument('existing');
    assert.equal(calls,2);assert.equal(report.status,'draft');assert.equal(report.id,'existing');
    for(const status of [403,404]) {
      calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status});};
      await assert.rejects(loadInsightDocument('existing'));assert.equal(calls,1);
    }
  }finally{global.fetch=original;}
});

function publicCopy(project = 'sgca-platform-7abbc') {
  return {projectId:project,generatedAt:new Date().toISOString(),documents:[{
    name:`projects/${project}/databases/(default)/documents/insights/verified`,
    fields:{status:{stringValue:'published'},title:{stringValue:'Verified report'},link:{stringValue:'https://nist.gov/news/verified'},
      sourceVerification:{mapValue:{fields:{status:{stringValue:'verified'},url:{stringValue:'https://nist.gov/news/verified'},translationAccurate:{booleanValue:true}}}}}
  }]};
}
test('Safari 15 can load the report list, detail and verified copy without AbortSignal.timeout', async (t) => {
  const timeout = Object.getOwnPropertyDescriptor(AbortSignal, 'timeout');
  const originalProject = global.firebaseConfig;
  delete AbortSignal.timeout;
  global.firebaseConfig = { projectId: 'sgca-platform-7abbc' };
  t.after(() => {
    if (timeout) Object.defineProperty(AbortSignal, 'timeout', timeout);
    global.firebaseConfig = originalProject;
  });
  const copy = publicCopy();
  const report = copy.documents[0];
  let firestoreUnavailable = false;
  t.mock.method(global, 'fetch', async (url, { signal }) => {
    assert.equal(signal.aborted, false);
    if (url === 'data/insights.json') return Response.json(copy);
    if (firestoreUnavailable) throw new TypeError('Failed to fetch');
    return Response.json(url.endsWith(':runQuery') ? [{ document: report }] : report);
  });

  assert.equal((await loadInsightSnapshot({ preferStatic: true })).docs[0].id, 'verified');
  assert.equal((await loadInsightDocument('verified')).id, 'verified');
  firestoreUnavailable = true;
  const fallback = await loadInsightSnapshot({ preferStatic: true });
  assert.equal(fallback.docs[0].id, 'verified');
  assert.equal(fallback.generatedAt, copy.generatedAt);
});

test('a blocked browser API request can use only a fresh verified published copy', async () => {
  const original=global.fetch;global.firebaseConfig={projectId:'sgca-platform-7abbc'};let calls=[];
  global.fetch=async url=>{calls.push(url);if(url.startsWith('https://firestore.googleapis.com/'))throw new TypeError('Failed to fetch');return new Response(JSON.stringify(publicCopy()));};
  try {
    const snapshot=await loadInsightSnapshot({preferStatic:true});
    assert.equal(snapshot.size,1);assert.equal(snapshot.docs[0].data().status,'published');assert.ok(snapshot.generatedAt);
    assert.equal(calls.at(-1),'data/insights.json');assert.equal(calls.some(url=>url.includes('key=')),false);
  } finally {global.fetch=original;}
});
test('the published copy rejects stale, future, cross-project, draft and unverified content', () => {
  global.firebaseConfig={projectId:'sgca-platform-7abbc'};const copy=publicCopy();
  assert.equal(verifiedPublishedCopy(copy).size,1);
  assert.throws(()=>verifiedPublishedCopy({...copy,generatedAt:'2000-01-01T00:00:00Z'}),/out of date/);
  assert.throws(()=>verifiedPublishedCopy({...copy,generatedAt:new Date(Date.now()+86400000).toISOString()}),/out of date/);
  assert.throws(()=>verifiedPublishedCopy(publicCopy('other-project')),/out of date/);
  copy.documents[0].fields.status.stringValue='draft';assert.throws(()=>verifiedPublishedCopy(copy),/Invalid/);
  copy.documents[0].fields.status.stringValue='published';copy.documents[0].fields.sourceVerification.mapValue.fields.translationAccurate.booleanValue=false;
  assert.throws(()=>verifiedPublishedCopy(copy),/Unverified/);
});
test('permission failures do not silently switch an administrator or public request to a copy', async () => {
  const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status:403});};
  try {await assert.rejects(loadInsightSnapshot({preferStatic:true}),/403/);assert.equal(calls,1);}finally{global.fetch=original;}
});
test('the website export includes only verified published reports and strips unrelated fields', () => {
  const doc=publicCopy().documents[0];doc.fields.internalNote={stringValue:'not for public export'};
  const exported=publishedDocuments([{document:doc}]);assert.equal(exported.length,1);assert.equal(exported[0].fields.internalNote,undefined);
  doc.fields.status.stringValue='draft';assert.throws(()=>publishedDocuments([{document:doc}]),/private/);
});
test('no unverified, credential-bearing, unsafe or grounding links reach source buttons', () => {
  for (const link of ['#', 'javascript:alert(1)', 'http://cisa.gov/news', 'https://u:p@cisa.gov/news', 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/x']) assert.equal(getInsightSourceLink({ link }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'review_required' } }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news' }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'verified', url: 'https://cisa.gov/wrong' } }), '');
  assert.equal(getInsightSourceLink({ link: 'https://cisa.gov/news', sourceVerification: { status: 'verified', url: 'https://cisa.gov/news' } }), 'https://cisa.gov/news');
});
test('server failure and malformed response never resolve to an empty list', async () => {
  const original = global.fetch;
  global.firebaseConfig = { projectId: 'test', apiKey: 'test' };
  try {
    let calls = 0;
    global.fetch = async () => { calls++; return new Response('error', { status: 503 }); };
    await assert.rejects(loadInsightSnapshot(), /503/);
    assert.equal(calls, 2);
    global.fetch = async () => new Response('{}', { status: 200 });
    await assert.rejects(loadInsightSnapshot(), /Invalid/);
    global.fetch = async () => new Response(JSON.stringify([{ readTime: '2026-10-12T00:00:00Z' }]));
    assert.equal((await loadInsightSnapshot()).size, 0);
  } finally { global.fetch = original; }
});
test('source validation rejects misleading domains and redirects to nonpublishers', async () => {
  assert.throws(() => allowedUrl('https://cisa.gov.attacker.example/x', ['cisa.gov']));
  assert.throws(() => allowedUrl('https://127.0.0.1/x', ['cisa.gov']));
  await assert.rejects(fetchSource('https://cisa.gov/x', ['cisa.gov'], async () => new Response('', { status: 302, headers: { location: 'https://127.0.0.1/x' } })), /approved domains/);
});
test('grounding redirects resolve to a fetched publisher URL; HTTP 200 soft 404 is rejected', async () => {
  let calls = 0;
  const source = await fetchSource('https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', ['nist.gov'], async () => ++calls === 1 ?
    new Response('', { status: 302, headers: { location: 'https://www.nist.gov/news/ot?utm_source=test' } }) :
    new Response(page, { headers: { 'content-type': 'text/html' } }));
  assert.equal(source.url, 'https://www.nist.gov/news/ot');
  assert.deepEqual(source.dates, ['2026-10-09']);
  await assert.rejects(fetchSource('https://nist.gov/x', ['nist.gov'], async () => new Response('<title>Page not found</title>' + page, { headers: { 'content-type': 'text/html' } })), /error or access/);
});
test('a valid URL alone is insufficient: exact title, quote and recent verified publication date are required', () => {
  const source = { url: 'https://nist.gov/news/ot', title: 'NIST publishes OT guide', text: 'NIST publishes new guidance for securing operational technology systems.', dates: ['2026-10-09'], sha256: 'test' };
  const report = { sourceTitle: source.title, sourceQuote: source.text, sourcePublishedDate: '2026-10-09' };
  assert.equal(verifyEvidence(report, source, '2026-10-12', 14).status, 'verified');
  assert.throws(() => verifyEvidence({ ...report, sourceQuote: 'Unrelated guidance about medical devices and healthcare systems.' }, source, '2026-10-12', 14), /quote/);
  assert.throws(() => verifyEvidence({ ...report, sourceTitle: 'Another report' }, source, '2026-10-12', 14), /title/);
  assert.throws(() => verifyEvidence({ ...report, sourcePublishedDate: '2026-10-11' }, source, '2026-10-12', 14), /date/);
  assert.throws(() => verifyEvidence(report, source, '2026-11-12', 14), /time window/);
  assert.deepEqual(publicationDates('<footer>Copyright 2026-10-12</footer>'), []);
});
test('storage rejects reports with no original, mismatched links or unchecked translations', async () => {
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/x' }), /Unverified/);
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/x', sourceVerification: { status: 'verified', url: 'https://nist.gov/x' } }), /Unverified/);
  await assert.rejects(saveToFirestore({ link: 'https://nist.gov/wrong', sourceVerification: { status: 'verified', translationAccurate: true, url: 'https://nist.gov/original' } }), /Unverified/);
  await assert.rejects(saveToFirestore({ sourceVerification: { status: 'verified', translationAccurate: true } }), /Unverified/);
});
test('storage creates the verified draft once and never overwrites it on retry', async t => {
  const { EventEmitter } = require('node:events');
  const { GoogleAuth } = require('google-auth-library');
  const https = require('node:https');
  const requests = [];
  const replies = [
    { status: 200, body: { writeResults: [{}] } },
    { status: 409, body: { error: { status: 'ALREADY_EXISTS' } } },
    { status: 403, body: { error: { status: 'PERMISSION_DENIED' } } }
  ];
  t.mock.method(GoogleAuth.prototype, 'getRequestHeaders', async () => ({ authorization: 'Bearer mock' }));
  t.mock.method(https, 'request', (options, receive) => {
    const request = new EventEmitter();
    request.setTimeout = () => {};
    request.write = data => requests.push({ options, body: JSON.parse(data) });
    request.end = () => {
      const { status, body } = replies.shift();
      const response = new EventEmitter();
      response.statusCode = status;
      receive(response);
      response.emit('data', Buffer.from(JSON.stringify(body)));
      response.emit('end');
    };
    return request;
  });

  const link = 'https://nist.gov/news/example';
  const report = { link, sourceVerification: { status: 'verified', translationAccurate: true, url: link } };
  const first = await saveToFirestore(report);
  assert.equal(first.created, true);
  assert.match(first.id, /^source-[0-9a-f]{64}$/);
  assert.deepEqual(await saveToFirestore(report), { id: first.id, created: false });
  await assert.rejects(saveToFirestore(report), /403.*PERMISSION_DENIED/);
  for (const { options, body } of requests) {
    assert.match(options.path, /\/documents:commit$/);
    assert.equal(options.headers.authorization, 'Bearer mock');
    assert.equal(body.writes.length, 1);
    assert.deepEqual(body.writes[0].currentDocument, { exists: false });
    assert.ok(body.writes[0].update.name.endsWith('/insights/' + first.id));
    assert.deepEqual(body.writes[0].update.fields.status, { stringValue: 'draft' });
  }
});
test('editor fills every Korean and English field for both published reports and generated drafts', () => {
  const report = { id: 'existing', title: '한글 제목', titleEn: 'English title', category: 'cyber-security', date: '2026-10-12', link: 'https://nist.gov/news', desc: '요약', descEn: 'Summary', fullContent: '<p>본문</p>', fullContentEn: '<p>Body</p>', status: 'draft' };
  const values = reportValues(report);
  assert.equal(Object.keys(values).length, 9);
  assert.equal(values.fullContentEn, '<p>Body</p>');
  assert.equal(values.titleEn, 'English title');
  assert.equal(reportValues({ ...report, status: 'published' }).fullContent, '<p>본문</p>');
});
test('saving a draft stays draft without explicit approval; changed content invalidates previous review', () => {
  const values = reportValues({ title: '한글 제목', link: 'https://nist.gov/news' });
  const prior = { ...values, id: 'existing', status: 'draft', sourceVerification: { status: 'verified', url: values.link } };
  assert.equal(savePayload(values, prior, values, false).status, 'draft');
  assert.equal(savePayload(values, prior, values, true).status, 'published');
  const published = { ...prior, status: 'published' };
  assert.equal(savePayload(values, published, values, false).status, 'published');
  assert.equal(savePayload({ ...values, title: '수정 제목' }, published, values, false).status, 'draft');
  assert.equal(savePayload(values, null, null, false).status, 'draft');
});

test('reviewed edits preserve source identity and dates only for the same original URL', () => {
  const values = reportValues({title:'한글 제목',link:'https://nist.gov/news'});
  const prior = {...values,status:'published',sourceVerification:{status:'verified',url:values.link,title:'Original title',publishedDate:'2026-10-09',contentSha256:'old-hash'}};
  const saved = savePayload({...values,titleEn:'English title'},prior,values,true);
  assert.equal(saved.sourceVerification.title,'Original title');
  assert.equal(saved.sourceVerification.publishedDate,'2026-10-09');
  assert.equal(saved.sourceVerification.contentSha256,undefined);
  const changed = savePayload({...values,link:'https://nist.gov/other'},prior,values,true);
  assert.equal(changed.sourceVerification.title,undefined);
  assert.equal(changed.sourceVerification.publishedDate,undefined);
  const supplied = savePayload(values,prior,values,true,{title:'Reviewed title',publishedDate:'2026-10-10'});
  assert.equal(supplied.sourceVerification.title,'Reviewed title');
  assert.equal(supplied.sourceVerification.publishedDate,'2026-10-10');
});

test('grounded references survive title differences while generated URLs are ignored', async () => {
  const uri = 'https://csrc.nist.gov/News/2026/verified';
  const requested = [];
  const result = await discoverSources({category:'cyber-security',today:'2026-11-09',
    search:async()=>({report:{sourceTitle:'Title wording from model',link:'https://example.org/fake'},
      grounding:{groundingChunks:[{web:{uri,title:'Different publisher title'}}],groundingSupports:[{groundingChunkIndices:[0]}]}}),
    fetchImpl:async u=>{requested.push(u);return new Response('<title>Publisher title | CSRC</title><meta property="article:published_time" content="2026-11-04"><main><small id="news-date">November 09, 2026</small>'+ 'Verified publisher article content. '.repeat(12)+'</main>',{headers:{'content-type':'text/html'}});}
  });
  assert.deepEqual(requested,[uri]);
  assert.equal(result.sources[0].url,uri);
  assert.equal(result.sources[0].title,'Publisher title | CSRC');
  assert.equal(result.sources[0].date,'2026-11-09');
});

test('search skip can recover a fresh official article and preserves its displayed publication date', async () => {
  const base='https://digital-strategy.ec.europa.eu';
  const uri=base+'/en/news/cyber-statement';
  const calls=[];
  const result=await discoverSources({category:'cyber-security',today:'2026-11-09',
    search:async()=>({report:{skip:true},grounding:{}}),log:{warn(){}},
    fetchImpl:async u=>{
      calls.push(u);
      const body=u===base+'/en/news'?'<a href="/en/news/cyber-statement">Read</a><a href="https://example.org/en/news/cyber-fake">Ignore</a>':
        u===uri?'<title>Official Statement</title><header><li class="ecl-page-header__meta-item">Publication 04 November 2026</li></header><meta property="article:published_time" content="2026-11-03T23:00:00Z"><main>'+ 'Official statement body. '.repeat(15)+'</main>':'';
      return new Response(body,{status:body?200:503,headers:{'content-type':'text/html'}});
    }
  });
  assert.equal(result.reason,'publisher index');
  assert.equal(result.sources[0].date,'2026-11-04');
  assert.deepEqual(result.sources[0].dates,['2026-11-04']);
  assert.ok(!calls.some(u=>u.includes('example.org')));
});

test('failed search and unavailable official indexes are reported as failure, not no news', async () => {
  await assert.rejects(discoverSources({category:'cyber-security',today:'2026-11-09',
    search:async()=>{throw Error('Gemini API Error (503)');},fetchImpl:async()=>new Response('',{status:503}),log:{warn(){}}}),/Discovery incomplete/);
});

test('ISO committee publication date comes from the article byline, including news.html detail links', async () => {
  const list = 'https://committee.iso.org/sites/tc176/home/news.html';
  const article = new URL('news/content-left-area/news-and-updates/news.html', list).href;
  const response = body => new Response(body, { headers: { 'content-type': 'text/html' } });
  const html = '<title>ISO committee update</title><header class="entry-header">' +
    "<time class='updated' datetime='2026-11-03' pubdate>3 November 2026</time></header>" +
    '<main>' + 'The standard was released 23 October 2026. '.repeat(7) + '</main>';
  const result = await discoverSources({
    category: 'management-system', today: '2026-11-10', log: {warn(){}},
    search: async () => { throw Error('Search temporarily unavailable'); },
    fetchImpl: async url => response(url === list ? `<a href="${article}">Article</a>` : html)
  });
  assert.deepEqual(result.sources.map(({url,date}) => ({url,date})), [{url:article,date:'2026-11-03'}]);
  assert.deepEqual(publicationDates('<header class="entry-header"><time datetime="2026-11-08">Event date</time></header>'), []);
  assert.deepEqual(publicationDates('<header class="entry-header"><time pubdate datetime="2026-02-30">Invalid</time></header>'), []);
});

test('product discovery follows the official announcement and reads its same-publisher PDF after search skips', async () => {
  const base = 'https://health.ec.europa.eu';
  const list = base + '/medical-devices-sector_en';
  const article = base + '/latest-updates/mdcg-fixture-2026-11-03_en';
  const attachment = base + '/document/download/aabbcc-1234_en?filename=mdcg_fixture_en.pdf';
  const sentence = 'Official evidence supports the stated scope of this diagnostic guidance.';
  const stream = 'BT /F1 10 Tf 10 100 Td (' + (sentence + ' ').repeat(4) + ') Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 2000 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((value, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${value}\nendobj\n`;
    return String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const xref = pdf.length;
  pdf += 'xref\n0 6\n0000000000 65535 f \n' + offsets.join('') +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const calls = [];
  const result = await discoverSources({
    category: 'product-certification', today: '2026-11-10', log: {},
    search: async () => ({report:{skip:true}}),
    fetchImpl: async (url, options) => {
      calls.push(url);
      if (url === attachment) {
        assert.equal(options.redirect, 'error');
        return new Response(pdf, {headers:{'content-type':'application/pdf'}});
      }
      const html = url === list ? `<a href="${article}">Notice</a>` :
        `<title>Official notice</title><meta property="article:published_time" content="2026-11-03"><main><a class="ecl-file__download" href="${attachment}">Download</a><a class="ecl-file__download" href="https://example.com/document/download/abc_en?filename=spoof.pdf">Ignore</a></main>`;
      return new Response(html, {headers:{'content-type':'text/html'}});
    }
  });
  assert.deepEqual(calls,[list,article,attachment]);
  const source = result.sources[0];
  assert.equal(source.date,'2026-11-03');
  assert.equal(source.url,article);
  assert.ok(source.text.includes(sentence));
  assert.equal(verifyEvidence({sourceTitle:source.title,sourceQuote:sentence,sourcePublishedDate:source.date},source,'2026-11-10',14).attachmentUrl,attachment);
});

test('product discovery skips dated old cards and verifies a fresh article after a temporary 429', async () => {
  const base = 'https://health.ec.europa.eu';
  const list = base + '/medical-devices-sector_en';
  const old = base + '/latest-updates/old-guidance_en';
  const fresh = base + '/latest-updates/fresh-guidance_en';
  const card = (url, date) => `<article class="ecl-card"><time datetime="${date}T12:00:00Z"></time><a href="${url}">Read</a></article>`;
  const calls = [];
  const result = await discoverSources({
    category: 'product-certification', today: '2026-11-11', onlyOfficial: true, log: {warn(){}},
    fetchImpl: async url => {
      calls.push(url);
      if (url === list) return new Response(card(old, '2026-09-09') + card(fresh, '2026-11-03'), {headers:{'content-type':'text/html'}});
      assert.equal(url, fresh);
      if (calls.length === 2) return new Response('', {status:429, headers:{'Retry-After':'1'}});
      return new Response('<title>Official notice</title><meta property="article:published_time" content="2026-11-04"><main>' +
        'Official content about the scope of the guidance. '.repeat(7) + '</main>', {headers:{'content-type':'text/html'}});
    }
  });
  assert.deepEqual(calls, [list, fresh, fresh]);
  assert.deepEqual(result.sources.map(({url,date}) => ({url,date})), [{url:fresh,date:'2026-11-04'}]);
});

test('product discovery reports incomplete verification when a fresh source asks for a long cooldown', async () => {
  let requests = 0;
  await assert.rejects(discoverSources({
    category:'product-certification', today:'2026-11-11', onlyOfficial:true, log:{warn(){}},
    fetchImpl:async () => ++requests === 1 ?
      new Response('<a href="/latest-updates/guidance_en">Notice</a>', {headers:{'content-type':'text/html'}}) :
      new Response('', {status:429, headers:{'Retry-After':'120'}})
  }), /Discovery incomplete/);
  assert.equal(requests, 2);
});

test('a rejected article falls back to a different verified original without bypassing translation review', async () => {
  const source={url:'https://csrc.nist.gov/News/2026/verified',title:'Verified title',date:'2026-11-04',dates:['2026-11-04'],text:'Verified publisher statement with a long exact quotation for checking.',sha256:'fixture'};
  const rejected={...source,url:'https://csrc.nist.gov/News/2026/unrelated'};
  const modes=[];
  let requests=0;
  const report=await generateCategoryReport('cyber-security','2026-11-09','',[],{
    discover:async opts=>{
      modes.push(!!opts.onlyOfficial);
      if (opts.onlyOfficial) assert.ok(opts.existingLinks.includes(rejected.url));
      return opts.onlyOfficial?{reason:'publisher index',sources:[source]}:{reason:'grounded',sources:[rejected]};
    },
    ask:async(_, payload, useSearch)=>{
      assert.equal(useSearch,false);
      requests++;
      if (requests===1) return {report:{skip:true}};
      if (requests===2) return {report:{title:'한글',titleEn:'English',desc:'요약',descEn:'Summary',fullContent:'<p>본문</p>',fullContentEn:'<p>Body</p>',sourceTitle:'Model paraphrase',sourcePublishedDate:'2026-11-01',sourceQuote:source.text,link:'https://example.org/fake'}};
      const reviewedReport = JSON.parse(payload).report;
      assert.equal(reviewedReport.link,source.url);
      assert.equal(reviewedReport.sourceTitle,source.title);
      assert.equal(reviewedReport.sourcePublishedDate,source.date);
      return {report:{supported:true,translationAccurate:true,issues:[]}};
    }
  });
  assert.deepEqual(modes,[false,true]);
  assert.equal(requests,3);
  assert.equal(report.link,source.url);
  assert.equal(report.date,source.date);
  assert.equal(report.sourceVerification.translationAccurate,true);
});
